import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: String,
    status: {
      type: String,
      enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
      default: "NOT_STARTED"
    },
    priority: {
      type: String,
      enum: ["HIGH", "MEDIUM", "LOW"],
      default: "MEDIUM"
    },
    category: {
      type: String,
      enum: ["EXAM", "SOP", "DOCUMENTS", "APPLICATION", "PROFILE"],
      default: "APPLICATION"
    },
    points: {
      type: Number,
      default: 10
    },
    dueDate: Date,
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University"
    },
    relatedStage: String,
    createdBy: {
      type: String,
      enum: ["AI", "USER"],
      default: "AI"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Task", taskSchema);