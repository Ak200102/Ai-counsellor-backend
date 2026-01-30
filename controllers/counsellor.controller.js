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
          timestamp: new Date()
        });
      });
    }

    // Save conversation
    await conversation.save();

    res.json({
      success: true,
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
      res.json({ message: "Conversation history deleted successfully" });
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
    const userId = req.user._id; // Use authenticated user ID
    console.log("Fetching conversation history for user:", userId);
    
    const conversation = await Conversation.findOne({ userId }).sort({ lastUpdated: -1 });
    console.log("Found conversation:", !!conversation);
    
    if (!conversation) {
      console.log("No conversation found for user:", userId);
      return res.json({ messages: [] });
    }
    
    console.log("Conversation has", conversation.messages.length, "messages");
    
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
      universities: "Not provided"
    };

    let infoProvided = [];
    let completenessScore = 0;

    try {
      if (profileData) {
        // 🎓 ACADEMIC BACKGROUND - Complete data
        if (profileData.academic) {
          profile.academic = `${profileData.academic.level || "Not specified"} in ${profileData.academic.major || "Not specified"}`;
          if (profileData.academic.gpa) profile.academic += ` (GPA: ${profileData.academic.gpa})`;
          if (profileData.academic.university) profile.academic += ` from ${profileData.academic.university}`;
          infoProvided.push("academic background");
          completenessScore++;
        }
        
        // 🎯 STUDY GOAL - Complete data
        if (profileData.studyGoal) {
          profile.goal = `${profileData.studyGoal.degree || "Not specified"} in ${profileData.studyGoal.field || "Not specified"}`;
          if (profileData.studyGoal.countries && profileData.studyGoal.countries.length > 0) {
            profile.goal += ` in ${profileData.studyGoal.countries.join(", ")}`;
          }
          infoProvided.push("study goals");
          completenessScore++;
        }
        
        // 💰 BUDGET - Complete data
        if (profileData.budget) {
          profile.budget = `${profileData.budget.range || "Not specified"} budget`;
          if (profileData.budget.currency) profile.budget += ` (${profileData.budget.currency})`;
          infoProvided.push("budget");
          completenessScore++;
        }
        
        // 📝 EXAMS - Complete data
        if (profileData.standardizedTests) {
          const exams = [];
          
          // Helper function to safely extract exam values
          const getExamValue = (value) => {
            if (typeof value === 'string') return value;
            if (typeof value === 'number') return value.toString();
            if (typeof value === 'object' && value !== null) {
              // Handle nested objects like {score: 7.0, type: "Academic"}
              if (value.score) return value.score.toString();
              if (value.value) return value.value.toString();
              if (value.total) return value.total.toString();
              return JSON.stringify(value);
            }
            return "N/A";
          };
          
          if (profileData.standardizedTests.ielts) {
            exams.push(`IELTS: ${getExamValue(profileData.standardizedTests.ielts)}`);
          }
          if (profileData.standardizedTests.toefl) {
            exams.push(`TOEFL: ${getExamValue(profileData.standardizedTests.toefl)}`);
          }
          if (profileData.standardizedTests.gre) {
            const gre = profileData.standardizedTests.gre;
            const verbal = getExamValue(gre.verbal || gre.verbalReasoning);
            const quantitative = getExamValue(gre.quantitative || gre.quantitativeReasoning);
            const analytical = getExamValue(gre.analytical || gre.analyticalWriting);
            exams.push(`GRE: ${verbal}/${quantitative}/${analytical}`);
          }
          if (profileData.standardizedTests.gmat) {
            const gmat = profileData.standardizedTests.gmat;
            const verbal = getExamValue(gmat.verbal || gmat.verbalReasoning);
            const quantitative = getExamValue(gmat.quantitative || gmat.quantitativeReasoning);
            const analytical = getExamValue(gmat.analytical || gmat.analyticalWriting);
            exams.push(`GMAT: ${verbal}/${quantitative}/${analytical}`);
          }
          if (exams.length > 0) {
            profile.exams = exams.join(", ");
            infoProvided.push("exam scores");
            completenessScore++;
          }
        }
        
        // 💼 WORK EXPERIENCE - Complete data
        if (profileData.workExperience) {
          profile.experience = `${profileData.workExperience.years || "Not specified"} years of experience`;
          if (profileData.workExperience.company) profile.experience += ` at ${profileData.workExperience.company}`;
          if (profileData.workExperience.position) profile.experience += ` as ${profileData.workExperience.position}`;
          infoProvided.push("work experience");
          completenessScore++;
        }
        
        // 📄 APPLICATION STATUS - Complete data
        const applicationStatus = [];
        if (profileData.applicationReadiness) {
          if (profileData.applicationReadiness.sop) applicationStatus.push("SOP");
          if (profileData.applicationReadiness.lor) applicationStatus.push("LOR");
          if (profileData.applicationReadiness.resume) applicationStatus.push("Resume");
          if (profileData.applicationReadiness.transcripts) applicationStatus.push("Transcripts");
        }
        profile.applications = applicationStatus.length > 0 ? applicationStatus.join(', ') : "Not provided";
        if (applicationStatus.length > 0) infoProvided.push("application materials");
        
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
    console.log("User message:", message);
    console.log("User profile data:", profile);
    console.log("Profile data from DB:", profileData);
    console.log("User stage:", user.stage);
    
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
      
      // OVERRIDE: If user explicitly asks to lock a university, let AI handle it naturally
      // Remove hardcoded university logic - AI should provide dynamic recommendations
      
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
      console.error("JSON parsing failed:", parseError.message);
      console.error("Raw AI response:", aiText);
      
      // Try to extract JSON from malformed response
      let extractedJson = null;
      
      // Look for JSON object in the response
      const jsonMatch = aiText.match(/\{[^{}]*"action"[^{}]*\}/);
      if (jsonMatch) {
        try {
          extractedJson = JSON.parse(jsonMatch[0]);
          console.log("Extracted JSON from malformed response:", extractedJson);
        } catch (extractError) {
          console.error("Failed to extract JSON:", extractError.message);
        }
      }
      
      // If we have extracted JSON, use it; otherwise create fallback
      if (extractedJson) {
        parsed = extractedJson;
      } else {
        // If JSON parsing fails, create a structured response from the text
        const fallbackResponse = generateFallbackAIResponse(context, aiText);
        parsed = fallbackResponse;
        console.log("Using fallback response due to JSON parsing failure");
      }
    }

    // Validate and ensure required fields exist
    if (!parsed.message) parsed.message = "I'm here to help with your study abroad journey.";
    if (!parsed.profileAssessment) {
      parsed.profileAssessment = {
        academics: "Average",
        internships: "None", 
        readiness: "Medium"
      };
    }
    if (!parsed.collegeRecommendations) parsed.collegeRecommendations = [];
    if (!parsed.action) parsed.action = "NONE";
    if (!parsed.autoShortlisted) parsed.autoShortlisted = [];

    // Force explicit lock requests
    const isLockRequest = typeof message === "string" && /\block\b/i.test(message);
    if (isLockRequest) {
      const lockMatch = message.match(/\block\b\s+(.*)$/i);
      const lockTarget = lockMatch && lockMatch[1] ? lockMatch[1].trim() : null;
      if (lockTarget) {
        parsed.action = "LOCK_UNIVERSITY";
        parsed.universityName = lockTarget;
      }
    }

    // Force recommendations when user explicitly asks for universities
    const isRecommendationRequest = typeof message === "string" && /recommend|suggest|universit|college|collage/i.test(message);
    if (!isLockRequest && isRecommendationRequest && parsed.collegeRecommendations.length === 0) {
      const availableUniversities = await University.find({}, "name rank location programs").sort({ rank: 1 }).limit(20);
      if (availableUniversities.length > 0) {
        const topFive = availableUniversities.slice(0, 5);
        parsed.collegeRecommendations = topFive.map((uni, index) => {
          let category = "TARGET";
          if (index === 0 || (uni.rank && uni.rank <= 20)) category = "DREAM";
          if (uni.rank && uni.rank > 50) category = "SAFE";
          return {
            name: uni.name,
            category,
            fitExplanation: "Selected based on program strength and profile fit.",
            riskFactors: ["Competitive admissions"],
            programs: Array.isArray(uni.programs) ? uni.programs : []
          };
        });
        parsed.autoShortlisted = parsed.collegeRecommendations.map(rec => ({
          name: rec.name,
          category: rec.category
        }));
        parsed.action = "AUTO_SHORTLIST_MULTIPLE";
        parsed.message = "Here are university recommendations tailored to your profile. I've also shortlisted them for you.";
      }
    }

    // Clean the message field to remove JSON artifacts
    if (typeof parsed.message === 'string') {
      // More aggressive cleaning for malformed JSON
      parsed.message = parsed.message
        .replace(/^[,\s"]*/, '') // Remove leading commas, quotes, spaces
        .replace(/[,\s"]*$/, '') // Remove trailing commas, quotes, spaces
        .replace(/,"[^"]*":/g, '') // Remove incomplete JSON fields
        .replace(/:\s*[,}]/g, '') // Remove empty values before commas or braces
        .replace(/\{[^}]*\}/g, '') // Remove any remaining JSON objects
        .replace(/"[^"]*":\s*"[^"]*"/g, '') // Remove key-value pairs
        .replace(/"[^"]*":\s*[^,}]*[,}]/g, '') // Remove key-value pairs with non-string values
        .replace(/^\s*\{|\}\s*$/g, '') // Remove braces at start/end
        .replace(/,\s*}/g, '}') // Remove trailing commas before closing brace
        .replace(/,\s*,/g, ',') // Remove double commas
        .trim();
      
      // If the message is still malformed or too short, provide a default
      if (!parsed.message || parsed.message.length < 15 || parsed.message.includes(':') || parsed.message.includes('"')) {
        parsed.message = "I'm here to help with your study abroad journey. Based on your profile, I can provide personalized guidance and recommendations.";
      }
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
    let aiMessage = parsed.message || parsed.response || "AI response processed";
    
    // Clean up the message to remove any JSON artifacts
    if (typeof aiMessage === 'string') {
      // More aggressive cleaning for malformed JSON
      aiMessage = aiMessage
        .replace(/^[,\s"]*/, '') // Remove leading commas, quotes, spaces
        .replace(/[,\s"]*$/, '') // Remove trailing commas, quotes, spaces
        .replace(/,"[^"]*":/g, '') // Remove incomplete JSON fields
        .replace(/:\s*[,}]/g, '') // Remove empty values before commas or braces
        .replace(/\{[^}]*\}/g, '') // Remove any remaining JSON objects
        .replace(/"[^"]*":\s*"[^"]*"/g, '') // Remove key-value pairs
        .replace(/"[^"]*":\s*[^,}]*[,}]/g, '') // Remove key-value pairs with non-string values
        .replace(/^\s*\{|\}\s*$/g, '') // Remove braces at start/end
        .replace(/,\s*}/g, '}') // Remove trailing commas before closing brace
        .replace(/,\s*,/g, ',') // Remove double commas
        .trim();
      
      // If the message is still malformed or too short, provide a default
      if (!aiMessage || aiMessage.length < 15 || aiMessage.includes(':') || aiMessage.includes('"')) {
        aiMessage = "I'm here to help with your study abroad journey. Based on your profile, I can provide personalized guidance and recommendations.";
      }
    }
    
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
      console.log("Conversation saved successfully for user:", req.user._id);
      console.log("Total messages in conversation:", conversation.messages.length);
    } catch (saveError) {
      console.error("Error saving conversation:", saveError);
      // Don't fail the entire request if conversation save fails
      // Just log the error and continue
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
        console.log("=== HANDLING AI ACTION ===");
        console.log("Action:", parsed.action);
        console.log("Task data:", parsed.task);
        console.log("TaskCreated data:", parsed.taskCreated);
        
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
              let university = await University.findOne({ name: uniData.name });
              console.log(`Processing ${uniData.name}:`, university ? "Found" : "Not found");
              
              // If university doesn't exist, create it
              if (!university) {
                console.log(`Creating new university: ${uniData.name}`);
                
                // Determine rank based on category
                let rank = 100; // Default rank
                if (uniData.category === "DREAM") {
                  rank = Math.floor(Math.random() * 20) + 1; // 1-20 for dream
                } else if (uniData.category === "TARGET") {
                  rank = Math.floor(Math.random() * 30) + 21; // 21-50 for target
                } else {
                  rank = Math.floor(Math.random() * 50) + 51; // 51-100 for safe
                }
                
                // Determine location based on university name patterns
                let location = "United States";
                let description = `A leading ${uniData.category.toLowerCase()} university offering excellent programs in various fields.`;
                
                if (uniData.name.includes("UK") || uniData.name.includes("Oxford") || uniData.name.includes("Cambridge") || uniData.name.includes("London") || uniData.name.includes("Edinburgh")) {
                  location = "United Kingdom";
                } else if (uniData.name.includes("Canada") || uniData.name.includes("Toronto") || uniData.name.includes("Waterloo") || uniData.name.includes("McGill")) {
                  location = "Canada";
                } else if (uniData.name.includes("Australia") || uniData.name.includes("Melbourne") || uniData.name.includes("Sydney")) {
                  location = "Australia";
                } else if (uniData.name.includes("Europe") || uniData.name.includes("Zurich") || uniData.name.includes("Munich")) {
                  location = "Europe";
                }
                
                university = new University({
                  name: uniData.name,
                  location: location,
                  description: description,
                  rank: rank,
                  image: `https://via.placeholder.com/400x300?text=${encodeURIComponent(uniData.name)}`,
                  programs: ["Computer Science", "Engineering", "Business", "Data Science"],
                  tuition: {
                    domestic: "$30,000 - $50,000",
                    international: "$40,000 - $60,000"
                  },
                  requirements: {
                    gpa: "3.0+",
                    english: "IELTS 6.5+ / TOEFL 90+"
                  }
                });
                
                await university.save();
                console.log(`Created university: ${university.name} with ID: ${university._id}`);
              }
              
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

                // Always create a task for shortlisted universities
                console.log("=== CREATING AUTO TASK FOR SHORTLIST ===");
                const shortlistNames = shortlistedResults.map(item => item.name).join(", ");
                const newTask = new Task({
                  userId: req.user._id,
                  title: "Review and compare shortlisted universities",
                  description: `Evaluate your shortlisted universities: ${shortlistNames}. Focus on program fit, tuition, location, and admission requirements.`,
                  status: "NOT_STARTED",
                  priority: "HIGH",
                  category: "APPLICATION",
                  relatedStage: user.stage,
                  createdBy: "AI"
                });
                await newTask.save();
                parsed.taskCreated = {
                  taskId: newTask._id,
                  title: newTask.title
                };
                console.log("Auto-created task for shortlist review:", newTask.title);
                console.log("TaskCreated object set in response:", parsed.taskCreated);
              }
          }
        }

        if (parsed.action === "SHORTLIST_UNIVERSITY" && parsed.universityName) {
          console.log("=== SHORTLIST UNIVERSITY ACTION ===");
          console.log("University name from AI:", parsed.universityName);
          
          // Find university by name (case-insensitive)
          const university = await University.findOne({
            name: { $regex: new RegExp(parsed.universityName, "i") }
          });
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
          const university = await University.findOne({
            name: { $regex: new RegExp(parsed.universityName, "i") }
          });
          if (university) {
            const profile = await Profile.findOne({ userId: req.user._id });
            if (profile) {
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
              // Override message with lock confirmation
              parsed.message = `I've successfully locked ${university.name} as your chosen university. You can now proceed with your application preparation.`;
            }
          }
        }
      } catch (actionError) {
        console.error("Error processing AI action:", actionError);
        // Continue without actions if there's an error
      }
    }

    console.log("=== FINAL RESPONSE BEING SENT ===");
    console.log("Action:", response.action);
    console.log("TaskCreated:", response.taskCreated);
    console.log("AutoShortlistedResults:", response.autoShortlistedResults);
    
    res.json(response);
  } catch (error) {
    console.error("AI Counsellor Error:", error);
    return res.status(500).json({
      message: "I'm experiencing technical difficulties. Please try again.",
      error: "AI service temporarily unavailable",
      profileAssessment: {
        academics: "Average",
        internships: "None",
        readiness: "Medium"
      },
      collegeRecommendations: [],
      action: "NONE",
      task: null,
      autoShortlisted: []
    });
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
    universityName: null,
    autoShortlisted: []
  };
}

function generateContextualResponse(context) {
  const { userName, userStage, profile, userMessage } = context;
  
  if (userMessage.toLowerCase().includes("hello") || userMessage.toLowerCase().includes("hi")) {
    return `Hello ${userName}! I'm your AI study abroad counsellor. How can I help you today?`;
  }
  
  if (userMessage.toLowerCase().includes("profile")) {
    return `Based on your profile, I can see you have ${profile.academic}. Let me help you improve your profile for better university admissions.`;
  }
  
  if (userMessage.toLowerCase().includes("university") || userMessage.toLowerCase().includes("college")) {
    return "I can help you find the perfect universities! Let me analyze your profile and recommend the best options for you.";
  }
  
  return "I'm here to help you with your study abroad journey. What would you like to know about?";
}

function generateCollegeRecommendations(profile, shortlistedUniversities) {
  // Return empty array - AI should provide dynamic recommendations
  // This function should only be used as fallback when AI completely fails
  return [];
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
