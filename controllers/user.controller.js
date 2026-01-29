import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";
import bcryptjs from "bcryptjs";
import path from "path";
import fs from "fs";
import { deleteFromCloudinary } from "../config/cloudinary.js";

// Backend profile strength calculation
const calculateProfileStrength = async (user) => {
  const profile = await Profile.findOne({ userId: user._id });
  const tasks = await Task.find({ userId: user._id });
  
  let strength = 0;
  let total = 10;
  
  // Check onboarding completion (10%)
  if (user.onboardingCompleted) strength += 1;
  
  // Check academic information (10% each)
  if (profile?.academic?.major) strength += 1;
  if (profile?.academic?.gpa) strength += 1;
  
  // Check study goals (10% each)
  if (profile?.studyGoal?.degree) strength += 1;
  if (profile?.studyGoal?.field) strength += 1;
  
  // Check budget (10%)
  if (profile?.budget?.range) strength += 1;
  
  // Check exams (5% each)
  if (profile?.exams?.ielts?.score) strength += 1;
  if (profile?.exams?.gre?.score) strength += 1;
  
  // Check documents uploaded (10%)
  if (user.avatar || profile?.avatar) strength += 1;
  
  // Check completed tasks (10%)
  const completedTasks = tasks.filter(task => task.status === "COMPLETED").length;
  if (completedTasks >= 3) strength += 1;
  
  return Math.round((strength / total) * 100);
};

export const completeOnboarding = async (req, res) => {
  try {
    console.log('=== ONBOARDING COMPLETION ===');
    console.log('Request body keys:', Object.keys(req.body));
    
    // Structure the onboarding data to match the database schema
    const onboardingData = {
      // Academic Background
      academic: {
        level: req.body.degree || "",
        major: req.body.subject || "",
        university: req.body.university || "",
        graduationYear: req.body.graduationYear || null,
        gpa: req.body.gpa || ""
      },
      // Study Goal
      studyGoal: {
        degree: req.body.intendedDegree || "",
        field: req.body.fieldOfStudy || "",
        intakeYear: req.body.intakeYear || null,
        countries: Array.isArray(req.body.preferredCountries) ? req.body.preferredCountries : []
      },
      // Budget
      budget: {
        range: req.body.budgetRange || "",
        funding: req.body.fundingPlan || ""
      },
      // Standardized Tests
      ieltsTaken: req.body.ieltsTaken || false,
      ieltsScore: req.body.ieltsScore ? {
        overall: req.body.ieltsScore.overall || req.body.ieltsScore || "",
        listening: req.body.ieltsScore.listening || "",
        reading: req.body.ieltsScore.reading || "",
        writing: req.body.ieltsScore.writing || "",
        speaking: req.body.ieltsScore.speaking || ""
      } : {},
      toeflTaken: req.body.toeflTaken || false,
      toeflScore: req.body.toeflScore ? {
        total: req.body.toeflScore.total || req.body.toeflScore || "",
        reading: req.body.toeflScore.reading || "",
        listening: req.body.toeflScore.listening || "",
        speaking: req.body.toeflScore.speaking || "",
        writing: req.body.toeflScore.writing || ""
      } : {},
      greTaken: req.body.greTaken || false,
      greScore: req.body.greScore ? {
        total: req.body.greScore.total || req.body.greScore || "",
        verbal: req.body.greScore.verbal || "",
        quantitative: req.body.greScore.quantitative || ""
      } : {},
      gmatTaken: req.body.gmatTaken || false,
      gmatScore: req.body.gmatScore ? {
        total: req.body.gmatScore.total || req.body.gmatScore || "",
        verbal: req.body.gmatScore.verbal || "",
        quantitative: req.body.gmatScore.quantitative || ""
      } : {},
      // Additional Academic Info
      workExperience: req.body.workExperience || "",
      researchExperience: req.body.researchExperience || "",
      publications: req.body.publications || "",
      certifications: req.body.certifications || "",
      // Application Readiness
      sopStatus: req.body.sopStatus || "",
      lorStatus: req.body.lorStatus || "",
      resumeStatus: req.body.resumeStatus || "",
      userId: req.user._id
    };
    
    console.log('Structured onboarding data:', JSON.stringify(onboardingData, null, 2));
    
    // Update profile with structured onboarding data
    const result = await Profile.findOneAndUpdate(
      { userId: req.user._id },
      onboardingData,
      { upsert: true, new: true }
    );
    
    console.log('Saved profile keys:', Object.keys(result.toObject()));

    // Update user to mark onboarding as completed and set stage
    await User.findByIdAndUpdate(
      req.user._id,
      { 
        onboardingCompleted: true,
        stage: "BUILDING_PROFILE"
      }
    );

    res.json({ message: "Onboarding completed successfully", user: req.user });
  } catch (error) {
    console.error("Onboarding error:", error);
    res.status(500).json({ message: "Failed to complete onboarding" });
  }
};

