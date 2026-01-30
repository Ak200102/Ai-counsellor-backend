import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    
    bio: {
      type: String,
      maxlength: 500,
      default: ""
    },

    // Standardized Tests
    ieltsTaken: { type: Boolean, default: false },
    ieltsScore: { 
      overall: { type: String, default: "" },
      listening: { type: String, default: "" },
      reading: { type: String, default: "" },
      writing: { type: String, default: "" },
      speaking: { type: String, default: "" }
    },
    toeflTaken: { type: Boolean, default: false },
    toeflScore: { 
      total: { type: String, default: "" },
      reading: { type: String, default: "" },
      listening: { type: String, default: "" },
      speaking: { type: String, default: "" },
      writing: { type: String, default: "" }
    },
    greTaken: { type: Boolean, default: false },
    greScore: { 
      total: { type: String, default: "" },
      verbal: { type: String, default: "" },
      quantitative: { type: String, default: "" },
      analytical: { type: String, default: "" }
    },
    gmatTaken: { type: Boolean, default: false },
    gmatScore: { 
      total: { type: String, default: "" },
      verbal: { type: String, default: "" },
      quantitative: { type: String, default: "" },
      analytical: { type: String, default: "" }
    },

    // Additional Academic Info
    workExperience: { type: String, default: "" },
    researchExperience: { type: String, default: "" },
    publications: { type: String, default: "" },
    certifications: { type: String, default: "" },

    // Application Readiness
    sopStatus: { type: String, default: "" },
    lorStatus: { type: String, default: "" },
    resumeStatus: { type: String, default: "" },

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
        universityId: { type: mongoose.Schema.Types.ObjectId, ref: "University" },
        category: String,
        addedAt: { type: Date, default: Date.now }
      }
    ],

    lockedUniversity: {
      universityId: { type: mongoose.Schema.Types.ObjectId, ref: "University" },
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
