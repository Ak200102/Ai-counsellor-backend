import User from "../models/user.model.js";
import University from "../models/university.model.js";

// Get platform-wide statistics
const getPlatformStats = async (req, res) => {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();
    
    // Get total universities count
    const totalUniversities = await University.countDocuments();
    
    // Get unique countries from universities
    const universities = await University.find({}, 'location.country');
    const countries = new Set(universities.map(u => u.location?.country).filter(Boolean));
    const countriesCovered = countries.size;
    
    // Calculate success rate (users who completed onboarding vs total users)
    const usersCompletedOnboarding = await User.countDocuments({ onboardingCompleted: true });
    const successRate = totalUsers > 0 ? Math.round((usersCompletedOnboarding / totalUsers) * 100) : 0;
    
    // Get additional stats
    const activeUsers = await User.countDocuments({ 
      createdAt: { 
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    });
    
    const usersWithLockedUniversity = await User.countDocuments({ 
      'profile.lockedUniversity': { $exists: true }
    });
    
    const totalApplications = await User.aggregate([
      { $match: { 'profile.lockedUniversity': { $exists: true } } },
      { $count: 'applications' }
    ]).then(result => result[0]?.applications || 0);
    
    res.json({
      totalUsers,
      totalUniversities,
      countriesCovered,
      successRate,
      activeUsers,
      usersWithLockedUniversity,
      totalApplications,
      usersCompletedOnboarding
    });
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    res.status(500).json({ message: 'Failed to fetch platform statistics' });
  }
};

// Get real-time activity feed
const getActivityFeed = async (req, res) => {
  try {
    // Get recent user activities
    const recentUsers = await User.find({ onboardingCompleted: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name createdAt profile.lockedUniversity profile.shortlistedUniversities');
    
    const activities = recentUsers.map(user => {
      const activity = {
        userName: user.name,
        timestamp: user.createdAt,
        type: 'joined'
      };
      
      if (user.profile?.lockedUniversity) {
        activity.type = 'locked_university';
        activity.details = user.profile.lockedUniversity.universityId?.name || 'University';
      }
      
      if (user.profile?.shortlistedUniversities?.length > 0) {
        activity.type = 'shortlisted_universities';
        activity.details = `${user.profile.shortlistedUniversities.length} universities`;
      }
      
      return activity;
    });
    
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    res.status(500).json({ message: 'Failed to fetch activity feed' });
  }
};

export {
  getPlatformStats,
  getActivityFeed
};
