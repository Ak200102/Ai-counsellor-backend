import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    avatar: String,

    onboardingCompleted: {
      type: Boolean,
      default: false
    },

    aiCounsellingCompleted: {
      type: Boolean,
      default: false
    },

    stage: {
      type: String,
      enum: ["ONBOARDING", "BUILDING_PROFILE", "DISCOVERING_UNIVERSITIES", "FINALIZING_UNIVERSITIES", "PREPARING_APPLICATIONS"],
      default: "ONBOARDING"
    },

    shortlistedUniversities: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "University"
    }],

    lockedUniversity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);