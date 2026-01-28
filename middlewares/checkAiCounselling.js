import User from "../models/user.model.js";

const checkAiCounselling = async (req, res, next) => {
  try {
    console.log('=== CHECK AI COUNSELLING MIDDLEWARE ===');
    console.log('User ID:', req.user._id);
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      console.log('ERROR: User not found');
      return res.status(404).json({ message: "User not found" });
    }

    console.log('User found:', user.name);
    console.log('aiCounsellingCompleted:', user.aiCounsellingCompleted);

    // Allow access if user has completed AI counselling OR if field doesn't exist (legacy users)
    if (user.aiCounsellingCompleted === true || user.aiCounsellingCompleted === undefined) {
      console.log('Allowing access - AI counselling completed or legacy user');
      return next();
    }

    // If not completed, return locked status
    console.log('AI counselling NOT completed - blocking access');
    return res.status(403).json({ 
      message: "Please complete your first AI counselling session to access this feature",
      requiresAiCounselling: true,
      redirectTo: "/ai-counsellor",
      debug: {
        userId: user._id,
        aiCounsellingCompleted: user.aiCounsellingCompleted
      }
    });
  } catch (error) {
    console.error("Error checking AI counselling status:", error);
    return res.status(500).json({ message: "Failed to check counselling status" });
  }
};

export default checkAiCounselling;