export const removeAvatar = async (req, res) => {
  try {
    console.log('=== REMOVE AVATAR START ===');
    console.log('User ID:', req.user._id);
    
    const user = await User.findById(req.user._id);
    const profile = await Profile.findOne({ userId: req.user._id });
    
    console.log('Current user avatar:', user?.avatar);
    console.log('Current profile avatar:', profile?.avatar);
    
    // Remove avatar from user
    if (user.avatar) {
      user.avatar = undefined;
      await user.save();
      console.log('Avatar removed from user');
    }
    
    // Remove avatar from profile
    if (profile && profile.avatar) {
      profile.avatar = undefined;
      await profile.save();
      console.log('Avatar removed from profile');
    }
    
    console.log('Avatar removal completed successfully');
    
    res.json({ 
      success: true, 
      message: "Avatar removed successfully" 
    });
  } catch (error) {
    console.error('Remove avatar error:', error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to remove avatar" 
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    console.log("=== GET USER START ===");
    console.log("User ID:", req.user._id);
    
    const user = await User.findById(req.user._id);
    
    const profile = await Profile.findOne({ userId: req.user._id })
      .populate("shortlistedUniversities.universityId")
      .populate("lockedUniversity.universityId");
    
    // Calculate profile strength
    const profileStrength = await calculateProfileStrength(user);
    
    res.json({
      ...user.toObject(),
      profile: profile || null,
      shortlistedUniversities: profile?.shortlistedUniversities || [],
      lockedUniversity: profile?.lockedUniversity || null,
      aiCounsellingCompleted: user.aiCounsellingCompleted || false,
      profileStrength: profileStrength
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Failed to fetch user data" });
  }
};

export const uploadAvatar = async (req, res) => {
  console.log("=== uploadAvatar FUNCTION CALLED ===");
  console.log("Request received for avatar upload");
  console.log("Request headers:", req.headers);
  console.log("Request body keys:", Object.keys(req.body));
  console.log("File:", req.file);
  console.log("Files:", req.files);
  console.log("User:", req.user._id);
  
  // Debug multer file object
  if (req.file) {
    console.log("File details:");
    console.log("- Original name:", req.file.originalname);
    console.log("- Mimetype:", req.file.mimetype);
    console.log("- Size:", req.file.size);
    console.log("- Path:", req.file.path);
    console.log("- Secure URL:", req.file.secure_url);
    console.log("- Public ID:", req.file.public_id);
  } else {
    console.log("No file found in req.file");
    console.log("Checking if file is in req.body:", req.body.avatar ? 'Yes' : 'No');
  }
  
  try {
    if (!req.file) {
      console.log("No file uploaded");
      return res.status(400).json({ message: "No file uploaded" });
    }

    console.log("File uploaded to Cloudinary:", req.file.path);
    console.log("Cloudinary URL (secure_url):", req.file.secure_url);
    console.log("Cloudinary URL (path):", req.file.path);

    // CloudinaryStorage automatically uploads and provides the URL
    // Note: Sometimes the URL is in req.file.path instead of req.file.secure_url
    const avatarUrl = req.file.secure_url || req.file.path;
    
    if (!avatarUrl) {
      console.log("Avatar URL is undefined - Cloudinary upload failed");
      return res.status(500).json({ message: "Cloudinary upload failed" });
    }
    
    // Update user with avatar URL
    await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl });
    console.log("User updated with avatar:", avatarUrl);
    console.log("Avatar URL saved:", avatarUrl); // added this line
    
    console.log("=== AVATAR UPLOAD SUCCESS ===");
    res.json({
      message: "Avatar uploaded successfully",
      avatar: avatarUrl
    });
  } catch (error) {
    console.error("=== AVATAR UPLOAD ERROR ===");
    console.error("Avatar upload error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ message: "Failed to upload avatar" });
  }
};

export const updateUser = async (req, res) => {
  try {
    console.log('=== BACKEND UPDATE DEBUG ===');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request body:', req.body);
    
    const { 
      name, 
      password, 
      bio,
      // Academic Background (matching onboarding structure)
      degree,
      subject,
      university,
      graduationYear,
      gpa,
      // Study Goal (matching onboarding structure)
      intendedDegree,
      fieldOfStudy,
      intakeYear,
      preferredCountries,
      // Budget (matching onboarding structure)
      budgetRange,
      fundingPlan,
      // Standardized Tests (matching onboarding structure)
      ieltsTaken,
      ieltsScore,
      toeflTaken,
      toeflScore,
      greTaken,
      greScore,
      gmatTaken,
      gmatScore,
      // Additional Academic Info (matching onboarding structure)
      workExperience,
      researchExperience,
      publications,
      certifications,
      // Application Readiness (matching onboarding structure)
      sopStatus,
      lorStatus,
      resumeStatus
    } = req.body;
    
    console.log('=== EXTRACTED FIELDS ===');
    console.log('degree:', degree);
    console.log('subject:', subject);
    console.log('budgetRange:', budgetRange);
    console.log('intendedDegree:', intendedDegree);
    console.log('fieldOfStudy:', fieldOfStudy);
    console.log('preferredCountries:', preferredCountries);
    
    // Find user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user fields
    if (name && name.trim()) {
      user.name = name.trim();
    }

    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      user.password = await bcryptjs.hash(password, 10);
    }

    // Find or create profile
    let profile = await Profile.findOne({ userId: req.user._id });
    if (!profile) {
      profile = new Profile({ userId: req.user._id });
    }

    // Parse countries from comma-separated strings
    const parseCountries = (countriesString) => {
      if (!countriesString || typeof countriesString !== 'string') return [];
      return countriesString.split(',').map(country => country.trim()).filter(country => country.length > 0);
    };

    // Create profile data with nested structure to match database
    const profileData = {
      // Academic Background - CONVERT FLAT TO NESTED
      academic: {
        level: degree || profile.academic?.level || "",
        major: subject || profile.academic?.major || "",
        university: university || profile.academic?.university || "",
        graduationYear: graduationYear || profile.academic?.graduationYear || null,
        gpa: gpa || profile.academic?.gpa || ""
      },
      // Study Goal - CONVERT FLAT TO NESTED
      studyGoal: {
        degree: intendedDegree || profile.studyGoal?.degree || "",
        field: fieldOfStudy || profile.studyGoal?.field || "",
        intakeYear: intakeYear || profile.studyGoal?.intakeYear || null,
        countries: Array.isArray(preferredCountries) ? preferredCountries : (profile.studyGoal?.countries || [])
      },
      // Budget - CONVERT FLAT TO NESTED
      budget: {
        range: budgetRange || profile.budget?.range || "",
        funding: fundingPlan || profile.budget?.funding || ""
      },
      // Standardized Tests - DIRECT STRUCTURE
      ieltsTaken: ieltsTaken !== undefined ? ieltsTaken : (profile.ieltsTaken || false),
      ieltsScore: ieltsScore ? {
        overall: ieltsScore || profile.ieltsScore?.overall || "",
        listening: profile.ieltsScore?.listening || "",
        reading: profile.ieltsScore?.reading || "",
        writing: profile.ieltsScore?.writing || "",
        speaking: profile.ieltsScore?.speaking || ""
      } : profile.ieltsScore || {},
      toeflTaken: toeflTaken !== undefined ? toeflTaken : (profile.toeflTaken || false),
      toeflScore: toeflScore ? {
        total: toeflScore || profile.toeflScore?.total || "",
        reading: profile.toeflScore?.reading || "",
        listening: profile.toeflScore?.listening || "",
        speaking: profile.toeflScore?.speaking || "",
        writing: profile.toeflScore?.writing || ""
      } : profile.toeflScore || {},
      greTaken: greTaken !== undefined ? greTaken : (profile.greTaken || false),
      greScore: greScore ? {
        total: greScore || profile.greScore?.total || "",
        verbal: profile.greScore?.verbal || "",
        quantitative: profile.greScore?.quantitative || ""
      } : profile.greScore || {},
      gmatTaken: gmatTaken !== undefined ? gmatTaken : (profile.gmatTaken || false),
      gmatScore: gmatScore ? {
        total: gmatScore || profile.gmatScore?.total || "",
        verbal: profile.gmatScore?.verbal || "",
        quantitative: profile.gmatScore?.quantitative || ""
      } : profile.gmatScore || {},
      // Additional Academic Info - DIRECT STRUCTURE
      workExperience: workExperience || profile.workExperience || "",
      researchExperience: researchExperience || profile.researchExperience || "",
      publications: publications || profile.publications || "",
      certifications: certifications || profile.certifications || "",
      // Application Readiness - DIRECT STRUCTURE
      sopStatus: sopStatus || profile.sopStatus || "",
      lorStatus: lorStatus || profile.lorStatus || "",
      resumeStatus: resumeStatus || profile.resumeStatus || "",
      // Preserve existing related data
      internships: profile.internships || [],
      projects: profile.projects || [],
      shortlistedUniversities: profile.shortlistedUniversities || [],
      lockedUniversity: profile.lockedUniversity || null,
      profileStrength: profile.profileStrength || {},
      completionPercentage: profile.completionPercentage || 0,
      bio: bio || profile.bio || ""
    };

    // Update profile with clean data
    Object.assign(profile, profileData);

    console.log('=== BEFORE SAVE ===');
    console.log('Profile academic:', profile.academic);
    console.log('Profile studyGoal:', profile.studyGoal);
    console.log('Profile budget:', profile.budget);

    // Save both user and profile
    await user.save();
    await profile.save();

    console.log('=== AFTER SAVE ===');
    console.log('Saved profile academic:', profile.academic);
    console.log('Saved profile studyGoal:', profile.studyGoal);
    console.log('Saved profile budget:', profile.budget);

    // Return user without password
    const userObject = user.toObject();
    delete userObject.password;

    res.json({
      message: "Profile updated successfully",
      user: {
        ...userObject,
        profile: profile.toObject()
      }
    });
  } catch (error) {
    console.error("Update user error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      message: "Failed to update profile",
      error: error.message 
    });
  }
};

// Debug endpoint to check raw profile data
export const debugProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.json({ 
        message: "No profile found",
        userId: req.user._id,
        profileKeys: [],
        profileData: null
      });
    }
    
    const profileObj = profile.toObject();
    
    return res.json({ 
      message: "Profile found",
      userId: req.user._id,
      profileKeys: Object.keys(profileObj),
      profileData: {
        degree: profileObj.degree,
        subject: profileObj.subject,
        university: profileObj.university,
        graduationYear: profileObj.graduationYear,
        gpa: profileObj.gpa,
        intendedDegree: profileObj.intendedDegree,
        fieldOfStudy: profileObj.fieldOfStudy,
        intakeYear: profileObj.intakeYear,
        preferredCountries: profileObj.preferredCountries,
        budgetRange: profileObj.budgetRange,
        fundingPlan: profileObj.fundingPlan,
        ieltsTaken: profileObj.ieltsTaken,
        ieltsScore: profileObj.ieltsScore,
        workExperience: profileObj.workExperience,
        sopStatus: profileObj.sopStatus
      }
    });
  } catch (error) {
    console.error("Debug profile error:", error);
    res.status(500).json({ message: "Failed to debug profile" });
  }
};
