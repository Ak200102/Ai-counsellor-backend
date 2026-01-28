import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import OTP from "../models/otp.model.js";
import PasswordResetOTP from "../models/passwordResetOTP.model.js";
import { generateToken } from "../config/token.js";
import { sendOTPEmail } from "../services/emailService.js";

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Request OTP for signup
export const requestSignupOTP = async (req, res) => {
  try {
    const { email, name, password } = req.body;
    console.log("Received signup request:", { email, name, password: "***" });

    if (!email || !name || !password) {
      return res.status(400).json({ message: "Email, name, and password required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Delete any existing OTP for this email
    await OTP.deleteMany({ email });

    // Generate OTP
    const otp = generateOTP();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store OTP with temp user data
    const otpRecord = await OTP.create({
      email,
      otp,
      tempData: {
        name,
        password: hashedPassword
      }
    });

    // Send OTP email
    await sendOTPEmail(email, otp, name);

    // For development: return OTP in response (remove in production!)
    const isDevelopment = process.env.NODE_ENV !== 'production';

    res.status(200).json({
      message: "OTP sent to your email",
      email,
      expiresIn: "10 minutes",
      ...(isDevelopment && { otp }) // Only include OTP in development
    });
  } catch (error) {
    console.error("Signup OTP request error:", error.message || error);
    res.status(500).json({ message: error.message || "Failed to send OTP" });
  }
};

// Verify OTP and create user
export const verifySignupOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP required" });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    // Check attempt limit
    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: "Too many attempts. Request new OTP" });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        message: "Invalid OTP",
        attemptsRemaining: 5 - otpRecord.attempts
      });
    }

    // Create user with temp data
    const user = await User.create({
      name: otpRecord.tempData.name,
      email: otpRecord.email, // Use email from OTP record, not tempData
      password: otpRecord.tempData.password
    });

    // Delete OTP record
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(201).json({
      message: "Signup successful",
      token: generateToken(user._id),
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error("Signup OTP verification error:", error);
    
    // Handle specific errors
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: "Invalid user data" });
    }
    
    res.status(500).json({ message: error.message || "Failed to verify OTP" });
  }
};

// Traditional signup (fallback) - deprecated, kept for compatibility
export const signup = async (req, res) => {
  const { name, email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword
  });

  res.status(201).json({
    token: generateToken(user._id)
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  res.json({
    token: generateToken(user._id)
  });
};

export const logout = async (req, res) => {
  try {
    // Since JWT is stateless, logout is client-side by removing token
    // This endpoint can be used for logging/analytics purposes
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Logout failed" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log("🔍 Forgot Password Request:");
    console.log("Email:", email);
    
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    console.log("🔍 User found:", !!user);
    
    // Always return success to prevent email enumeration attacks
    if (!user) {
      console.log("❌ User not found, returning success for security");
      return res.json({ 
        message: "If an account with that email exists, an OTP has been sent to your email." 
      });
    }

    // Generate OTP
    const otp = generateOTP();
    console.log("🔐 Generated OTP:", otp);
    
    // Save OTP to database
    try {
      const savedOTP = await PasswordResetOTP.create({
        email,
        otp
      });
      console.log("✅ OTP saved to database:", savedOTP);
      console.log("🔍 OTP ID:", savedOTP._id);
      console.log("🔍 OTP expires at:", savedOTP.expiresAt);
    } catch (saveError) {
      console.error("❌ Error saving OTP to database:", saveError);
      return res.status(500).json({ message: "Failed to generate OTP" });
    }

    // Send OTP email
    console.log(`Password reset OTP for ${email}: ${otp}`);
    try {
      await sendOTPEmail(email, otp, "User");
      console.log("📧 Password reset OTP email sent successfully");
    } catch (emailError) {
      console.error("❌ Failed to send password reset email:", emailError);
      console.log("📧 OTP logged to console as fallback");
    }
    
    res.json({ 
      message: "If an account with that email exists, an OTP has been sent to your email." 
    });
    
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Failed to process password reset request" });
  }
};

export const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    console.log("🔍 Verify Reset OTP Request:");
    console.log("Email:", email);
    console.log("OTP:", otp);
    
    if (!email || !otp) {
      console.log("❌ Missing email or OTP");
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    // Check all OTPs for this email (for debugging)
    const allOTPs = await PasswordResetOTP.find({ email });
    console.log("🔍 All OTPs for this email:", allOTPs);

    // Find valid OTP
    const resetOTP = await PasswordResetOTP.findOne({
      email,
      otp,
      isUsed: false,
      expiresAt: { $gt: Date.now() }
    });

    console.log("🔍 Found OTP:", resetOTP);
    console.log("🔍 Current time:", new Date());
    console.log("🔍 OTP expires at:", resetOTP?.expiresAt);

    if (!resetOTP) {
      console.log("❌ Invalid or expired OTP");
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Mark OTP as used
    resetOTP.isUsed = true;
    await resetOTP.save();

    console.log("✅ OTP verified successfully");
    res.json({ 
      message: "OTP verified successfully. You can now reset your password." 
    });
    
  } catch (error) {
    console.error("Verify reset OTP error:", error);
    res.status(500).json({ message: "Failed to verify OTP" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    // Find user
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Clean up any remaining OTPs for this email
    await PasswordResetOTP.deleteMany({ email });

    res.json({ 
      message: "Password reset successfully. Please login with your new password." 
    });
    
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
};

