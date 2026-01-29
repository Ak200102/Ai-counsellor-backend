import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { aiCounsellor, getConversationHistory, saveConversation } from "../controllers/counsellor.controller.js";

const router = express.Router();

router.post("/", isAuth, aiCounsellor);
router.get("/history", isAuth, getConversationHistory);
router.post("/save", isAuth, saveConversation);

export default router;