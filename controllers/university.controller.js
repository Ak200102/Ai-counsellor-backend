import University from "../models/university.model.js";
import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";

// Get all universities with filtering and recommendation
export const getUniversities = async (req, res) => {
  try {
    const { country, budget, gpa, field } = req.query;
    
    let user = null;
    let profile = null;
    
    // Only try to get user/profile if authenticated
    if (req.user) {
      user = await User.findById(req.user._id);
      profile = await Profile.findOne({ userId: req.user._id });
    }

    let query = { isActive: true };

    // Apply filters
    if (country) query.country = country;
    if (field) query.program = { $regex: field, $options: "i" };

    const universities = await University.find(query);

    // Categorize and score universities based on user profile (only if authenticated)
    const categorized = universities.map(uni => {
      let result = {
        ...uni.toObject(),
        category: uni.universityType?.toUpperCase(),
        universityType: uni.universityType,
        isShortlisted: false,
        shortlistCategory: null,
        isLocked: false,
        acceptanceChance: "Unknown",
        fitScore: 50,
        matchReason: "Login to see personalized recommendations",
        recommendation: "🎓 Complete your profile to get personalized recommendations"
      };

      // Only add personalized data if user is authenticated
      if (profile) {
        // Check if shortlisted or locked
        const shortlistEntry = profile?.shortlistedUniversities?.find(
          s => s.universityId?.toString() === uni._id.toString()
        );
        const isShortlisted = !!shortlistEntry;
        const shortlistCategory = shortlistEntry?.category;
        const isLocked = profile?.lockedUniversity?.universityId?.toString() === uni._id.toString();

        // Calculate acceptance chance and fit score
        const { acceptanceChance, fitScore, matchReason } = calculateFitScore(uni, profile);

        result = {
          ...result,
          isShortlisted,
          shortlistCategory,
          isLocked,
          acceptanceChance,
          fitScore,
          matchReason,
          recommendation: getRecommendationText(uni, profile, acceptanceChance)
        };
      }

      return result;
    });

    // Sort by fit score (best matches first) - only if authenticated
    const sorted = profile ? 
      categorized.sort((a, b) => b.fitScore - a.fitScore) : 
      categorized.sort((a, b) => (a.ranking || 999) - (b.ranking || 999));

    // Apply budget filter if specified
    let filtered = sorted;
    if (budget) {
      const budgetMap = { low: 15000, medium: 45000, high: 100000 };
      const maxBudget = budgetMap[budget.toLowerCase()] || 100000;
      filtered = sorted.filter(uni => uni.tuitionFeePerYear <= maxBudget);
    }

    const response = {
      total: filtered.length,
      universities: filtered,
    };

    // Only add profile-specific data if authenticated
    if (profile) {
      response.profileStrength = calculateProfileStrength(profile);
      response.recommendedCount = filtered.filter(u => u.acceptanceChance === "High").length;
    }

    res.json(response);
  } catch (error) {
    console.error("Get universities error:", error);
    res.status(500).json({ message: "Failed to fetch universities" });
  }
};

// Calculate how well a university fits the user's profile
const calculateFitScore = (university, profile) => {
  if (!profile) {
    return { acceptanceChance: "Unknown", fitScore: 50, matchReason: "Complete profile to see fit" };
  }

  let score = 0;
  let reasons = [];

  // GPA matching (30 points max)
  if (profile.academic?.gpa) {
    const userGPA = parseFloat(profile.academic.gpa);
    const minGPA = university.requirements?.minGPA || 3.0;
    if (userGPA >= minGPA) {
      score += 30;
      reasons.push("GPA matches requirements");
    } else if (userGPA >= minGPA - 0.3) {
      score += 20;
      reasons.push("GPA slightly below requirement");
    } else {
      reasons.push("GPA below requirement");
    }
  }

  // Exam scores (25 points max)
  if (profile.exams?.ielts?.score) {
    const userIELTS = profile.exams.ielts.score;
    const minIELTS = university.requirements?.ielts || 80;
    if (userIELTS >= minIELTS) {
      score += 25;
      reasons.push("IELTS meets requirement");
    } else if (userIELTS >= minIELTS - 5) {
      score += 15;
      reasons.push("IELTS slightly below");
    }
  }

  if (profile.exams?.gre?.score) {
    const userGRE = profile.exams.gre.score;
    const minGRE = university.requirements?.gre || 300;
    if (userGRE >= minGRE) {
      score += 15;
      reasons.push("GRE meets requirement");
    }
  }

  // Budget matching (20 points max)
  if (profile.budget?.range) {
    const budgetMap = { "0-30K": 15000, "30-50K": 40000, "50-100K": 75000, "100K+": 150000 };
    const maxBudget = budgetMap[profile.budget.range] || 100000;
    if (university.tuitionFeePerYear <= maxBudget) {
      score += 20;
      reasons.push("Fits budget");
    } else {
      reasons.push("Above budget");
    }
  }

  // Internship/Career interests (10 points)
  if (profile.internships?.length > 0 || profile.projects?.length > 0) {
    if (university.internshipOpportunities === "Very High") {
      score += 10;
      reasons.push("Great for career growth");
    }
  }

  // Country preference (bonus 5 points)
  if (profile.studyGoal?.countries?.includes(university.country)) {
    score += 5;
    reasons.push("Matches country preference");
  }

  // Determine acceptance chance
  let acceptanceChance = "Low";
  if (score >= 80) acceptanceChance = "High";
  else if (score >= 60) acceptanceChance = "Medium";

  return {
    acceptanceChance,
    fitScore: Math.min(score, 100),
    matchReason: reasons.length > 0 ? reasons[0] : "Profile incomplete"
  };
};

