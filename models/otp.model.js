import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  otp: {
    type: String,
    required: true
  },
  tempData: {
    name: String,
    password: String
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    index: { expires: 0 } // Auto-delete after expiry
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("OTP", otpSchema);
