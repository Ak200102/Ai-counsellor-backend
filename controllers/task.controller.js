import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";

// Auto-generate tasks based on profile changes
const autoGenerateTasks = async (userId, profile) => {
  // Delete existing AI-generated tasks to avoid duplicates
  await Task.deleteMany({ userId, createdBy: "AI" });
  
  // Generate new personalized tasks
  await generatePersonalizedTasks(userId, profile);
  
  console.log(`Auto-generated ${await Task.countDocuments({ userId, createdBy: "AI" })} tasks for user ${userId}`);
};

// Generate personalized tasks based on user's profile
const generatePersonalizedTasks = async (userId, profile) => {
  const tasks = [];
  
  // Profile completion tasks based on missing information
  const profileTasks = [];
  
  // Academic info task
  if (!profile.academic?.major || !profile.academic?.gpa) {
    profileTasks.push({
      userId,
      title: "Complete Academic Information",
      description: `Add your ${!profile.academic?.major ? 'major/field of study' : ''}${!profile.academic?.major && !profile.academic?.gpa ? ' and ' : ''}${!profile.academic?.gpa ? 'GPA/scores' : ''} to strengthen your profile`,
      status: "NOT_STARTED",
      priority: "HIGH",
      category: "PROFILE",
      points: 20,
      relatedStage: "BUILDING_PROFILE",
      createdBy: "AI",
      reason: "Academic information is crucial for university admissions and matching"
    });
  }
  
  // Test score tasks based on user's goals
  if (profile.studyGoal?.countries?.includes('USA') || profile.studyGoal?.countries?.includes('Canada')) {
    if (!profile.greTaken && !profile.gmatTaken) {
      profileTasks.push({
        userId,
        title: "Prepare for GRE/GMAT",
        description: profile.studyGoal?.degree?.includes('Master') || profile.studyGoal?.degree?.includes('MBA') 
          ? "Most graduate programs in North America require GRE/GMAT scores"
          : "Consider taking GRE/GMAT for better university options",
        status: "NOT_STARTED",
        priority: "HIGH",
        category: "EXAM",
        points: 30,
        relatedStage: "BUILDING_PROFILE",
        createdBy: "AI",
        reason: "Standardized tests are required for most North American universities"
      });
    }
  }
  
  // English proficiency tasks
  if (!profile.ieltsTaken && !profile.toeflTaken) {
    const englishRequired = profile.studyGoal?.countries?.some(country => 
      ['USA', 'UK', 'Canada', 'Australia', 'New Zealand'].includes(country)
    );
    
    if (englishRequired) {
      profileTasks.push({
        userId,
        title: "Take English Proficiency Test",
        description: `Register for IELTS or TOEFL as required by universities in ${profile.studyGoal?.countries?.join(', ')}`,
        status: "NOT_STARTED",
        priority: "HIGH",
        category: "EXAM",
        points: 25,
        relatedStage: "BUILDING_PROFILE",
        createdBy: "AI",
        reason: "English proficiency is mandatory for universities in English-speaking countries"
      });
    }
  }
  
  // Work experience tasks based on profile
  if (!profile.workExperience && (profile.studyGoal?.degree?.includes('Master') || profile.studyGoal?.degree?.includes('MBA'))) {
    profileTasks.push({
      userId,
      title: "Document Work Experience",
      description: "Add your internships, work experience, and professional achievements",
      status: "NOT_STARTED",
      priority: "MEDIUM",
      category: "PROFILE",
      points: 15,
      relatedStage: "BUILDING_PROFILE",
      createdBy: "AI",
      reason: "Work experience strengthens your graduate school applications"
    });
  }
  
  // SOP task based on field of study
  if (profile.studyGoal?.field && !profile.exams?.sop) {
    profileTasks.push({
      userId,
      title: `Write SOP for ${profile.studyGoal.field}`,
      description: `Craft a compelling Statement of Purpose for ${profile.studyGoal.degree} in ${profile.studyGoal.field}`,
      status: "NOT_STARTED",
      priority: "HIGH",
      category: "SOP",
      points: 25,
      relatedStage: "PREPARING_APPLICATIONS",
      createdBy: "AI",
      reason: "A strong SOP is critical for admission to " + profile.studyGoal.field + " programs"
    });
  }
  
  // Budget planning task
  if (!profile.budget?.range || !profile.budget?.funding) {
    profileTasks.push({
      userId,
      title: "Plan Your Budget",
      description: "Set your budget range and explore funding options for your studies",
      status: "NOT_STARTED",
      priority: "MEDIUM",
      category: "PROFILE",
      points: 15,
      relatedStage: "BUILDING_PROFILE",
      createdBy: "AI",
      reason: "Financial planning helps in selecting suitable universities and scholarships"
    });
  }
  
  // University shortlisting task
  if (!profile.shortlistedUniversities || profile.shortlistedUniversities.length === 0) {
    profileTasks.push({
      userId,
      title: "Shortlist Target Universities",
      description: `Research and shortlist universities offering ${profile.studyGoal?.degree || 'your desired program'} in ${profile.studyGoal?.field || 'your field'}`,
      status: "NOT_STARTED",
      priority: "HIGH",
      category: "APPLICATION",
      points: 20,
      relatedStage: "PREPARING_APPLICATIONS",
      createdBy: "AI",
      reason: "Having target universities helps focus your application efforts"
    });
  }
  
  // Document preparation tasks
  const documentTasks = [];
  
  if (!profile.lorStatus || profile.lorStatus !== 'READY') {
    documentTasks.push({
      userId,
      title: "Request Letters of Recommendation",
      description: "Contact professors or supervisors for strong letters of recommendation",
      status: "NOT_STARTED",
      priority: "HIGH",
      category: "DOCUMENTS",
      points: 20,
      relatedStage: "PREPARING_APPLICATIONS",
      createdBy: "AI",
      reason: "LORs are critical components of your application package"
    });
  }
  
  if (!profile.resumeStatus || profile.resumeStatus !== 'READY') {
    documentTasks.push({
      userId,
      title: "Update Your Resume/CV",
      description: "Create a professional resume highlighting your academic and professional achievements",
      status: "NOT_STARTED",
      priority: "MEDIUM",
      category: "DOCUMENTS",
      points: 15,
      relatedStage: "PREPARING_APPLICATIONS",
      createdBy: "AI",
      reason: "A well-crafted resume is essential for university applications"
    });
  }
  
  // Application tasks
  const applicationTasks = [];
  
  if (profile.shortlistedUniversities && profile.shortlistedUniversities.length > 0) {
    applicationTasks.push({
      userId,
      title: "Start University Applications",
      description: `Begin applying to your shortlisted universities (deadline approaching for ${profile.studyGoal?.intakeYear || 'upcoming'} intake)`,
      status: "NOT_STARTED",
      priority: "HIGH",
      category: "APPLICATION",
      points: 35,
      relatedStage: "PREPARING_APPLICATIONS",
      createdBy: "AI",
      reason: "University applications have strict deadlines - start early"
    });
  }
  
  // Scholarship tasks
  if (profile.budget?.funding !== 'SELF_FUNDED') {
    applicationTasks.push({
      userId,
      title: "Apply for Scholarships",
      description: "Research and apply for scholarships and financial aid opportunities",
      status: "NOT_STARTED",
      priority: "MEDIUM",
      category: "APPLICATION",
      points: 30,
      relatedStage: "PREPARING_APPLICATIONS",
      createdBy: "AI",
      reason: "Scholarships can significantly reduce your study costs"
    });
  }
  
  // Combine all tasks
  const allTasks = [...profileTasks, ...documentTasks, ...applicationTasks];
  
  // Only create tasks if user doesn't have any
  const existingTasks = await Task.find({ userId });
  if (existingTasks.length === 0) {
    if (allTasks.length > 0) {
      await Task.insertMany(allTasks);
    } else {
      // Fallback to default tasks if no personalized tasks were generated
      const fallbackTasks = [
        {
          userId,
          title: "Complete Your Profile",
          description: "Fill in your academic information, test scores, and preferences",
          status: "NOT_STARTED",
          priority: "HIGH",
          category: "PROFILE",
          points: 20,
          relatedStage: "BUILDING_PROFILE",
          createdBy: "AI",
          reason: "A complete profile helps us provide better guidance"
        }
      ];
      await Task.insertMany(fallbackTasks);
    }
  }
};

export const getTasks = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user profile to auto-generate personalized tasks
    const profile = await Profile.findOne({ userId });
    if (profile) {
      await autoGenerateTasks(userId, profile);
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

export const regenerateTasks = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Delete existing AI-generated tasks
    await Task.deleteMany({ userId, createdBy: "AI" });
    
    // Get updated profile
    const profile = await Profile.findOne({ userId });
    if (profile) {
      await generatePersonalizedTasks(userId, profile);
    }
    
    const tasks = await Task.find({ userId }).sort({ createdAt: 1 });
    res.json(tasks);
  } catch (error) {
    console.error("Error regenerating tasks:", error);
    res.status(500).json({ message: "Failed to regenerate tasks" });
  }
};

export const completeTask = async (req, res) => {
  await Task.findByIdAndUpdate(req.params.id, {
    status: "COMPLETED"
  });
  res.json({ message: "Task completed" });
};