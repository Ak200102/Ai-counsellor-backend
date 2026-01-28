import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";
import Task from "../models/task.model.js";
import Conversation from "../models/conversation.model.js";
import bcryptjs from "bcryptjs";

export const updateProfile = async (req, res) => {
  try {
    const { name, email, bio } = req.body;
    const userId = req.user._id;

    // Update user basic info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (email && email !== user.email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }
      user.email = email;
    }

    await user.save();

    // Update profile bio if provided
    if (bio !== undefined) {
      await Profile.findOneAndUpdate(
        { userId },
        { bio },
        { upsert: true, new: true }
      );
    }

    res.json({ 
      message: "Profile updated successfully",
      user: {
        name: user.name,
        email: user.email,
        bio
      }
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

export const updateNotifications = async (req, res) => {
  try {
    const { email, push, sms, updates } = req.body;
    const userId = req.user._id;

    await Profile.findOneAndUpdate(
      { userId },
      {
        notifications: {
          email: email !== undefined ? email : true,
          push: push !== undefined ? push : false,
          sms: sms !== undefined ? sms : false,
          updates: updates !== undefined ? updates : true
        }
      },
      { upsert: true, new: true }
    );

    res.json({ message: "Notification preferences updated successfully" });
  } catch (error) {
    console.error("Update notifications error:", error);
    res.status(500).json({ message: "Failed to update notification preferences" });
  }
};

export const updatePrivacy = async (req, res) => {
  try {
    const { profileVisibility, showEmail, showProgress } = req.body;
    const userId = req.user._id;

    await Profile.findOneAndUpdate(
      { userId },
      {
        privacy: {
          profileVisibility: profileVisibility || "public",
          showEmail: showEmail !== undefined ? showEmail : false,
          showProgress: showProgress !== undefined ? showProgress : true
        }
      },
      { upsert: true, new: true }
    );

    res.json({ message: "Privacy settings updated successfully" });
  } catch (error) {
    console.error("Update privacy error:", error);
    res.status(500).json({ message: "Failed to update privacy settings" });
  }
};

export const updateAppearance = async (req, res) => {
  try {
    const { theme, language } = req.body;
    const userId = req.user._id;

    await Profile.findOneAndUpdate(
      { userId },
      {
        appearance: {
          theme: theme || "light",
          language: language || "en"
        }
      },
      { upsert: true, new: true }
    );

    res.json({ message: "Appearance settings updated successfully" });
  } catch (error) {
    console.error("Update appearance error:", error);
    res.status(500).json({ message: "Failed to update appearance settings" });
  }
};

export const logoutAllDevices = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // In a real implementation, you would:
    // 1. Invalidate all refresh tokens for this user
    // 2. Clear all active sessions
    // 3. Update a version number in the user document
    
    await User.findByIdAndUpdate(userId, {
      $inc: { sessionVersion: 1 }
    });

    res.json({ message: "Logged out from all devices successfully" });
  } catch (error) {
    console.error("Logout all devices error:", error);
    res.status(500).json({ message: "Failed to logout from all devices" });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { password } = req.body;

    // Verify password before deletion
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Delete all user-related data
    await Promise.all([
      User.findByIdAndDelete(userId),
      Profile.deleteMany({ userId }),
      Task.deleteMany({ userId }),
      Conversation.deleteMany({ userId })
    ]);

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ message: "Failed to delete account" });
  }
};

export const getSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId);
    const profile = await Profile.findOne({ userId });

    res.json({
      profile: {
        name: user?.name || '',
        email: user?.email || '',
        bio: profile?.bio || ''
      },
      notifications: profile?.notifications || {
        email: true,
        push: false,
        sms: false,
        updates: true
      },
      privacy: profile?.privacy || {
        profileVisibility: "public",
        showEmail: false,
        showProgress: true
      },
      appearance: profile?.appearance || {
        theme: "light",
        language: "en"
      }
    });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ message: "Failed to load settings" });
  }
};
