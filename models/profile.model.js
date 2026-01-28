import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    
    bio: {
      type: String,
      maxlength: 500,
      default: ""
    },

    academic: {
      level: String,
      major: String,
      graduationYear: Number,
      gpa: String,
      score: Number
    },

    studyGoal: {
      degree: String,
      field: String,
      intakeYear: Number,
      countries: [String]
    },

    budget: {
      range: String,
      funding: String
    },

    exams: {
      ielts: {
        status: String,
        score: Number
      },
      gre: {
        status: String,
        score: Number
      },
      sop: String
    },

    internships: [
      {
        title: String,
        company: String,
        duration: String,
        description: String
      }
    ],

    projects: [
      {
        title: String,
        description: String,
        technologies: [String]
      }
    ],

    shortlistedUniversities: [
      {
        universityId: mongoose.Schema.Types.ObjectId,
        category: String,
        addedAt: { type: Date, default: Date.now }
      }
    ],

    lockedUniversity: {
      universityId: mongoose.Schema.Types.ObjectId,
      lockedAt: Date
    },

    profileStrength: {
      academics: String,
      exams: String,
      readiness: String,
      internships: String
    },

    completionPercentage: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export default mongoose.model("Profile", profileSchema);
