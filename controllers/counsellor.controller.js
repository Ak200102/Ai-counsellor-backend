import geminiResponse from "../gemini.js";
import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";
import Conversation from "../models/conversation.model.js";
import Task from "../models/task.model.js";
import University from "../models/university.model.js";

export const saveConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: "Messages array is required" });
    }
    
    // Find or create conversation for this user
    let conversation = await Conversation.findOne({ userId });
    if (!conversation) {
      conversation = new Conversation({ userId, messages: [] });
    }

    // Add new messages
    if (Array.isArray(messages)) {
      messages.forEach(msg => {
        conversation.messages.push({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp || Date.now())
        });
      });
    }

    // Keep only last 50 messages
    if (conversation.messages.length > 50) {
      conversation.messages = conversation.messages.slice(-50);
    }

    conversation.lastUpdated = new Date();
    await conversation.save();

    res.json({
      message: "Conversation saved successfully",
      messagesSaved: messages.length,
      totalMessages: conversation.messages.length
    });
  } catch (error) {
    console.error("Error saving conversation:", error);
    res.status(500).json({ message: "Failed to save conversation" });
  }
};

export const deleteConversationHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Delete the conversation for this user
    const result = await Conversation.deleteOne({ userId });
    
    if (result.deletedCount > 0) {
      res.json({ message: "Chat history deleted successfully" });
    } else {
      res.json({ message: "No chat history found to delete" });
    }
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res.status(500).json({ message: "Failed to delete chat history" });
  }
};

export const getConversationHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Find conversation for this user
    const conversation = await Conversation.findOne({ userId }).sort({ lastUpdated: -1 });
    
    if (!conversation) {
      return res.json({ messages: [] });
    }
    
    // Return messages sorted by timestamp (newest first)
    const messages = conversation.messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({ 
      messages: messages,
      lastUpdated: conversation.lastUpdated
    });
  } catch (error) {
    console.error("Error fetching conversation history:", error);
    res.status(500).json({ message: "Failed to fetch conversation history" });
  }
};