// Calculate profile completion strength
const calculateProfileStrength = (profile) => {
  if (!profile) return { overall: "Incomplete", percentage: 0 };

  let completed = 0;
  let total = 6;

  if (profile.academic?.gpa && profile.academic?.major) completed++;
  if (profile.exams?.ielts?.score || profile.exams?.gre?.score) completed++;
  if (profile.studyGoal?.degree && profile.studyGoal?.field) completed++;
  if (profile.budget?.range) completed++;
  if (profile.internships?.length > 0 || profile.projects?.length > 0) completed++;
  if (profile.shortlistedUniversities?.length > 0) completed++;

  const percentage = Math.round((completed / total) * 100);
  let overall = "Weak";
  if (percentage >= 80) overall = "Strong";
  else if (percentage >= 50) overall = "Moderate";

  return { overall, percentage, completed, total };
};

// Generate recommendation text
const getRecommendationText = (university, profile, acceptanceChance) => {
  if (acceptanceChance === "High") {
    return `✅ Strong fit! ${university.name} aligns well with your profile.`;
  } else if (acceptanceChance === "Medium") {
    return `⚠️ Good option. Competitive but achievable with focused preparation.`;
  } else {
    return `📌 Reach goal. Work on exams/GPA for better chances.`;
  }
};

export const shortlistUniversity = async (req, res) => {
  try {
    console.log('=== SHORTLIST REQUEST START ===');
    console.log('Request body:', req.body);
    console.log('User authenticated:', req.user ? 'Yes' : 'No');
    console.log('User ID:', req.user?._id);
    
    const { universityId, universityName } = req.body;
    console.log('University ID:', universityId);
    console.log('University Name:', universityName);
    
    if (!req.user) {
      console.log('ERROR: User not authenticated');
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    const user = await User.findById(req.user._id);
    const profile = await Profile.findOne({ userId: req.user._id });
    
    console.log('User found:', user ? 'Yes' : 'No');
    console.log('Profile found:', profile ? 'Yes' : 'No');
    
    let university;
    
    // Handle both universityId and universityName
    if (universityId) {
      university = await University.findById(universityId);
      console.log('Found by ID:', university ? 'Yes' : 'No');
    } else if (universityName) {
      // Try exact match first
      university = await University.findOne({ name: universityName });
      console.log('Exact match found:', university ? 'Yes' : 'No');
      
      // If not found, try partial match
      if (!university) {
        university = await University.findOne({ 
          name: { $regex: new RegExp(universityName, 'i') }
        });
        console.log('Partial match found:', university ? 'Yes' : 'No');
      }
      
      // If still not found, try matching key parts
      if (!university) {
        const nameParts = universityName.split(' ');
        if (nameParts.length > 1) {
          // Try matching main parts like "MIT", "Carnegie Mellon", "Berkeley"
          const mainPart = nameParts.find(part => 
            part.includes('MIT') || 
            part.includes('Carnegie') || 
            part.includes('Berkeley') ||
            part.includes('Stanford') ||
            part.includes('Harvard')
          );
          if (mainPart) {
            university = await University.findOne({ 
              name: { $regex: new RegExp(mainPart, 'i') }
            });
            console.log('Key part match found:', university ? 'Yes' : 'No');
          }
        }
      }
      
      // If still not found, list available universities for debugging
      if (!university) {
        const availableUniversities = await University.find({}).select('name').limit(5);
        console.log('Available universities:', availableUniversities.map(u => u.name));
      }
    } else {
      console.log('ERROR: No university ID or name provided');
      return res.status(400).json({ message: "University ID or name is required" });
    }

    if (!university) {
      console.log('University not found in database, adding to wishlist...');
      
      // Add to wishlist for universities not in database
      if (!profile.wishlistUniversities) profile.wishlistUniversities = [];
      
      // Check if already in wishlist
      const alreadyInWishlist = profile.wishlistUniversities.some(
        w => w.name === universityName
      );
      
      if (alreadyInWishlist) {
        return res.json({
          message: `${universityName} is already in your wishlist`,
          wishlistCount: profile.wishlistUniversities.length,
          inWishlist: true
        });
      }
      
      // Add to wishlist
      profile.wishlistUniversities.push({
        name: universityName,
        addedAt: new Date()
      });
      
      await profile.save();
      
      return res.json({
        message: `${universityName} added to wishlist (not in database)`,
        wishlistCount: profile.wishlistUniversities.length,
        inWishlist: true
      });
    }

    // Check if already shortlisted
    const alreadyShortlisted = profile?.shortlistedUniversities?.some(
      s => s.universityId?.toString() === university._id.toString()
    );

    if (alreadyShortlisted) {
      console.log('University already shortlisted, returning success');
      return res.json({
        message: `${university.name} is already in your shortlist`,
        shortlistedCount: profile.shortlistedUniversities.length,
        alreadyShortlisted: true
      });
    }

    console.log('Adding university to shortlist...');
    
    // Add to profile's shortlist
    if (!profile.shortlistedUniversities) profile.shortlistedUniversities = [];
    profile.shortlistedUniversities.push({
      universityId: university._id,
      shortlistedAt: new Date()
    });

    console.log('Saving profile...');
    await profile.save();
    console.log('Profile saved successfully');

    console.log('=== SHORTLIST SUCCESS ===');
    res.json({
      message: `${university.name} added to shortlist as ${university.universityType || 'University'}`,
      shortlistedCount: profile.shortlistedUniversities.length
    });
  } catch (error) {
    console.error('=== SHORTLIST ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    res.status(500).json({ message: "Failed to shortlist university", error: error.message });
  }
};

export const removeFromShortlist = async (req, res) => {
  try {
    const { universityId } = req.params;
    const profile = await Profile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Remove from shortlist
    profile.shortlistedUniversities = profile.shortlistedUniversities.filter(
      s => s.universityId?.toString() !== universityId
    );

    await profile.save();

    res.json({
      message: "Removed from shortlist",
      shortlistedCount: profile.shortlistedUniversities.length
    });
  } catch (error) {
    console.error("Remove shortlist error:", error);
    res.status(500).json({ message: "Failed to remove from shortlist" });
  }
};

export const getShortlistedUniversities = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id }).populate(
      "shortlistedUniversities.universityId"
    );

    if (!profile || !profile.shortlistedUniversities.length) {
      return res.json({ universities: [], total: 0 });
    }

    const universities = profile.shortlistedUniversities.map(entry => ({
      ...entry.universityId.toObject(),
      shortlistCategory: entry.category,
      addedAt: entry.addedAt
    }));

    // Group by category
    const grouped = {
      Dream: universities.filter(u => u.shortlistCategory === "Dream"),
      Target: universities.filter(u => u.shortlistCategory === "Target"),
      Safe: universities.filter(u => u.shortlistCategory === "Safe")
    };

    res.json({
      universities,
      grouped,
      total: universities.length,
      summary: {
        dream: grouped.Dream.length,
        target: grouped.Target.length,
        safe: grouped.Safe.length
      }
    });
  } catch (error) {
    console.error("Get shortlisted error:", error);
    res.status(500).json({ message: "Failed to fetch shortlisted universities" });
  }
};

