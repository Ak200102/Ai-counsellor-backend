import express from 'express';
const router = express.Router();
import { getPlatformStats, getActivityFeed } from '../controllers/platform.controller.js';

// Get platform-wide statistics
router.get('/stats', getPlatformStats);

// Get real-time activity feed
router.get('/activity', getActivityFeed);

export default router;