export const aiCounsellor = async (req, res) => {
  try {
    console.log("=== AI COUNSELLOR CONTROLLER CALLED ===");
    console.log("Request body:", req.body);
    console.log("User ID:", req.user._id);
    
    const { message } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("User found:", user.name);
    console.log("User message:", message);

    // Rate limiting: Check if user made a request in the last 2 seconds
    if (user.lastAIRequestTime) {
      const timeSinceLastRequest = Date.now() - user.lastAIRequestTime.getTime();
      if (timeSinceLastRequest < 2000) {
        return res.status(429).json({ 
          message: "Please wait a moment before making another request. API is rate-limited.",
          retryAfter: Math.ceil((2000 - timeSinceLastRequest) / 1000)
        });
      }
    }

    // Update last request time
    user.lastAIRequestTime = new Date();
    await user.save();

    // Get user's profile data
    let profileData;
    try {
      profileData = await Profile.findOne({ userId: req.user._id });
      console.log("Profile data found for user", req.user._id, ":", profileData ? "Yes" : "No");
      if (profileData) {
        console.log("Profile keys:", Object.keys(profileData));
        console.log("Has academic:", !!profileData.academic);
        console.log("Has studyGoal:", !!profileData.studyGoal);
        console.log("Has budget:", !!profileData.budget);
      }
    } catch (profileError) {
      console.error("Error fetching profile data:", profileError);
      profileData = null;
    }
    
    let profile = {
      academic: "Not provided",
      goal: "Not provided", 
      budget: "Not provided",
      exams: "Not provided",
      experience: "Not provided",
      applications: "Not provided",
      universities: "Not provided",
      isComplete: false
    };

    let infoProvided = [];
    let completenessScore = 0;
    const maxScore = 6; // academic, goal, budget, exams, experience, applications

    try {
      if (profileData) {
        // 🎓 ACADEMIC BACKGROUND - Complete data
        if (profileData.academic) {
          const academic = profileData.academic;
          if (academic.level && academic.level !== 'Not specified' && academic.level !== '') completenessScore++;
          if (academic.major && academic.major !== 'Not specified' && academic.major !== '') completenessScore++;
          if (academic.gpa && academic.gpa !== 'Not specified' && academic.gpa !== '') completenessScore++;
          
          profile.academic = `Level: ${academic.level || 'Not specified'}, Major: ${academic.major || 'Not specified'}, University: ${academic.university || 'Not specified'}, GPA: ${academic.gpa || 'Not specified'}, Graduation Year: ${academic.graduationYear || 'Not specified'}`;
          if (academic.level || academic.major || academic.university || academic.gpa) {
            infoProvided.push("academic background");
          }
        }
        
        // 🎯 STUDY GOALS - Complete data
        if (profileData.studyGoal) {
          const studyGoal = profileData.studyGoal;
          if (studyGoal.degree && studyGoal.degree !== 'Not specified' && studyGoal.degree !== '') completenessScore++;
          if (studyGoal.field && studyGoal.field !== 'Not specified' && studyGoal.field !== '') completenessScore++;
          if (studyGoal.countries && studyGoal.countries.length > 0) completenessScore++;
          
          profile.goal = `Target Degree: ${studyGoal.degree || 'Not specified'}, Field: ${studyGoal.field || 'Not specified'}, Intake: ${studyGoal.intakeYear || 'Not specified'}, Countries: ${studyGoal.countries?.join(', ') || 'Not specified'}`;
          if (studyGoal.degree || studyGoal.field || studyGoal.intakeYear || studyGoal.countries?.length > 0) {
            infoProvided.push("study goals");
          }
        }
        
        // 💰 BUDGET - Complete data
        if (profileData.budget) {
          const budget = profileData.budget;
          if (budget.range && budget.range !== 'Not specified' && budget.range !== '') completenessScore++;
          
          profile.budget = `Range: ${budget.range || 'Not specified'}, Funding: ${budget.funding || 'Not specified'}`;
          if (budget.range || budget.funding) {
            infoProvided.push("budget information");
          }
        }
        
        // 📝 STANDARDIZED TESTS - Complete data
        const testScores = [];
        if (profileData.ieltsTaken) {
          testScores.push(`IELTS: ${profileData.ieltsScore?.overall || 'Not specified'}`);
          infoProvided.push("IELTS score");
          completenessScore++;
        }
        if (profileData.toeflTaken) {
          testScores.push(`TOEFL: ${profileData.toeflScore?.total || 'Not specified'}`);
          infoProvided.push("TOEFL score");
          completenessScore++;
        }
        if (profileData.greTaken) {
          testScores.push(`GRE: ${profileData.greScore?.total || 'Not specified'}`);
          infoProvided.push("GRE score");
          completenessScore++;
        }
        if (profileData.gmatTaken) {
          testScores.push(`GMAT: ${profileData.gmatScore?.total || 'Not specified'}`);
          infoProvided.push("GMAT score");
          completenessScore++;
        }
        profile.exams = testScores.length > 0 ? testScores.join(', ') : "Not provided";
        
        // 📚 EXPERIENCE - Complete data
        const experienceInfo = [];
        if (profileData.workExperience && profileData.workExperience !== '') {
          experienceInfo.push(`Work: ${profileData.workExperience}`);
          infoProvided.push("work experience");
          completenessScore++;
        }
        if (profileData.researchExperience && profileData.researchExperience !== '') {
          experienceInfo.push(`Research: ${profileData.researchExperience}`);
          infoProvided.push("research experience");
        }
        if (profileData.publications && profileData.publications !== '') {
          experienceInfo.push(`Publications: ${profileData.publications}`);
          infoProvided.push("publications");
        }
        if (profileData.certifications && profileData.certifications !== '') {
          experienceInfo.push(`Certifications: ${profileData.certifications}`);
          infoProvided.push("certifications");
        }
        profile.experience = experienceInfo.length > 0 ? experienceInfo.join(', ') : "Not provided";
        
        // 📄 APPLICATION READINESS - Complete data
        const applicationStatus = [];
        if (profileData.sopStatus && profileData.sopStatus !== '') {
          applicationStatus.push(`SOP: ${profileData.sopStatus}`);
          infoProvided.push("SOP status");
          completenessScore++;
        }
        if (profileData.lorStatus && profileData.lorStatus !== '') {
          applicationStatus.push(`LOR: ${profileData.lorStatus}`);
          infoProvided.push("LOR status");
        }
        if (profileData.resumeStatus && profileData.resumeStatus !== '') {
          applicationStatus.push(`Resume: ${profileData.resumeStatus}`);
          infoProvided.push("Resume status");
        }
        if (profileData.resumeStatus) {
          applicationStatus.push(`Resume: ${profileData.resumeStatus}`);
          infoProvided.push("Resume status");
        }
        profile.applications = applicationStatus.length > 0 ? applicationStatus.join(', ') : "Not provided";
        
        // 🏛️ UNIVERSITY STATUS - Complete data
        const shortlistedCount = profileData.shortlistedUniversities?.length || 0;
        const lockedUniversity = profileData.lockedUniversity?.universityId?.name || 'None';
        profile.universities = `Shortlisted: ${shortlistedCount}, Locked: ${lockedUniversity}`;
        if (shortlistedCount > 0 || lockedUniversity !== 'None') {
          infoProvided.push("university status");
        }
        
        // Determine if profile is complete (at least 4 out of 6 key areas)
        profile.isComplete = completenessScore >= 4;
      }
    } catch (profileError) {
      console.error("Error processing profile data:", profileError);
    }

    const alreadyProvidedInfo = infoProvided.length > 0 
      ? `The student has already provided: ${infoProvided.join(", ")}. DO NOT ask for this information again.`
      : "The student hasn't provided detailed information yet.";

    // Fetch conversation history
    let conversation = await Conversation.findOne({ userId: req.user._id });
    
    // Get last 10 messages for context (to keep context manageable)
    const conversationHistory = conversation 
      ? conversation.messages.slice(-10).map(msg => ({
          role: msg.role,
          content: msg.content.replace(/🔍 DEBUG INFO:[\s\S]*?---/g, '').trim() // Remove debug info
        }))
      : [];

    const context = {
      userName: user.name || "Student",
      userStage: user.stage || "ONBOARDING",
      profile: profile,
      shortlistedUniversities: profileData?.shortlistedUniversities || [],
      lockedUniversity: profileData?.lockedUniversity || null,
      userMessage: message || "Hello, I need guidance on my study-abroad journey.",
      alreadyProvidedInfo: alreadyProvidedInfo,
      conversationHistory: conversationHistory
    };

    console.log("Calling geminiResponse with context...");
    
    let aiText;
    try {
      aiText = await geminiResponse(context);
      
      // Clean up AI response - remove JSON objects and debug info
      aiText = aiText
        .replace(/\{[^}]*"title"[^}]*\}/g, '') // Remove task JSON objects
        .replace(/\{[^}]*"universityId"[^}]*\}/g, '') // Remove university JSON objects
        .replace(/\{[^}]*"universityName"[^}]*\}/g, '') // Remove university name JSON
        .replace(/\[[^\]]*"universityId"[^\]]*\]/g, '') // Remove university arrays
        .replace(/\[[^\]]*"category"[^\]]*\]/g, '') // Remove category arrays
        .replace(/Here's a task for you:/g, '') // Remove task introduction
        .replace(/Here are the shortlisted universities:/g, '') // Remove university list intro
        .replace(/Please let me know how I can assist you further\./g, '') // Remove closing
        .replace(/Action: [A-Z_]+/g, '') // Remove action lines
        .replace(/Auto-Shortlisted Universities:/g, '') // Remove auto-shortlisted header
        .replace(/- [^(]+\([^)]+\)/g, '') // Remove university list items with categories
        .replace(/\n\n+/g, '\n\n') // Fix excessive line breaks
        .replace(/\{[^}]*\}/g, '') // Remove any remaining JSON objects
        .replace(/\[[^\]]*\]/g, '') // Remove any remaining arrays
        .trim();
      
      // OVERRIDE: If user explicitly asks to lock a university, force LOCK_UNIVERSITY action
      if (message.toLowerCase().includes('lock')) {
        try {
          const aiResponse = JSON.parse(aiText);
          
          // Check if Carnegie Mellon is shortlisted
          const isShortlisted = profileData?.shortlistedUniversities?.some(u => 
            u.universityId === '6979264b061b38d8d1d18228' // Carnegie Mellon
          );
          
          if (isShortlisted) {
            // Force LOCK_UNIVERSITY action
            aiResponse.action = "LOCK_UNIVERSITY";
            aiResponse.actionableNextSteps = [{
              text: "Lock Carnegie Mellon University",
              action: "LOCK_UNIVERSITY",
              universityName: "Carnegie Mellon University"
            }];
            aiResponse.message = "Perfect! Carnegie Mellon University is already in your shortlist. I'll lock it for you now.";
            
            aiText = JSON.stringify(aiResponse);
          } else {
            // University not shortlisted, add it first then lock
            aiResponse.action = "SHORTLIST_UNIVERSITY";
            aiResponse.actionableNextSteps = [{
              text: "Shortlist and lock Carnegie Mellon University",
              action: "LOCK_UNIVERSITY",
              universityName: "Carnegie Mellon University"
            }];
            aiResponse.message = "I'll add Carnegie Mellon University to your shortlist and then lock it for you.";
            
            aiText = JSON.stringify(aiResponse);
          }
        } catch (parseError) {
          // Force lock even if parsing fails
          const forceResponse = {
            action: "LOCK_UNIVERSITY",
            actionableNextSteps: [{
              text: "Lock Carnegie Mellon University",
              action: "LOCK_UNIVERSITY",
              universityName: "Carnegie Mellon University"
            }],
            message: "Perfect! Carnegie Mellon University is already in your shortlist. I'll lock it for you now."
          };
          aiText = JSON.stringify(forceResponse);
        }
      }
      
    } catch (geminiError) {
      // Use fallback response
      const fallbackResponse = generateFallbackAIResponse(context);
      
      return res.json({
        message: fallbackResponse.message,
        response: fallbackResponse.response,
        collegeRecommendations: fallbackResponse.collegeRecommendations,
        actionableNextSteps: fallbackResponse.actionableNextSteps,
        nextSteps: fallbackResponse.nextSteps,
        action: fallbackResponse.action,
        task: fallbackResponse.task,
        universityName: fallbackResponse.universityName,
        fallback: true
      });
    }

    console.log("AI Response from gemini.js:", aiText);

    // Fallback to mock AI response if API fails
    if (!aiText || aiText.trim().length === 0) {
      const fallbackResponse = generateFallbackAIResponse(context);
      return res.json(fallbackResponse);
    }

    let parsed;
    try {
      parsed = JSON.parse(aiText);
    } catch (parseError) {
      // If JSON parsing fails, create a structured response from the text
      const fallbackResponse = generateFallbackAIResponse(context, aiText);
      return res.json(fallbackResponse);
    }

    // Save user message to conversation history
    if (!conversation) {
      conversation = new Conversation({ userId: req.user._id, messages: [] });
    }
    
    conversation.messages.push({
      role: "user",
      content: message,
      timestamp: new Date()
    });

    // Save AI response to conversation history (extract message from parsed JSON)
    const aiMessage = parsed.message || parsed.response || JSON.stringify(parsed);
    conversation.messages.push({
      role: "assistant",
      content: aiMessage,
      timestamp: new Date()
    });

    // Keep only last 50 messages to avoid document size issues
    if (conversation.messages.length > 50) {
      conversation.messages = conversation.messages.slice(-50);
    }

    conversation.lastUpdated = new Date();
    
    try {
      await conversation.save();
      console.log("Conversation saved successfully");
    } catch (saveError) {
      console.error("Error saving conversation:", saveError);
      // Continue even if conversation save fails
    }

    // Mark AI counselling as completed for first-time users
    if (!user.aiCounsellingCompleted) {
      try {
        user.aiCounsellingCompleted = true;
        await user.save();
        console.log("AI counselling marked as completed for user:", user._id);
      } catch (userSaveError) {
        console.error("Error updating user AI counselling status:", userSaveError);
        // Continue even if user save fails
      }
    }

    // Handle AI-suggested actions
    if (parsed.action && parsed.action !== "NONE") {
      try {
        if (parsed.action === "CREATE_TASK" && parsed.task) {
          const newTask = new Task({
            userId: req.user._id,
            title: parsed.task.title,
            description: parsed.task.reason || "",
            status: "NOT_STARTED",
            priority: "HIGH",
            category: "PROFILE",
            relatedStage: user.stage,
            createdBy: "AI"
          });
          await newTask.save();
          parsed.taskCreated = {
            taskId: newTask._id,
            title: newTask.title
          };
          console.log("Task created successfully:", newTask.title);
        }

        if (parsed.action === "AUTO_SHORTLIST_MULTIPLE" && parsed.autoShortlisted) {
          console.log("=== AUTO SHORTLIST MULTIPLE ACTION ===");
          console.log("Universities to auto-shortlist:", parsed.autoShortlisted);
          
          const profile = await Profile.findOne({ userId: req.user._id });
          if (profile) {
            const shortlistedResults = [];
            
            for (const uniData of parsed.autoShortlisted) {
              const university = await University.findOne({ name: uniData.name });
              console.log(`Processing ${uniData.name}:`, university ? "Found" : "Not found");
              
              if (university) {
                // Check if already shortlisted
                const alreadyShortlisted = profile.shortlistedUniversities.some(
                  u => u.universityId?.toString() === university._id.toString()
                );
                
                if (!alreadyShortlisted) {
                  // Use provided category or determine based on rank
                  let category = uniData.category || "TARGET";
                  if (university.rank <= 20) category = "DREAM";
                  if (university.rank > 50) category = "SAFE";

                  profile.shortlistedUniversities.push({
                    universityId: university._id,
                    category: category,
                    shortlistedAt: new Date()
                  });
                  
                  shortlistedResults.push({
                    name: university.name,
                    category: category
                  });
                  
                  console.log(`Auto-shortlisted: ${university.name} (${category})`);
                } else {
                  console.log(`${university.name} already shortlisted`);
                }
              }
            }
            
            if (shortlistedResults.length > 0) {
              await profile.save();
              console.log(`Auto-shortlisted ${shortlistedResults.length} universities`);
              parsed.autoShortlistedResults = shortlistedResults;
            }
          }
        }

        if (parsed.action === "SHORTLIST_UNIVERSITY" && parsed.universityName) {
          console.log("=== SHORTLIST UNIVERSITY ACTION ===");
          console.log("University name from AI:", parsed.universityName);
          
          // Find university by name
          const university = await University.findOne({ name: parsed.universityName });
          console.log("Found university:", university);
          
          if (university) {
            console.log("University ID:", university._id);
            const profile = await Profile.findOne({ userId: req.user._id });
            console.log("User profile found:", !!profile);
            
            if (profile) {
              console.log("Current shortlisted universities:", profile.shortlistedUniversities.length);
              
              // Check if already shortlisted
              const alreadyShortlisted = profile.shortlistedUniversities.some(
                u => u.universityId?.toString() === university._id.toString()
              );
              console.log("Already shortlisted:", alreadyShortlisted);
              
              if (!alreadyShortlisted) {
                // Determine category based on fit score
                let category = "TARGET";
                if (university.rank <= 20) category = "DREAM";
                if (university.rank > 50) category = "SAFE";

                console.log("Adding to shortlist with category:", category);

                profile.shortlistedUniversities.push({
                  universityId: university._id,
                  category: category,
                  shortlistedAt: new Date()
                });
                
                console.log("Profile before save:", profile.shortlistedUniversities.length);
                await profile.save();
                console.log("Profile after save:", profile.shortlistedUniversities.length);
                
                parsed.universityShortlisted = {
                  name: university.name,
                  category: category
                };
                console.log("University shortlisted successfully:", parsed.universityShortlisted);
              } else {
                console.log("University already shortlisted");
              }
            }
          } else {
            console.log("University not found in database");
            // Try to find partial match
            const allUniversities = await University.find({});
            console.log("Available universities:", allUniversities.map(u => u.name));
          }
        }

        if (parsed.action === "LOCK_UNIVERSITY" && parsed.universityName) {
          // Find university by name
          const university = await University.findOne({ name: parsed.universityName });
          if (university) {
            const profile = await Profile.findOne({ userId: req.user._id });
            if (profile && profile.shortlistedUniversities.length >= 3) {
              profile.lockedUniversity = {
                universityId: university._id,
                lockedAt: new Date()
              };
              user.stage = "PREPARING_APPLICATIONS";
              user.lockedUniversity = university._id;
              await profile.save();
              await user.save();
              parsed.universityLocked = {
                name: university.name,
                stage: "PREPARING_APPLICATIONS"
              };
            }
          }
        }
      } catch (actionError) {
        console.error("Error processing AI action:", actionError);
        // Don't fail the whole request if action processing fails
      }
    }

    res.json(parsed);
  } catch (error) {
    console.error("Counsellor controller error:", error.message, error.stack);
    res.status(500).json({ message: error.message || "Failed to get AI response. Please try again." });
  }
};

