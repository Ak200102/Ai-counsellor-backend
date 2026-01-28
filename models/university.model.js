import mongoose from "mongoose";

const universitySchema = new mongoose.Schema({
  name: String,
  country: String,
  program: String,
  universityType: String, // Dream / Target / Safe
  image: String, // University image URL
  
  costLevel: String,          // Low / Medium / High
  competitiveness: String,    // Low / Medium / High
  acceptanceChance: String,   // Low / Medium / High
  
  ranking: Number,
  tuitionFeePerYear: Number,
  internshipOpportunities: String,
  placementRate: Number,
  averageSalary: String,
  
  requirements: {
    minGPA: Number,
    ielts: Number,
    gre: Number,
    sop: Boolean,
    recommendationLetters: Number
  },
  
  description: String,
  whyItFits: String,
  risks: String,
  
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default mongoose.model("University", universitySchema);