export const getUniversityById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get university first
    const university = await University.findById(id);
    
    if (!university) {
      return res.status(404).json({ message: "University not found" });
    }

    // Check if user is authenticated
    let user = null;
    let profile = null;
    let isShortlisted = false;
    let shortlistCategory = null;
    let isLocked = false;
    let acceptanceChance = null;
    let fitScore = null;
    let matchReason = null;
    let recommendation = null;

    if (req.user) {
      console.log("User is authenticated:", req.user._id);
      user = await User.findById(req.user._id);
      profile = await Profile.findOne({ userId: req.user._id });
      console.log("User profile found:", profile);
      
      // Check if shortlisted or locked
      const shortlistEntry = profile?.shortlistedUniversities?.find(
        s => s.universityId?.toString() === university._id.toString()
      );
      isShortlisted = !!shortlistEntry;
      shortlistCategory = shortlistEntry?.category;
      isLocked = profile?.lockedUniversity?.universityId?.toString() === university._id.toString();

      // Calculate acceptance chance and fit score
      console.log("Calculating acceptance chance for university:", university._id);
      console.log("Profile data for calculation:", profile);
      const acceptanceData = calculateFitScore(university, profile);
      console.log("Acceptance data calculated:", acceptanceData);
      acceptanceChance = acceptanceData.acceptanceChance;
      fitScore = acceptanceData.fitScore;
      matchReason = acceptanceData.matchReason;
      recommendation = getRecommendationText(university, profile, acceptanceChance);
      
      console.log("Final acceptance chance:", acceptanceChance);
    } else {
      console.log("User is not authenticated");
    }

    const universityData = {
      ...university.toObject(),
      category: university.universityType?.toUpperCase(),
      universityType: university.universityType,
      isShortlisted,
      shortlistCategory,
      isLocked,
      acceptanceChance,
      fitScore,
      matchReason,
      recommendation
    };

    res.json(universityData);
  } catch (error) {
    console.error("Get university error:", error);
    res.status(500).json({ message: "Failed to fetch university details" });
  }
};

