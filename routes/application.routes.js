import express from "express";
import {
  getUserApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  submitApplication,
  deleteApplication,
  uploadDocument,
  deleteDocument,
  getApplicationStats
} from "../controllers/application.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { uploadSingle } from "../config/cloudinary.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Add debugging middleware
router.use((req, res, next) => {
  console.log("=== APPLICATION ROUTE DEBUG ===");
  console.log("Method:", req.method);
  console.log("URL:", req.originalUrl);
  console.log("User:", req.user?._id);
  console.log("Headers:", req.headers['authorization'] ? 'Present' : 'Missing');
  next();
});

// Application statistics
router.get("/stats", (req, res, next) => {
  console.log("GET /api/applications/stats - User:", req.user?.email);
  next();
}, getApplicationStats);

// Get all applications for the logged-in user
router.get("/", (req, res, next) => {
  console.log("GET /api/applications - User:", req.user?.email);
  next();
}, getUserApplications);

// Create a new application
router.post("/", (req, res, next) => {
  console.log("POST /api/applications - User:", req.user?.email);
  console.log("Request body:", req.body);
  next();
}, createApplication);

// Get a single application by ID
router.get("/:id", getApplicationById);

// Update an application
router.put("/:id", updateApplication);

// Submit an application
router.post("/:id/submit", submitApplication);

// Delete an application
router.delete("/:id", deleteApplication);

// Document management
router.post("/:id/documents", (req, res, next) => {
  console.log("=== DOCUMENT UPLOAD ROUTE CALLED ===");
  console.log("Request params:", req.params);
  console.log("Request user:", req.user?._id);
  console.log("Request headers:", req.headers);
  next();
}, uploadSingle, uploadDocument);
router.delete("/:id/documents/:documentId", deleteDocument);

export default router;
