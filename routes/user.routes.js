import express from "express";
import isAuth from "../middlewares/isAuth.js";
import {
  completeOnboarding,
  getCurrentUser,
  updateUser,
  uploadAvatar,
  removeAvatar
} from "../controllers/user.controller.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";

console.log("=== USER ROUTES LOADED ===");
console.log("uploadAvatar function:", typeof uploadAvatar);

const router = express.Router();

// Configure Cloudinary storage for avatars specifically
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const name = file.originalname.split('.')[0];
      return `${name}-${uniqueSuffix}`;
    },
    resource_type: 'auto',
    transformation: [
      { width: 200, height: 200, crop: 'limit' },
      { quality: 'auto' }
    ]
  }
});

const upload = multer({ storage: storage });

router.get("/me", isAuth, getCurrentUser);
router.post("/onboarding", isAuth, completeOnboarding);
router.put("/me", isAuth, updateUser);
router.post("/avatar-upload", isAuth, upload.single('avatar'), uploadAvatar);
router.delete("/remove-avatar", isAuth, removeAvatar);
router.get("/ai-counselling-status", isAuth, (req, res) => {
  res.json({ 
    aiCounsellingCompleted: req.user.aiCounsellingCompleted || false 
  });
});

export default router;