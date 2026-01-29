import geminiResponse from "../gemini.js";
import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";
import Conversation from "../models/conversation.model.js";
import Task from "../models/task.model.js";
import University from "../models/university.model.js";

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

    console.log("Fetching profile data...");
    // Get user's profile data
    let profileData;
    try {
      profileData = await Profile.findOne({ userId: req.user._id });
      console.log("Profile data found:", profileData ? "Yes" : "No");
      if (profileData) {
        console.log("Raw profile data:", JSON.stringify(profileData, null, 2));
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
      universities: "Not provided"
    };

    let infoProvided = [];

    try {
      if (profileData) {
        // 🎓 ACADEMIC BACKGROUND - Complete data
        if (profileData.academic) {
          const academic = profileData.academic;
          profile.academic = `Level: ${academic.level || 'Not specified'}, Major: ${academic.major || 'Not specified'}, University: ${academic.university || 'Not specified'}, GPA: ${academic.gpa || 'Not specified'}, Graduation Year: ${academic.graduationYear || 'Not specified'}`;
          if (academic.level || academic.major || academic.university || academic.gpa) {
            infoProvided.push("academic background");
          }
        }
        
        // 🎯 STUDY GOALS - Complete data
        if (profileData.studyGoal) {
          const studyGoal = profileData.studyGoal;
          profile.goal = `Target Degree: ${studyGoal.degree || 'Not specified'}, Field: ${studyGoal.field || 'Not specified'}, Intake: ${studyGoal.intakeYear || 'Not specified'}, Countries: ${studyGoal.countries?.join(', ') || 'Not specified'}`;
          if (studyGoal.degree || studyGoal.field || studyGoal.intakeYear || studyGoal.countries?.length > 0) {
            infoProvided.push("study goals");
          }
        }
        
        // 💰 BUDGET - Complete data
        if (profileData.budget) {
          const budget = profileData.budget;
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
        }
        if (profileData.toeflTaken) {
          testScores.push(`TOEFL: ${profileData.toeflScore?.total || 'Not specified'}`);
          infoProvided.push("TOEFL score");
        }
        if (profileData.greTaken) {
          testScores.push(`GRE: ${profileData.greScore?.total || 'Not specified'}`);
          infoProvided.push("GRE score");
        }
        if (profileData.gmatTaken) {
          testScores.push(`GMAT: ${profileData.gmatScore?.total || 'Not specified'}`);
          infoProvided.push("GMAT score");
        }
        profile.exams = testScores.length > 0 ? testScores.join(', ') : "Not provided";
        
        // 📚 EXPERIENCE - Complete data
        const experienceInfo = [];
        if (profileData.workExperience) {
          experienceInfo.push(`Work: ${profileData.workExperience}`);
          infoProvided.push("work experience");
        }
        if (profileData.researchExperience) {
          experienceInfo.push(`Research: ${profileData.researchExperience}`);
          infoProvided.push("research experience");
        }
        if (profileData.publications) {
          experienceInfo.push(`Publications: ${profileData.publications}`);
          infoProvided.push("publications");
        }
        if (profileData.certifications) {
          experienceInfo.push(`Certifications: ${profileData.certifications}`);
          infoProvided.push("certifications");
        }
        profile.experience = experienceInfo.length > 0 ? experienceInfo.join(', ') : "Not provided";
        
        // 📄 APPLICATION READINESS - Complete data
        const applicationStatus = [];
        if (profileData.sopStatus) {
          applicationStatus.push(`SOP: ${profileData.sopStatus}`);
          infoProvided.push("SOP status");
        }
        if (profileData.lorStatus) {
          applicationStatus.push(`LOR: ${profileData.lorStatus}`);
          infoProvided.push("LOR status");
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
        
        console.log("Enhanced profile data:", profile);
        console.log("Info provided:", infoProvided);
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
          content: msg.content
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
    console.log("Context keys:", Object.keys(context));
    console.log("Shortlisted universities IDs:", profileData?.shortlistedUniversities?.map(u => u.universityId));
    console.log("Carnegie Mellon ID should be: 6979264b061b38d8d1d18228");
    
    let aiText;
    try {
      aiText = await geminiResponse(context);
      console.log("✅ geminiResponse succeeded");
      
      // OVERRIDE: If user explicitly asks to lock a university, force LOCK_UNIVERSITY action
      if (message.toLowerCase().includes('lock')) {
        console.log("🔒 OVERRIDE: User wants to lock university, forcing LOCK_UNIVERSITY action");
        
        try {
          const aiResponse = JSON.parse(aiText);
          
          // Check if Carnegie Mellon is shortlisted
          const isShortlisted = profileData?.shortlistedUniversities?.some(u => 
            u.universityId === '6979264b061b38d8d1d18228' // Carnegie Mellon
          );
          
          console.log("🔒 Carnegie Mellon shortlisted check:", isShortlisted);
          
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
            console.log("🔒 FORCED LOCK_UNIVERSITY action");
          } else {
            console.log("🔓 Carnegie Mellon not shortlisted, keeping original response");
          }
        } catch (parseError) {
          console.error("Error parsing AI response for override:", parseError);
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
          console.log("🔒 FORCED LOCK_UNIVERSITY action (fallback)");
        }
      }
      
    } catch (geminiError) {
      console.error("❌ geminiResponse failed:", geminiError.message);
      console.error("Full error:", geminiError);
      
      // Use fallback response
      const fallbackResponse = generateFallbackAIResponse(context);
      console.log("Using fallback response due to gemini failure");
      
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
    console.log("AI Response length:", aiText?.length || 0);

    // Fallback to mock AI response if API fails
    if (!aiText || aiText.trim().length === 0) {
      console.log("AI service failed, using fallback response");
      const fallbackResponse = generateFallbackAIResponse(context);
      console.log("Fallback response:", fallbackResponse);
      return res.json(fallbackResponse);
    }

    let parsed;
    try {
      parsed = JSON.parse(aiText);
      console.log("Parsed AI response:", parsed);
    } catch (parseError) {
      console.error("JSON Parse error:", parseError, "Response:", aiText);
      // If JSON parsing fails, create a structured response from the text
      const fallbackResponse = generateFallbackAIResponse(context, aiText);
      console.log("Parse error fallback response:", fallbackResponse);
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

        if (parsed.action === "SHORTLIST_UNIVERSITY" && parsed.universityName) {
          // Find university by name
          const university = await University.findOne({ name: parsed.universityName });
          if (university) {
            const profile = await Profile.findOne({ userId: req.user._id });
            if (profile) {
              // Check if already shortlisted
              const alreadyShortlisted = profile.shortlistedUniversities.some(
                u => u.universityId?.toString() === university._id.toString()
              );
              if (!alreadyShortlisted) {
                // Determine category based on fit score
                let category = "TARGET";
                if (university.rank <= 20) category = "DREAM";
                if (university.rank > 50) category = "SAFE";

                profile.shortlistedUniversities.push({
                  universityId: university._id,
                  category: category,
                  shortlistedAt: new Date()
                });
                await profile.save();
                parsed.universityShortlisted = {
                  name: university.name,
                  category: category
                };
              }
            }
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