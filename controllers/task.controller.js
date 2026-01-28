import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";

// Generate default tasks for a user based on their profile
const generateDefaultTasks = async (userId, profile) => {
  const defaultTasks = [
    {
      userId,
      title: "Complete Your Profile",
      description: "Fill in your academic information, test scores, and preferences",
      status: "NOT_STARTED",
      priority: "HIGH",
      category: "PROFILE",
      points: 20,
      relatedStage: "BUILDING_PROFILE",
      createdBy: "AI"
    },
    {
      userId,
      title: "Take IELTS Test",
      description: "Register and take your IELTS English proficiency test",
      status: "NOT_STARTED",
      priority: "HIGH",
      category: "EXAM",
      points: 30,
      relatedStage: "BUILDING_PROFILE",
      createdBy: "AI"
    },
    {
      userId,
      title: "Write Statement of Purpose",
      description: "Draft a compelling SOP for your university applications",
      status: "NOT_STARTED",
      priority: "HIGH",
      category: "SOP",
      points: 25,
      relatedStage: "PREPARING_APPLICATIONS",
      createdBy: "AI"
    },
    {
      userId,
      title: "Gather Required Documents",
      description: "Collect transcripts, letters of recommendation, and other documents",
      status: "NOT_STARTED",
      priority: "MEDIUM",
      category: "DOCUMENTS",
      points: 15,
      relatedStage: "PREPARING_APPLICATIONS",
      createdBy: "AI"
    },
    {
      userId,
      title: "Submit First Application",
      description: "Complete and submit your first university application",
      status: "NOT_STARTED",
      priority: "MEDIUM",
      category: "APPLICATION",
      points: 35,
      relatedStage: "PREPARING_APPLICATIONS",
      createdBy: "AI"
    }
  ];

  // Only create tasks if user doesn't have any
  const existingTasks = await Task.find({ userId });
  if (existingTasks.length === 0) {
    await Task.insertMany(defaultTasks);
  }
};

export const getTasks = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user profile to check if we need to generate default tasks
    const profile = await Profile.findOne({ userId });
    if (profile) {
      await generateDefaultTasks(userId, profile);
    }
    
    const tasks = await Task.find({ userId }).sort({ createdAt: 1 });
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    console.log("Updating task status for ID:", req.params.id);
    console.log("Request body:", req.body);
    console.log("User ID:", req.user._id);
    
    // Handle both nested and direct status formats
    let status = req.body.status;
    if (typeof status === 'object' && status.status) {
      status = status.status;
    }
    
    console.log("Extracted status:", status);
    
    const validStatuses = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];
    
    if (!validStatuses.includes(status)) {
      console.log("Invalid status:", status);
      return res.status(400).json({ message: "Invalid status" });
    }

    // First check if task exists and belongs to user
    const existingTask = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!existingTask) {
      console.log("Task not found or does not belong to user:", req.params.id);
      return res.status(404).json({ message: "Task not found or access denied" });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );

    console.log("Task updated successfully:", task);
    res.json(task);
  } catch (error) {
    console.error("Error updating task status:", error);
    res.status(500).json({ message: "Failed to update task status" });
  }
};

// Create a new task
export const createTask = async (req, res) => {
  try {
    const { title, description, priority, category, status } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: "Task title is required" });
    }

    const task = new Task({
      userId: req.user._id,
      title,
      description: description || '',
      priority: priority || 'MEDIUM',
      category: category || 'GENERAL',
      status: status || 'NOT_STARTED',
      points: 10,
      relatedStage: 'GENERAL',
      createdBy: 'USER'
    });

    await task.save();
    console.log("Task created successfully:", task);
    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ message: "Failed to create task" });
  }
};

export const completeTask = async (req, res) => {
  await Task.findByIdAndUpdate(req.params.id, {
    status: "COMPLETED"
  });
  res.json({ message: "Task completed" });
};