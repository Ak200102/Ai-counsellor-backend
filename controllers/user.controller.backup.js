import Profile from "../models/profile.model.js";
import User from "../models/user.model.js";
import bcryptjs from "bcryptjs";

export const completeOnboarding = async (req, res) => {
  try {
    await Profile.findOneAndUpdate(
      { userId: req.user._id },
      { ...req.body, userId: req.user._id },
      { upsert: true }
    );

    req.user.onboardingCompleted = true;
    req.user.stage = "BUILDING_PROFILE";
    await req.user.save();

    res.json({ message: "Onboarding completed", user: req.user });
  } catch (error) {
    console.error("Onboarding error:", error);
    res.status(500).json({ message: "Failed to complete onboarding" });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    const profile = await Profile.findOne({ userId: req.user._id })
      .populate("shortlistedUniversities.universityId")
      .populate("lockedUniversity.universityId");
    
    res.json({
      ...user.toObject(),
      profile: profile || null,
      shortlistedUniversities: profile?.shortlistedUniversities || [],
      lockedUniversity: profile?.lockedUniversity || null
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Failed to fetch user data" });
  }
};

export const updateUser = async (req, res) => {
  try {
    console.log("=== UPDATE USER START ===");
    const { name, password, bio, targetCountry, studyLevel, budget, major, gpa, degree, field } = req.body;
    
    console.log("Update profile request:", { name, bio, targetCountry, studyLevel, budget, major, gpa, degree, field });
    
    // Find the user
    console.log("Finding user...");
    const user = await User.findById(req.user._id);
    if (!user) {
      console.log("User not found:", req.user._id);
      return res.status(404).json({ message: "User not found" });
    }
    console.log("User found:", user._id);

    // Find or create profile
    console.log("Finding profile...");
    let profile = await Profile.findOne({ userId: req.user._id });
    if (!profile) {
      console.log("Creating new profile for user:", req.user._id);
      profile = new Profile({ userId: req.user._id });
      console.log("New profile created:", profile._id);
    } else {
      console.log("Profile found:", profile._id);
    }

    // Update user name if provided
    if (name && name.trim()) {
      user.name = name.trim();
      console.log("Updated user name to:", name);
    }

    // Update password if provided
    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      user.password = await bcryptjs.hash(password, 10);
      console.log("Updated user password");
    }

    // DIRECT FIX: Completely reset problematic fields to clean objects
    profile.academic = {};
    profile.studyGoal = {};
    profile.budget = {};

    // Update profile fields with clean objects
    if (bio !== undefined) {
      console.log("Updating bio to:", bio);
      profile.bio = bio;
    }
    if (targetCountry !== undefined && targetCountry.trim()) {
      profile.studyGoal.countries = targetCountry ? [targetCountry] : [];
      console.log("Updated studyGoal.countries:", profile.studyGoal.countries);
    }
    if (studyLevel !== undefined && studyLevel.trim()) {
      profile.academic.level = studyLevel;
      console.log("Updated academic.level:", studyLevel);
    }
    if (budget !== undefined && budget.trim()) {
      profile.budget.range = budget;
      console.log("Updated budget.range:", budget);
    }
    if (major !== undefined && major.trim()) {
      profile.academic.major = major;
      console.log("Updated academic.major:", major);
    }
    if (gpa !== undefined && gpa.trim()) {
      profile.academic.gpa = gpa;
      console.log("Updated academic.gpa:", gpa);
    }
    if (degree !== undefined && degree.trim()) {
      profile.studyGoal.degree = degree;
      console.log("Updated studyGoal.degree:", degree);
    }
    if (field !== undefined && field.trim()) {
      profile.studyGoal.field = field;
      console.log("Updated studyGoal.field:", field);
    }

    console.log("Profile before save:", profile.toObject());
    console.log("Saving user...");
    await user.save();
    console.log("User saved successfully");
    
    console.log("Saving profile...");
    await profile.save();
    console.log("Profile saved successfully");

    // Return user without password
    const userObject = user.toObject();
    delete userObject.password;

    console.log("=== UPDATE USER SUCCESS ===");
    res.json({
      message: "Profile updated successfully",
      user: {
        ...userObject,
        profile: profile.toObject()
      }
    });
  } catch (error) {
    console.error("=== UPDATE USER ERROR ===");
    console.error("Error:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
    console.error("Error code:", error.code);
    res.status(500).json({ 
      message: "Failed to update profile",
      error: error.message,
      stack: error.stack
    });
  }
};

