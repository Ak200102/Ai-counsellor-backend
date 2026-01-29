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
    console.log('Request body:', req.body);
    console.log('User ID:', req.user._id);
    
    // Update profile with onboarding data
    await Profile.findOneAndUpdate(
      { userId: req.user._id },
      { ...req.body, userId: req.user._id },
      { upsert: true, new: true }
    );

    // Update user to mark onboarding as completed and set stage
    await User.findByIdAndUpdate(
      req.user._id,
      { 
        onboardingCompleted: true,
        stage: "BUILDING_PROFILE"
      }
    );

    console.log('Onboarding completed successfully for user:', req.user._id);
    res.json({ message: "Onboarding completed", user: req.user });
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

    // Create clean profile data object matching onboarding structure
    const profileData = {
      userId: req.user._id,
      bio: bio || profile.bio || "",
      // Academic Background (matching onboarding structure)
      degree: degree || profile.degree || "",
      subject: subject || profile.subject || "",
      university: university || profile.university || "",
      graduationYear: graduationYear || profile.graduationYear || "",
      gpa: gpa || profile.gpa || "",
      // Study Goal (matching onboarding structure)
      intendedDegree: intendedDegree || profile.intendedDegree || "",
      fieldOfStudy: fieldOfStudy || profile.fieldOfStudy || "",
      intakeYear: intakeYear || profile.intakeYear || "",
      preferredCountries: Array.isArray(preferredCountries) ? preferredCountries : (profile.preferredCountries || []),
      // Budget (matching onboarding structure)
      budgetRange: budgetRange || profile.budgetRange || "",
      fundingPlan: fundingPlan || profile.fundingPlan || "",
      // Standardized Tests (matching onboarding structure)
      ieltsTaken: ieltsTaken !== undefined ? ieltsTaken : (profile.ieltsTaken || false),
      ieltsScore: {
        overall: ieltsScore || profile.ieltsScore?.overall || "",
        listening: profile.ieltsScore?.listening || "",
        reading: profile.ieltsScore?.reading || "",
        writing: profile.ieltsScore?.writing || "",
        speaking: profile.ieltsScore?.speaking || ""
      },
      toeflTaken: toeflTaken !== undefined ? toeflTaken : (profile.toeflTaken || false),
      toeflScore: {
        total: toeflScore || profile.toeflScore?.total || "",
        reading: profile.toeflScore?.reading || "",
        listening: profile.toeflScore?.listening || "",
        speaking: profile.toeflScore?.speaking || "",
        writing: profile.toeflScore?.writing || ""
      },
      greTaken: greTaken !== undefined ? greTaken : (profile.greTaken || false),
      greScore: {
        verbal: profile.greScore?.verbal || "",
        quantitative: profile.greScore?.quantitative || "",
        analytical: profile.greScore?.analytical || "",
        total: greScore || profile.greScore?.total || ""
      },
      gmatTaken: gmatTaken !== undefined ? gmatTaken : (profile.gmatTaken || false),
      gmatScore: {
        verbal: profile.gmatScore?.verbal || "",
        quantitative: profile.gmatScore?.quantitative || "",
        analytical: profile.gmatScore?.analytical || "",
        total: gmatScore || profile.gmatScore?.total || ""
      },
      // Additional Academic Info (matching onboarding structure)
      workExperience: workExperience || profile.workExperience || "",
      researchExperience: researchExperience || profile.researchExperience || "",
      publications: publications || profile.publications || "",
      certifications: certifications || profile.certifications || "",
      // Application Readiness (matching onboarding structure)
      sopStatus: sopStatus || profile.sopStatus || "",
      lorStatus: lorStatus || profile.lorStatus || "",
      resumeStatus: resumeStatus || profile.resumeStatus || "",
      // Preserve existing related data
      internships: profile.internships || [],
      projects: profile.projects || [],
      shortlistedUniversities: profile.shortlistedUniversities || [],
      lockedUniversity: profile.lockedUniversity || null,
      profileStrength: profile.profileStrength || {},
      completionPercentage: profile.completionPercentage || 0
    };

    // Update profile with clean data
    Object.assign(profile, profileData);

    // Save both user and profile
    await user.save();
    await profile.save();

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
