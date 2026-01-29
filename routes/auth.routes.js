import express from "express";
import { signup, login, requestSignupOTP, verifySignupOTP, logout, forgotPassword, verifyResetOTP, resetPassword, googleAuthSuccess, googleAuthFailure } from "../controllers/auth.controllers.js";
import isAuth from "../middlewares/isAuth.js";
import passport from "../config/googleAuth.js";

const router = express.Router();

// OTP-based signup flow
router.post("/request-otp", requestSignupOTP);
router.post("/verify-otp", verifySignupOTP);

// Traditional signup (kept for fallback)
router.post("/signup", signup);
router.post("/login", login);

// Google OAuth routes
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/login" }),
  googleAuthSuccess
);

// OTP-based password reset
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);

// Logout
router.post("/logout", isAuth, logout);

export default router;