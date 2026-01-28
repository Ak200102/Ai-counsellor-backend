import Application from "../models/application.model.js";
import University from "../models/university.model.js";
import User from "../models/user.model.js";
import { deleteFromCloudinary } from "../config/cloudinary.js";

// Get all applications for a user
export const getUserApplications = async (req, res) => {
  try {
    console.log("=== GET APPLICATIONS CONTROLLER CALLED ===");
    console.log("User ID:", req.user._id);
    console.log("User Email:", req.user.email);
    
    const userId = req.user._id;
    const applications = await Application.find({ user: userId })
      .populate('university', 'name country image ranking')
      .sort({ createdAt: -1 });

    console.log("Found applications:", applications.length);
    console.log("Applications data:", applications);

    res.status(200).json({
      success: true,
      data: applications,
      count: applications.length
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch applications"
    });
  }
};

// Get a single application by ID
export const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const application = await Application.findOne({ _id: id, user: userId })
      .populate('university', 'name country image ranking tuitionFeePerYear requirements');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error("Error fetching application:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch application"
    });
  }
};

// Create a new application
export const createApplication = async (req, res) => {
  try {
    console.log("=== CREATE APPLICATION CONTROLLER CALLED ===");
    console.log("Create application request received:", req.body);
    console.log("User ID:", req.user._id);
    
    const userId = req.user._id;
    const { universityId, program, deadline, gpa } = req.body;

    // Allow creating applications without university initially
    if (!program || !deadline) {
      console.log("Missing required fields:", { program, deadline });
      return res.status(400).json({
        success: false,
        message: "Program and deadline are required"
      });
    }

    console.log("Validation passed - proceeding with application creation");

    let university = null;
    if (universityId) {
      // Check if university exists
      console.log("Checking university with ID:", universityId);
      university = await University.findById(universityId);
      if (!university) {
        console.log("University not found:", universityId);
        return res.status(404).json({
          success: false,
          message: "University not found"
        });
      }
      console.log("University found:", university.name);

      // Check if user already has an application for this university
      console.log("Checking existing applications for user:", userId, "university:", universityId);
      const existingApplication = await Application.findOne({
        user: userId,
        university: universityId
      });

      if (existingApplication) {
        console.log("Existing application found:", existingApplication._id);
        return res.status(400).json({
          success: false,
          message: "You already have an application for this university"
        });
      }
    }

    // Create new application
    console.log("Creating new application...");
    const application = new Application({
      user: userId,
      university: universityId,
      program,
      gpa: gpa ? parseFloat(gpa) : undefined,
      deadline: new Date(deadline),
      status: 'Draft'
    });

    // Calculate initial progress and next step
    application.calculateProgress();
    application.updateNextStep();

    console.log("Saving application...");
    await application.save();
    console.log("Application saved:", application._id);

    const populatedApplication = await Application.findById(application._id)
      .populate('university', 'name country image ranking');

    console.log("Application created successfully");
    res.status(201).json({
      success: true,
      data: populatedApplication,
      message: "Application created successfully"
    });
  } catch (error) {
    console.error("Error creating application:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to create application",
      error: error.message
    });
  }
};

// Update application
export const updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const updates = req.body;

    const application = await Application.findOne({ _id: id, user: userId });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    // Update application fields
    Object.keys(updates).forEach(key => {
      if (key !== 'user' && key !== 'university') {
        application[key] = updates[key];
      }
    });

    // Recalculate progress and next step
    application.calculateProgress();
    application.updateNextStep();

    // Update status if progress is 100%
    if (application.progress === 100 && application.status === 'Draft') {
      application.status = 'In Progress';
    }

    await application.save();

    const populatedApplication = await Application.findById(application._id)
      .populate('university', 'name country image ranking');

    res.status(200).json({
      success: true,
      data: populatedApplication,
      message: "Application updated successfully"
    });
  } catch (error) {
    console.error("Error updating application:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update application"
    });
  }
};

