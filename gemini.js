// import axios from "axios";

// const geminiResponse = async (context) => {
//   try {
//     const {
//       userName = "Student",
//       userStage = "ONBOARDING",
//       profile = {},
//       shortlistedUniversities = [],
//       lockedUniversity = null,
//       userMessage = ""
//     } = context;

//     const prompt = `
// You are an AI study-abroad counsellor, created to guide students through their study-abroad journey.

// You are NOT a chatbot.
// You are a professional study-abroad counsellor.

// Your goal is to take the student from confusion → clarity → commitment.

// ────────────────────────────
// STUDENT CONTEXT
// ────────────────────────────
// Name: ${userName}
// Current Stage: ${userStage}

// Profile:
// ${JSON.stringify(profile, null, 2)}

// Shortlisted Universities:
// ${JSON.stringify(shortlistedUniversities, null, 2)}

// Locked University:
// ${JSON.stringify(lockedUniversity, null, 2)}

// Student's Question/Message:
// ${userMessage}

// ────────────────────────────
// COUNSELLOR RESPONSIBILITIES
// ────────────────────────────
// 1. Explain the student's profile strength honestly
// 2. Identify gaps clearly (exams, SOP, budget, timeline)
// 3. Guide the NEXT decision only (do not overwhelm)
// 4. Enforce discipline:
//    - No applications before locking a university
//    - No locking before reasonable shortlisting
// 5. Take ACTIONS when appropriate

// ────────────────────────────
// YOU MUST RETURN ONLY VALID JSON
// ────────────────────────────

// {
//   "message": "calm, supportive, counsellor-style guidance",
//   "profileAssessment": {
//     "academics": "Strong | Average | Weak",
//     "exams": "Not Started | In Progress | Completed",
//     "sop": "Not Started | Draft | Ready"
//   },
//   "nextFocus": "one clear thing the student should focus on now",
//   "action": "NONE | CREATE_TASK | LOCK_UNIVERSITY",
//   "task": {
//     "title": "required only if action = CREATE_TASK",
//     "reason": "why this task matters now"
//   },
//   "warning": "required only if action = LOCK_UNIVERSITY"
// }

// ────────────────────────────
// ACTION RULES (STRICT)
// ────────────────────────────
// - CREATE_TASK:
//   Use when preparation is required (SOP, exams, documents)

// - LOCK_UNIVERSITY:
//   Use ONLY if:
//   • Student has shortlisted universities
//   • Profile is reasonably aligned
//   • Locking will improve focus

// - NONE:
//   Use when explaining, assessing, or advising

// ────────────────────────────
// LANGUAGE & TONE RULES
// ────────────────────────────
// - Speak like a real human counsellor
// - Clear, confident, never robotic
// - No hype, no fluff
// - Supportive but honest

// ────────────────────────────
// ABSOLUTE RULES
// ────────────────────────────
// - Output JSON ONLY
// - No markdown
// - No explanations outside JSON
// - Never hallucinate data
// - Never skip required keys
// - If unsure → action = "NONE"

// Before responding, silently verify:
// 1. JSON validity
// 2. All required fields exist
// 3. action is valid
// 4. Advice matches the stage

// Now respond.
// `;

//     const response = await axios.post(
//       "https://openrouter.ai/api/v1/chat/completions",
//       {
//         model: "google/gemini-3-flash-preview",
//         messages: [
//           {
//             role: "user",
//             content: prompt
//           }
//         ],
//         max_tokens: 400,
//         temperature: 0.3
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
//           "Content-Type": "application/json",
//           "HTTP-Referer": "http://localhost:5173/",
//           "X-Title": "AI Counsellor"
//         }
//       }
//     );

//     return response.data.choices[0].message.content;

//   } catch (error) {
//     console.error(
//       "Gemini(OpenRouter) Error:",
//       error.response?.data || error.message
//     );
//     throw new Error("Failed to generate AI counsellor response");
//   }
// };

// export default geminiResponse;
import axios from "axios";
import University from "./models/university.model.js";

