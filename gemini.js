import axios from "axios";
import University from "./models/university.model.js";

export default async function geminiResponse(context) {
  const {
    userName = "Student",
    userStage = "ONBOARDING",
    profile = {},
    shortlistedUniversities = [],
    lockedUniversity = null,
    userMessage = "",
    alreadyProvidedInfo = "",
    conversationHistory = []
  } = context;

  let universities = [];
  try {
    const universityData = await University.find({}, "name country ranking program _id");
    universities = universityData;
  } catch (error) {
    console.error("Failed to fetch universities:", error);
  }

  const conversationContext = conversationHistory.length > 0
    ? `\n────────────────────────────\nPREVIOUS CONVERSATION CONTEXT\n────────────────────────────\n${conversationHistory
        .map(msg => `${msg.role === "user" ? "Student" : "You"}: ${msg.content}`)
        .join("\n\n")}\n────────────────────────────\n`
    : "";

  const universitiesContext = universities.length > 0
    ? `\n────────────────────────────\nAVAILABLE UNIVERSITIES IN DATABASE\n────────────────────────────\n${universities
        .map(uni => `- ${uni.name} (${uni.country || "Location not specified"})${uni.ranking ? ` - Rank: ${uni.ranking}` : ""}${uni.program ? ` - Programs: ${uni.program}` : ""}`)
        .join("\n")}\n────────────────────────────\n`
    : "\nNo universities available in database.\n";

  const prompt = `
🚨🚨🚨 CRITICAL: COMPLETE JSON ONLY - NO EXCEPTIONS 🚨🚨🚨
YOU MUST respond with a SINGLE, COMPLETE, VALID JSON object.
NEVER include incomplete fields like ,"profileAssessment":, ,"collegeRecommendations":, etc.
ALL fields must have complete values or be empty arrays/null.
Your ENTIRE response must be ONE JSON object from start to finish.
NO text before or after the JSON object.
NO incomplete JSON syntax.
NO mixing natural language with JSON.

IMPORTANT: For questions about "tell me about my profile" or "what should I focus/do next", you MUST:
1. Use the actual Shortlisted Universities data provided in the context
2. Mention specific university names from the shortlisted list
3. Provide personalized guidance based on their actual profile data
4. DO NOT give generic responses like "I'm here to help with your study abroad journey"
5. Reference their specific academic details, goals, and shortlisted universities

WHEN USER ASKS FOR UNIVERSITY RECOMMENDATIONS:
- MUST provide collegeRecommendations array with exactly 5 universities
- MUST include action: "AUTO_SHORTLIST_MULTIPLE"
- MUST include autoShortlisted array with university details
- MUST use universities from the database list below when possible

WHEN USER ASKS "What should I focus on now?" or similar guidance questions:
- MUST provide personalized guidance based on their current profile and shortlisted universities
- If user has shortlisted universities, suggest reviewing and comparing them by name
- If user has pending tasks, mention completing those tasks specifically
- Reference their specific universities by name when possible
- MUST provide actionable next steps based on their actual situation
- Example: "Based on your profile, you should focus on reviewing your shortlisted universities: University of Cambridge, University of Manchester, etc."
- DO NOT trigger any auto-actions, just provide guidance
- IMPORTANT: Look at the "Shortlisted Universities" field in the context and mention those specific universities

WHEN USER ASKS "Tell me about my profile" or similar profile questions:
- MUST provide specific details from their actual profile data
- Reference their academic level, major, GPA if available
- Mention their study goals (degree, field, countries)
- Reference their budget range if provided
- Mention their shortlisted universities count and names
- Reference their current stage in the application process
- DO NOT give generic responses - use actual profile data

STUDENT CONTEXT
Name: ${userName}
Current Stage: ${userStage}
Profile: ${JSON.stringify(profile)}
Shortlisted Universities: ${JSON.stringify(shortlistedUniversities)}
Locked University: ${lockedUniversity ? JSON.stringify(lockedUniversity) : "None"}
${alreadyProvidedInfo}
${universitiesContext}
${conversationContext}
User Message: "${userMessage}"

RESPONSE FORMAT (STRICT JSON):
{
  "message": "Your complete response here",
  "profileAnalysis": {
    "academicStrength": "Exceptional|Strong|Average|Weak",
    "experienceLevel": "Extensive|Good|Basic|None",
    "profileGaps": ["gap1", "gap2"],
    "readinessScore": "High|Medium|Low",
    "nextSteps": ["step1", "step2"]
  },
  "profileAssessment": {
    "academics": "Exceptional|Strong|Average|Weak",
    "internships": "Extensive|Good|Basic|None",
    "readiness": "High|Medium|Low"
  },
  "collegeRecommendations": [
    {
      "name": "University Name",
      "category": "DREAM|TARGET|SAFE",
      "fitExplanation": "Why this university fits",
      "riskFactors": ["risk1", "risk2"],
      "programs": ["program1", "program2"]
    }
  ],
  "decisionGuidance": {
    "keyFactors": ["factor1", "factor2"],
    "tradeoffs": ["tradeoff1", "tradeoff2"],
    "recommendations": ["rec1", "rec2"]
  },
  "action": "CREATE_TASK|SHORTLIST_UNIVERSITY|LOCK_UNIVERSITY|AUTO_SHORTLIST_MULTIPLE|NONE",
  "task": {
    "title": "Task title",
    "reason": "Task reason"
  },
  "universityName": "University name if action is SHORTLIST_UNIVERSITY or LOCK_UNIVERSITY",
  "autoShortlisted": [
    {"name": "University Name", "category": "DREAM|TARGET|SAFE"}
  ]
}
`;

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2048,
        top_p: 1
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );

    const content = response.data?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Invalid response structure from Groq API");
    }

    try {
      const parsedResponse = JSON.parse(content);
      
      // Debug logging for profile/guidance questions
      if (userMessage.toLowerCase().includes("tell me about my profile") || 
          userMessage.toLowerCase().includes("what should i focus") ||
          userMessage.toLowerCase().includes("what should i do")) {
        console.log("=== PROFILE/GUIDANCE QUESTION DEBUG ===");
        console.log("User Message:", userMessage);
        console.log("Shortlisted Universities in context:", shortlistedUniversities);
        console.log("AI Response:", parsedResponse);
        console.log("AI Message:", parsedResponse.message);
      }

      if (parsedResponse.collegeRecommendations && Array.isArray(parsedResponse.collegeRecommendations)) {
        parsedResponse.collegeRecommendations = parsedResponse.collegeRecommendations.map(college => {
          const matchingUniversity = universities.find(uni =>
            uni.name.toLowerCase().includes(college.name.toLowerCase()) ||
            college.name.toLowerCase().includes(uni.name.toLowerCase())
          );
          return matchingUniversity && matchingUniversity._id
            ? { ...college, _id: matchingUniversity._id.toString() }
            : college;
        });
      }

      return JSON.stringify(parsedResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return JSON.stringify({
        message: userMessage.toLowerCase().includes("tell me about my profile") 
          ? `Based on your profile, you are a ${profile?.academic?.level || 'student'} studying ${profile?.academic?.major || 'your field'} with goals to pursue ${profile?.studyGoal?.degree || 'higher education'} in ${profile?.studyGoal?.field || 'your field'}. You have ${shortlistedUniversities?.length || 0} universities shortlisted: ${shortlistedUniversities?.map(u => u.universityId?.name || u.name || 'Unknown').join(', ') || 'None'}.`
          : userMessage.toLowerCase().includes("what should i focus") || userMessage.toLowerCase().includes("what should i do")
          ? `Based on your current progress, you should focus on reviewing your ${shortlistedUniversities?.length || 0} shortlisted universities: ${shortlistedUniversities?.map(u => u.universityId?.name || u.name || 'Unknown').join(', ') || 'None'}. ${profile?.academic?.gpa ? `With your GPA of ${profile.academic.gpa}, ` : ''}you should compare admission requirements and prepare your application materials.`
          : "I'm here to help with your study abroad journey.",
        profileAssessment: { academics: "Average", internships: "None", readiness: "Medium" },
        collegeRecommendations: [],
        decisionGuidance: null,
        action: "NONE",
        task: null,
        universityName: null,
        autoShortlisted: []
      });
    }
  } catch (apiError) {
    console.error("Groq API Error:", apiError?.response?.data || apiError.message);
    throw new Error("Failed to generate AI response.");
  }
}