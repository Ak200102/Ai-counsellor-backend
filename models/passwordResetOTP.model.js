import mongoose from "mongoose";

const passwordResetOTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  otp: {
    type: String,
    required: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    expires: 600 // 10 minutes
  }
}, {
  timestamps: true
});

// Index for cleanup of expired documents
passwordResetOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("PasswordResetOTP", passwordResetOTPSchema);
