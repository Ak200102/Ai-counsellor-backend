import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protect = async (req, res, next) => {
  try {
    console.log("=== AUTH MIDDLEWARE CALLED ===");
    console.log("Request URL:", req.originalUrl);
    console.log("Request method:", req.method);
    console.log("Authorization header:", req.headers.authorization);
    
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      console.log("No token provided");
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided."
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token decoded successfully:", decoded);
      
      // Get user from database
      const user = await User.findById(decoded.id).select("-password");
      console.log("User found:", user ? user.email : "Not found");
      
      if (!user) {
        console.log("User not found for ID:", decoded.id);
        return res.status(401).json({
          success: false,
          message: "Invalid token. User not found."
        });
      }

      // Add user to request object
      req.user = user;
      console.log("Authentication successful for user:", user.email);
      next();
    } catch (error) {
      console.log("JWT verification failed:", error.message);
      return res.status(401).json({
        success: false,
        message: "Invalid token."
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Server error in authentication."
    });
  }
};
