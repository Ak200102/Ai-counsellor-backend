import express from "express";
import isAuth from "../middlewares/isAuth.js";
import {
  getUniversities,
  getUniversityById,
  shortlistUniversity,
  removeFromShortlist,
  getShortlistedUniversities,
  lockUniversity,
  unlockUniversity,
  getApplicationGuidance
} from "../controllers/university.controller.js";

const router = express.Router();

// Get all universities with filtering
router.get("/", isAuth, getUniversities);

// Get single university by ID
router.get("/:id", isAuth, getUniversityById);

// Shortlist management
router.post("/shortlist", isAuth, shortlistUniversity);
router.delete("/shortlist/:universityId", isAuth, removeFromShortlist);
router.get("/shortlist", isAuth, getShortlistedUniversities);

// Lock/Unlock university
router.post("/lock", isAuth, lockUniversity);
router.post("/unlock", isAuth, unlockUniversity);

// Application guidance for locked university
router.get("/guidance", isAuth, getApplicationGuidance);

export default router;