export const lockUniversity = async (req, res) => {
  try {
    const { universityId, universityName } = req.body;
    console.log('=== LOCK UNIVERSITY REQUEST ===');
    console.log('University ID:', universityId);
    console.log('University Name:', universityName);
    
    const profile = await Profile.findOne({ userId: req.user._id });
    const user = await User.findById(req.user._id);
    
    let university;
    
    // Handle both universityId and universityName
    if (universityId) {
      university = await University.findById(universityId);
      console.log('Found by ID:', university ? 'Yes' : 'No');
    } else if (universityName) {
      // Try exact match first
      university = await University.findOne({ name: universityName });
      console.log('Exact match found:', university ? 'Yes' : 'No');
      
      // If not found, try partial match
      if (!university) {
        university = await University.findOne({ 
          name: { $regex: new RegExp(universityName, 'i') }
        });
        console.log('Partial match found:', university ? 'Yes' : 'No');
      }
      
      // If still not found, try matching key parts
      if (!university) {
        const nameParts = universityName.split(' ');
        if (nameParts.length > 1) {
          const mainPart = nameParts.find(part => 
            part.includes('MIT') || 
            part.includes('Carnegie') || 
            part.includes('Berkeley') ||
            part.includes('Stanford') ||
            part.includes('Harvard')
          );
          if (mainPart) {
            university = await University.findOne({ 
              name: { $regex: new RegExp(mainPart, 'i') }
            });
            console.log('Key part match found:', university ? 'Yes' : 'No');
          }
        }
      }
    }

    if (!university) {
      console.log('University not found for locking, adding to wishlist...');
      
      // Add to wishlist for universities not in database
      if (!profile.wishlistUniversities) profile.wishlistUniversities = [];
      
      // Check if already in wishlist
      const alreadyInWishlist = profile.wishlistUniversities.some(
        w => w.name === universityName
      );
      
      if (alreadyInWishlist) {
        return res.json({
          message: `${universityName} is already in your wishlist (cannot lock - not in database)`,
          wishlistCount: profile.wishlistUniversities.length,
          inWishlist: true,
          cannotLock: true
        });
      }
      
      // Add to wishlist
      profile.wishlistUniversities.push({
        name: universityName,
        addedAt: new Date(),
        locked: true
      });
      
      await profile.save();
      
      return res.json({
        message: `${universityName} added to wishlist (cannot lock - not in database)`,
        wishlistCount: profile.wishlistUniversities.length,
        inWishlist: true,
        cannotLock: true
      });
    }

    // Check if shortlisted
    const isShortlisted = profile?.shortlistedUniversities?.some(
      s => s.universityId?.toString() === university._id.toString()
    );

    if (!isShortlisted) {
      return res.status(400).json({
        message: "Please shortlist the university first",
        requirement: "Must have 3+ shortlisted universities before locking"
      });
    }

    // Check if minimum shortlist requirement met
    if (profile.shortlistedUniversities.length < 3) {
      return res.status(400).json({
        message: `Please shortlist at least 3 universities first (Currently: ${profile.shortlistedUniversities.length})`,
        needed: 3 - profile.shortlistedUniversities.length
      });
    }

    // Lock the university
    profile.lockedUniversity = {
      universityId,
      lockedAt: new Date()
    };

    user.stage = "PREPARING_APPLICATIONS";
    user.lockedUniversity = universityId;

    await profile.save();
    await user.save();

    res.json({
      message: `Locked ${university.name}! Your application journey begins here. 🎓`,
      lockedUniversity: {
        name: university.name,
        country: university.country,
        program: university.program,
        lockedAt: profile.lockedUniversity.lockedAt
      },
      nextSteps: [
        "Review application requirements",
        "Start writing SOP/Essays",
        "Collect recommendation letters",
        "Prepare required documents"
      ]
    });
  } catch (error) {
    console.error("Lock university error:", error);
    res.status(500).json({ message: "Failed to lock university" });
  }
};