const geminiResponse = async (context) => {
  try {
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

    // Fetch all universities to get their IDs
    let universities = [];
    try {
      const universityData = await University.find({}, 'name country ranking program _id');
      universities = universityData;
    } catch (error) {
      console.error("Failed to fetch universities:", error);
    }

    // Build conversation context from history
    const conversationContext = conversationHistory.length > 0
      ? `\n────────────────────────────\nPREVIOUS CONVERSATION CONTEXT\n────────────────────────────\n` + 
        conversationHistory.map(msg => `${msg.role === 'user' ? 'Student' : 'You'}: ${msg.content}`).join('\n\n') +
        `\n────────────────────────────\n`
      : "";

    const prompt = `
You are an AI study-abroad counsellor, created to guide students through their study-abroad journey.

You are NOT a chatbot.
You are a professional study-abroad counsellor.

Your goal is to take the student from confusion → clarity → commitment.

────────────────────────────
IMPORTANT: CONVERSATION CONTINUITY
────────────────────────────
Remember the entire conversation history below. Reference previous messages to show continuity.
NEVER repeat explanations or questions from earlier in the conversation.
${conversationContext}

────────────────────────────
IMPORTANT: AVOID REPETITION
────────────────────────────
${alreadyProvidedInfo}

CRITICAL RULE: Once the student has provided information, NEVER ask for it again.
Focus on analyzing what they've given you and providing guidance on the NEXT STEPS.

────────────────────────────
STUDENT CONTEXT
────────────────────────────
Name: ${userName}
Current Stage: ${userStage}

Profile:
${JSON.stringify(profile, null, 2)}

Shortlisted Universities:
${JSON.stringify(shortlistedUniversities, null, 2)}

Locked University:
${JSON.stringify(lockedUniversity, null, 2)}

Student's Current Message:
${userMessage}

────────────────────────────
COUNSELLOR RESPONSIBILITIES
────────────────────────────
1. Reference the conversation history - show you remember what was discussed
2. Acknowledge the information already provided
3. Analyze student's profile strength honestly
4. Identify ONLY remaining gaps (don't ask for what's already provided or discussed)
5. Guide the NEXT decision only (do not overwhelm)
6. ALWAYS provide college/university recommendations based on:
   - Academic performance and GPA
   - Internship experience and projects
   - Career goals and field of study
   - Budget constraints
   - Geographic preferences
7. Enforce discipline:
   - No applications before locking a university
   - No locking before reasonable shortlisting

────────────────────────────
UNIVERSITY LOCKING RULES (CRITICAL)
────────────────────────────
When student asks to "lock [University Name]":
1. CHECK if university is already in shortlistedUniversities by matching universityId
2. IF shortlisted → Generate LOCK_UNIVERSITY action
3. IF not shortlisted → Generate SHORTLIST_UNIVERSITY action first
4. NEVER ask for additional information when student explicitly asks to lock
5. ALWAYS generate the appropriate action immediately

EXAMPLE CHECK:
- Student asks: "lock Carnegie Mellon University"
- Look for universityId: "6979264b061b38d8d1d18228" in shortlistedUniversities
- IF found → LOCK_UNIVERSITY
- IF not found → SHORTLIST_UNIVERSITY

SHORTLISTED UNIVERSITIES FORMAT:
shortlistedUniversities contains objects with:
- universityId: University ID (string)
- _id: Shortlist entry ID
- addedAt: When added

LOCK_UNIVERSITY requirements:
- University must be in shortlistedUniversities (check by universityId)
- Generate action: "LOCK_UNIVERSITY"
- Include universityName exactly as requested by student
- No additional questions or delays

UNIVERSITY ID MAPPING:
- Carnegie Mellon University: 6979264b061b38d8d1d18228
- University of Illinois Urbana-Champaign: 6979264b061b38d8d1d18215
- University of California, Los Angeles: 6979264b061b38d8d1d18216
- University of California, Berkeley: 6979264b061b38d8d1d18227
- University of Washington: 6979264b061b38d8d1d18230

────────────────────────────
COLLEGE RECOMMENDATION FOCUS (CRITICAL)
────────────────────────────
IMPORTANT: You MUST recommend colleges/universities for EVERY meaningful interaction where the student discusses their goals, profile, or interests.

When recommending colleges, consider:
1. Student's GPA and academic performance
2. Internship/project experience (if mentioned)
3. Career goals and field of study
4. Budget constraints (if mentioned)
5. Geographic preferences (if mentioned)
6. English proficiency (IELTS/TOEFL) readiness

Categorize recommendations as:
- DREAM: Elite universities (acceptance rate <15%)
- TARGET: Strong universities (acceptance rate 15-35%)
- SAFE: Accessible universities (acceptance rate >35%)

ALWAYS provide at least 3-5 specific college/university recommendations with clear reasoning.
Do NOT skip this step - college recommendations are the CORE of your role.

────────────────────────────
YOU MUST RETURN ONLY VALID JSON
────────────────────────────

{
  "message": "Acknowledge the conversation context, then provide calm, supportive, counsellor-style response. Include specific college names and recommendations in your message.",
  "profileAssessment": {
    "academics": "Strong | Average | Weak",
    "internships": "Excellent | Good | Basic | None",
    "readiness": "High | Medium | Low"
  },
  "collegeRecommendations": [
    {
      "category": "DREAM",
      "name": "Specific University Name",
      "country": "Country",
      "rank": "e.g., #1-10, #10-20",
      "field": "Primary field it's known for",
      "internshipScore": "High | Medium | Low",
      "acceptanceProbability": "High | Medium | Low",
      "reason": "2-3 sentences explaining why this specific university fits this student's profile"
    },
    {
      "category": "TARGET",
      "name": "Specific University Name",
      "country": "Country",
      "rank": "e.g., #20-50",
      "field": "Primary field it's known for",
      "internshipScore": "High | Medium | Low",
      "acceptanceProbability": "High | Medium | Low",
      "reason": "2-3 sentences explaining why this specific university fits this student's profile"
    },
    {
      "category": "SAFE",
      "name": "Specific University Name",
      "country": "Country",
      "rank": "e.g., #50-100",
      "field": "Primary field it's known for",
      "internshipScore": "High | Medium | Low",
      "acceptanceProbability": "High | Medium | Low",
      "reason": "2-3 sentences explaining why this specific university fits this student's profile"
    }
  ],
  "actionableNextSteps": [
    {
      "text": "Shortlist Carnegie Mellon University",
      "action": "SHORTLIST_UNIVERSITY",
      "universityName": "Carnegie Mellon University"
    },
    {
      "text": "Create a task for GRE preparation",
      "action": "CREATE_TASK",
      "taskTitle": "GRE Preparation Plan",
      "taskReason": "Essential for competitive university applications"
    }
  ],
  "nextSteps": ["specific action 1", "specific action 2"],
  "action": "NONE | CREATE_TASK | SHORTLIST_UNIVERSITY | LOCK_UNIVERSITY",
  "task": {
    "title": "required only if action = CREATE_TASK",
    "reason": "why this task matters now"
  },
  "universityName": "required only if action = SHORTLIST_UNIVERSITY"
}

────────────────────────────
ABSOLUTE RULES
────────────────────────────
- Output JSON ONLY
- No markdown
- No explanations outside JSON
- NEVER ask for information already provided or discussed
- ALWAYS reference previous conversation context
- Focus on actionable guidance
- Be realistic about rankings and placement
- Show continuity with previous messages

────────────────────────────
ACTION TYPES (Use for Next Steps)
────────────────────────────
1. SHORTLIST_UNIVERSITY: Shortlist a specific university
   - Include: universityName (exact name from seeded universities)
   - Example: "Shortlist MIT", "Shortlist Stanford"

2. CREATE_TASK: Create a task for the student
   - Include: taskTitle, taskReason
   - Example: "Create task for SOP writing"

3. LOCK_UNIVERSITY: Lock a shortlisted university
   - Include: universityName
   - Example: "Lock MIT as your target university"

────────────────────────────
ACTIONABLE NEXT STEPS FORMAT
────────────────────────────
For each suggested action, provide it in actionableNextSteps array with:
- text: Human-readable action description
- action: SHORTLIST_UNIVERSITY | CREATE_TASK | LOCK_UNIVERSITY
- universityName: (for SHORTLIST_UNIVERSITY and LOCK_UNIVERSITY)
- taskTitle & taskReason: (for CREATE_TASK)

This allows users to click and execute these actions directly from the chat.

Now respond.
`;

    try {
      // Using Groq API - Free tier, no credits needed
      // Groq API documentation: https://console.groq.com
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.1-8b-instant", // Fast and efficient
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1024,
          top_p: 1,
          stop: null
        },
        {
          headers: {
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 30000
        }
      );

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error("Invalid response structure from Groq API");
      }

      const content = response.data.choices[0].message.content.trim();

      // Parse AI response and add university IDs to college recommendations
      try {
        const parsedResponse = JSON.parse(content);
        
        // Add university IDs to college recommendations
        if (parsedResponse.collegeRecommendations && Array.isArray(parsedResponse.collegeRecommendations)) {
          parsedResponse.collegeRecommendations = parsedResponse.collegeRecommendations.map(college => {
            // Find matching university in database
            const matchingUniversity = universities.find(uni => 
              uni.name.toLowerCase().includes(college.name.toLowerCase()) ||
              college.name.toLowerCase().includes(uni.name.toLowerCase())
            );
            
            // Add _id if found
            if (matchingUniversity && matchingUniversity._id) {
              return {
                ...college,
                _id: matchingUniversity._id.toString()
              };
            }
            
            return college;
          });
        }

        // Return the enhanced response as JSON string
        return JSON.stringify(parsedResponse);
      } catch (parseError) {
        console.error("Failed to parse or enhance AI response:", parseError);
        // Return original content if parsing fails
        return content;
      }

    } catch (apiError) {
      console.error("Groq API Error:", {
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        message: apiError.message
      });

      if (apiError.response?.status === 429) {
        console.error("API rate limited. Please try again in a moment.");
        throw new Error("API rate limited. Please try again in a moment.");
      }

      if (apiError.response?.status === 401 || apiError.response?.status === 403) {
        console.error("Invalid or missing Groq API key. Please check your .env file.");
        throw new Error("Invalid or missing Groq API key. Please check your .env file.");
      }

      if (apiError.code === 'ECONNABORTED') {
        console.error("Request timeout. Groq API took too long to respond.");
        throw new Error("Request timeout. Groq API took too long to respond.");
      }

      // Log the full error for debugging
      console.error("Full API Error Details:", apiError);
      
      // Return a more user-friendly error
      throw new Error(`Groq API Error: ${apiError.response?.data?.error?.message || apiError.message || 'Unknown API error'}`);
    }

  } catch (error) {
    console.error("Gemini Response Error:", error.message);
    throw error;
  }
};

export default geminiResponse;