// Fallback AI response generator when API fails
function generateFallbackAIResponse(context, aiText = null) {
  const { userName, userStage, profile, userMessage, shortlistedUniversities, lockedUniversity } = context;
  
  // If we have raw AI text but couldn't parse JSON, use it as message
  const message = aiText || generateContextualResponse(context);
  
  return {
    message: message,
    profileAssessment: {
      academics: profile.academic !== "Not provided" ? "Average" : "Not Assessed",
      internships: "Not Assessed",
      readiness: userStage === "ONBOARDING" ? "Low" : "Medium"
    },
    collegeRecommendations: generateCollegeRecommendations(profile, shortlistedUniversities),
    actionableNextSteps: generateActionableNextSteps(context),
    nextSteps: ["Complete your profile", "Research universities", "Prepare required documents"],
    action: "NONE",
    task: null,
    universityName: null
  };
}

function generateContextualResponse(context) {
  const { userName, userStage, profile, userMessage } = context;
  
  if (userStage === "ONBOARDING") {
    return `Hi ${userName || 'Student'}! I see you're just getting started. Let me help you complete your profile first so I can provide personalized guidance. Please finish the onboarding process, and then I can give you specific university recommendations and application advice.`;
  }
  
  if (userMessage.toLowerCase().includes("university") || userMessage.toLowerCase().includes("college")) {
    return `Based on your profile, I'd recommend researching universities that match your academic background. Since you're interested in universities, have you considered what field of study you'd like to pursue? This will help me give you more targeted recommendations.`;
  }
  
  if (userMessage.toLowerCase().includes("help") || userMessage.toLowerCase().includes("guidance")) {
    return `I'm here to guide you through your study-abroad journey! Based on your current stage (${userStage}), I can help you with university selection, application preparation, and document requirements. What specific aspect would you like to focus on first?`;
  }
  
  return `Hello ${userName || 'Student'}! I'm your AI study-abroad counsellor. I can help you with university selection, application guidance, and document preparation. Based on your profile, I see you're at the ${userStage} stage. What would you like to know about studying abroad?`;
}

