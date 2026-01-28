const stageGuard = (requiredStage) => {
  return (req, res, next) => {
    if (req.user.stage !== requiredStage) {
      return res.status(403).json({
        message: `Blocked. Required stage: ${requiredStage}`
      });
    }
    next();
  };
};

export default stageGuard;