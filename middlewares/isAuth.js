import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const isAuth = async (req, res, next) => {
  console.log("=== IS AUTH MIDDLEWARE START ===");
  console.log("Authorization header:", req.headers.authorization);
  
  const token = req.headers.authorization?.split(" ")[1];
  console.log("Extracted token:", token ? token.substring(0, 20) + "..." : "null");

  if (!token) {
    console.log("No token found");
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    console.log("JWT_SECRET:", process.env.JWT_SECRET ? "exists" : "missing");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);
    
    req.user = await User.findById(decoded.id);
    console.log("User found:", req.user ? req.user._id : "null");
    
    console.log("=== IS AUTH SUCCESS ===");
    next();
  } catch (error) {
    console.error("=== IS AUTH ERROR ===");
    console.error("JWT Error:", error.message);
    console.error("JWT Error name:", error.name);
    console.error("JWT Error stack:", error.stack);
    console.error("Token that failed:", token);
    
    return res.status(401).json({ 
      message: "Not authorized", 
      error: error.message 
    });
  }
};

export default isAuth;