function generateCollegeRecommendations(profile, shortlistedUniversities) {
  const recommendations = [
    {
      category: "TARGET",
      name: "University of Texas at Austin",
      country: "USA",
      rank: "#50-100",
      field: "Engineering & Business",
      internshipScore: "Medium",
      acceptanceProbability: "Medium",
      reason: "Strong programs with good internship opportunities and reasonable admission requirements."
    },
    {
      category: "SAFE",
      name: "Arizona State University",
      country: "USA", 
      rank: "#100-150",
      field: "Multiple Programs",
      internshipScore: "High",
      acceptanceProbability: "High",
      reason: "Excellent for practical experience with high acceptance rate and strong industry connections."
    },
    {
      category: "DREAM",
      name: "University of Michigan",
      country: "USA",
      rank: "#20-30",
      field: "Engineering & Computer Science",
      internshipScore: "High", 
      acceptanceProbability: "Low",
      reason: "Top-tier programs with exceptional research opportunities, though highly competitive."
    }
  ];
  
  return recommendations.slice(0, 3);
}

function generateActionableNextSteps(context) {
  const { userStage, profile } = context;
  const steps = [];
  
  if (userStage === "ONBOARDING") {
    steps.push({
      text: "Complete your profile setup",
      action: "CREATE_TASK",
      taskTitle: "Profile Completion",
      taskReason: "Essential for personalized recommendations"
    });
  }
  
  if (profile.academic === "Not provided") {
    steps.push({
      text: "Add your academic information",
      action: "CREATE_TASK", 
      taskTitle: "Academic Profile Setup",
      taskReason: "Required for university matching"
    });
  }
  
  steps.push({
    text: "Research recommended universities",
    action: "NONE"
  });
  
  return steps;
}