// Submit application
export const submitApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const application = await Application.findOne({ _id: id, user: userId });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    // Check if all required documents are uploaded
    if (application.documents.length < application.requiredDocuments) {
      return res.status(400).json({
        success: false,
        message: "Please upload all required documents before submitting"
      });
    }

    // Check if progress is 100%
    if (application.progress < 100) {
      return res.status(400).json({
        success: false,
        message: "Please complete all sections before submitting"
      });
    }

    application.status = 'Submitted';
    application.submittedDate = new Date();
    application.nextStep = "Awaiting university decision";

    await application.save();

    const populatedApplication = await Application.findById(application._id)
      .populate('university', 'name country image ranking');

    res.status(200).json({
      success: true,
      data: populatedApplication,
      message: "Application submitted successfully"
    });
  } catch (error) {
    console.error("Error submitting application:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit application"
    });
  }
};

// Delete application
export const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const application = await Application.findOne({ _id: id, user: userId });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    // Only allow deletion of draft applications
    if (application.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: "Cannot delete submitted application"
      });
    }

    await Application.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Application deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting application:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete application"
    });
  }
};

// Upload document to application
export const uploadDocument = async (req, res) => {
  try {
    console.log("=== UPLOAD DOCUMENT CONTROLLER CALLED ===");
    console.log("Request params:", req.params);
    console.log("Request user:", req.user?._id);
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);
    
    const { id } = req.params;
    const userId = req.user._id;
    const { name, type } = req.body;

    if (!req.file) {
      console.log("No file uploaded");
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    console.log("File details:", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      filename: req.file.filename
    });

    const application = await Application.findOne({ _id: id, user: userId });

    if (!application) {
      console.log("Application not found:", id);
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    console.log("Application found:", application._id);

    // Add document to application with Cloudinary URL
    const newDocument = {
      name: name || req.file.originalname,
      type: type || 'Other',
      size: formatFileSize(req.file.size),
      fileUrl: req.file.path, // Cloudinary URL
      publicId: req.file.filename, // Cloudinary public ID for deletion
      uploadDate: new Date(),
      status: 'Pending'
    };

    console.log("New document object:", newDocument);

    application.documents.push(newDocument);

    // Recalculate progress and next step
    application.calculateProgress();
    application.updateNextStep();

    await application.save();

    console.log("Document saved successfully");

    res.status(201).json({
      success: true,
      data: newDocument,
      message: "Document uploaded successfully to Cloudinary"
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to upload document",
      error: error.message
    });
  }
};

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Delete document from application
export const deleteDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;
    const userId = req.user._id;

    const application = await Application.findOne({ _id: id, user: userId });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    // Find the document to delete
    const documentToDelete = application.documents.id(documentId);
    if (!documentToDelete) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    // Delete from Cloudinary if publicId exists
    if (documentToDelete.publicId) {
      try {
        await deleteFromCloudinary(documentToDelete.publicId);
      } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Remove document from application
    application.documents = application.documents.filter(
      doc => doc._id.toString() !== documentId
    );

    // Recalculate progress and next step
    application.calculateProgress();
    application.updateNextStep();

    await application.save();

    res.status(200).json({
      success: true,
      message: "Document deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete document"
    });
  }
};

// Get application statistics
export const getApplicationStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const applications = await Application.find({ user: userId });
    
    const stats = {
      total: applications.length,
      draft: applications.filter(app => app.status === 'Draft').length,
      inProgress: applications.filter(app => app.status === 'In Progress').length,
      submitted: applications.filter(app => app.status === 'Submitted').length,
      accepted: applications.filter(app => app.status === 'Accepted').length,
      rejected: applications.filter(app => app.status === 'Rejected').length,
      underReview: applications.filter(app => app.status === 'Under Review').length
    };

    // Get upcoming deadlines
    const upcomingDeadlines = applications
      .filter(app => app.deadline > new Date() && app.status !== 'Submitted')
      .sort((a, b) => a.deadline - b.deadline)
      .slice(0, 5)
      .map(app => ({
        id: app._id,
        university: app.university,
        deadline: app.deadline,
        daysLeft: Math.ceil((app.deadline - new Date()) / (1000 * 60 * 60 * 24))
      }));

    res.status(200).json({
      success: true,
      data: {
        stats,
        upcomingDeadlines
      }
    });
  } catch (error) {
    console.error("Error fetching application stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch application statistics"
    });
  }
};