export const unlockUniversity = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id });
    const user = await User.findById(req.user._id);

    if (!profile?.lockedUniversity?.universityId) {
      return res.status(400).json({ message: "No locked university found" });
    }

    // Unlock
    profile.lockedUniversity = null;
    user.stage = "DISCOVERING_UNIVERSITIES";
    user.lockedUniversity = null;

    await profile.save();
    await user.save();

    res.json({ message: "University unlocked. Back to exploring options." });
  } catch (error) {
    console.error("Unlock error:", error);
    res.status(500).json({ message: "Failed to unlock university" });
  }
};

export const getApplicationGuidance = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id }).populate(
      "lockedUniversity.universityId"
    );

    if (!profile?.lockedUniversity?.universityId) {
      return res.status(400).json({ message: "No locked university. Lock a university first." });
    }

    const university = profile.lockedUniversity.universityId;

    const guidance = {
      university: {
        name: university.name,
        country: university.country,
        program: university.program,
        lockedAt: profile.lockedUniversity.lockedAt
      },
      requirements: {
        academic: {
          minGPA: university.requirements?.minGPA,
          description: `Maintain GPA of ${university.requirements?.minGPA || 'N/A'} or higher`
        },
        exams: [
          {
            name: "IELTS",
            required: true,
            minScore: university.requirements?.ielts,
            why: "English proficiency requirement"
          },
          {
            name: "GRE",
            required: university.requirements?.gre ? true : false,
            minScore: university.requirements?.gre,
            why: "Graduate admission exam"
          }
        ],
        documents: [
          "Statement of Purpose (SOP)",
          `${university.requirements?.recommendationLetters || 2} Recommendation Letters`,
          "Academic Transcripts",
          "Resume/CV",
          "Passport Copy"
        ]
      },
      timeline: {
        immediate: "Complete application form and create account",
        week1: "Write draft SOP",
        week2: "Request recommendation letters",
        week3: "Gather academic documents",
        week4: "Finalize application and submit"
      },
      tips: [
        `This is a ${university.universityType} university - ${
          university.universityType === "Dream"
            ? "Highly competitive. Polish every detail."
            : university.universityType === "Target"
            ? "Competitive but achievable. Focus on clear goals."
            : "Achievable. Show genuine interest."
        }`,
        `Tuition: $${university.tuitionFeePerYear}/year`,
        `Acceptance rate suggests: ${university.competitiveness === "Extreme" ? "Very selective" : university.competitiveness === "High" ? "Selective" : "Good chances"}`,
        university.whyItFits || "Strong profile match!",
        university.risks ? `⚠️ Important: ${university.risks}` : ""
      ].filter(Boolean),
      applicationFee: "Check university website",
      whyThisUniversity: university.description,
      opportunitiesAtThisUniversity: {
        internships: university.internshipOpportunities,
        placementRate: `${university.placementRate}%`,
        avgSalaryAfterGraduation: `$${university.averageSalary}`
      }
    };

    res.json(guidance);
  } catch (error) {
    console.error("Get guidance error:", error);
    res.status(500).json({ message: "Failed to fetch application guidance" });
  }
};
