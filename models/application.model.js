import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Transcript', 'Essay', 'Recommendation', 'Resume', 'Certificate', 'Other'],
    required: true
  },
  size: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Pending', 'Under Review', 'Verified', 'Rejected'],
    default: 'Pending'
  }
});

const applicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  university: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'University',
    required: false
  },
  program: {
    type: String,
    required: true
  },
  gpa: {
    type: Number,
    min: 0,
    max: 4
  },
  status: {
    type: String,
    enum: ['Draft', 'In Progress', 'Submitted', 'Under Review', 'Accepted', 'Rejected'],
    default: 'Draft'
  },
  submittedDate: {
    type: Date
  },
  deadline: {
    type: Date,
    required: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  documents: [documentSchema],
  requiredDocuments: {
    type: Number,
    default: 5
  },
  nextStep: {
    type: String,
    default: "Start application"
  },
  personalInfo: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    address: String,
    dateOfBirth: Date
  },
  academicInfo: {
    gpa: Number,
    satScore: Number,
    actScore: Number,
    toeflScore: Number,
    ieltsScore: Number,
    highSchool: String,
    graduationYear: Number
  },
  essays: [{
    prompt: String,
    content: String,
    wordCount: Number
  }],
  recommendations: [{
    name: String,
    email: String,
    relationship: String,
    status: {
      type: String,
      enum: ['Requested', 'Submitted', 'Complete'],
      default: 'Requested'
    }
  }],
  activities: [{
    name: String,
    position: String,
    startDate: Date,
    endDate: Date,
    description: String,
    hoursPerWeek: Number
  }],
  notes: [{
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
// applicationSchema.pre('save', function(next) {
//   this.updatedAt = new Date(); // Use Date constructor instead of Date.now()
//   next();
// });

// Calculate progress based on completed sections
applicationSchema.methods.calculateProgress = function() {
  let progress = 0;
  const sections = 6; // Total sections to complete
  
  if (this.personalInfo && Object.keys(this.personalInfo).length > 0) progress += 100/sections;
  if (this.academicInfo && Object.keys(this.academicInfo).length > 0) progress += 100/sections;
  if (this.essays && this.essays.length > 0) progress += 100/sections;
  if (this.recommendations && this.recommendations.length > 0) progress += 100/sections;
  if (this.activities && this.activities.length > 0) progress += 100/sections;
  if (this.documents && this.documents.length >= this.requiredDocuments) progress += 100/sections;
  
  this.progress = Math.round(progress);
  return this.progress;
};

// Update next step based on progress
applicationSchema.methods.updateNextStep = function() {
  const progress = this.calculateProgress();
  
  if (progress === 0) {
    this.nextStep = "Complete personal information";
  } else if (progress < 20) {
    this.nextStep = "Complete academic information";
  } else if (progress < 40) {
    this.nextStep = "Write personal essays";
  } else if (progress < 60) {
    this.nextStep = "Request recommendation letters";
  } else if (progress < 80) {
    this.nextStep = "Add extracurricular activities";
  } else if (progress < 100) {
    this.nextStep = "Upload required documents";
  } else {
    this.nextStep = "Review and submit application";
  }
  
  return this.nextStep;
};

export default mongoose.model('Application', applicationSchema);
