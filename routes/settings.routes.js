import express from "express";
import isAuth from "../middlewares/isAuth.js";
import {
  updateProfile,
  updateNotifications,
  updatePrivacy,
  updateAppearance,
  logoutAllDevices,
  deleteAccount,
  getSettings
} from "../controllers/settings.controller.js";

const router = express.Router();

// Get all settings
router.get("/", isAuth, getSettings);

// Update profile settings
router.put("/profile", isAuth, updateProfile);

// Update notification settings
router.put("/notifications", isAuth, updateNotifications);

// Update privacy settings
router.put("/privacy", isAuth, updatePrivacy);

// Update appearance settings
router.put("/appearance", isAuth, updateAppearance);

// Logout from all devices
router.post("/logout-all", isAuth, logoutAllDevices);

// Delete account
router.delete("/account", isAuth, deleteAccount);

export default router;
