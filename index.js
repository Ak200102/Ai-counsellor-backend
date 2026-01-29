import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import path from "path";
import session from "express-session";
import passport from "./config/googleAuth.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import universityRoutes from "./routes/university.routes.js";
import counsellorRoutes from "./routes/counsellor.routes.js";
import taskRoutes from "./routes/task.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import platformRoutes from "./routes/platform.routes.js";
import applicationRoutes from "./routes/application.routes.js";

const app = express();

// Session middleware for passport
app.use(session({
  secret: process.env.JWT_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`=== INCOMING REQUEST ===`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log(`Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  console.log(`Headers:`, req.headers);
  console.log(`========================`);
  next();
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/universities", universityRoutes);
app.use("/api/counsellor", counsellorRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/applications", applicationRoutes);

// Add a simple test route in main index.js
app.post("/api/user/test-avatar", (req, res) => {
  console.log("=== TEST AVATAR ROUTE HIT IN INDEX.JS ===");
  res.json({ 
    message: "Test avatar route working!",
    avatar: "https://res.cloudinary.com/dsrbsoxai/image/upload/v1/sample_avatar.jpg"
  });
});

// Add a simple test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working!" });
});

await connectDB();

app.listen(process.env.PORT || 8000, () => {
  console.log(`Backend running at ${process.env.PORT}`);
});
