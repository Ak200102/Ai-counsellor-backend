import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { aiCounsellor, getConversationHistory, saveConversation, deleteConversationHistory } from "../controllers/counsellor.controller.js";

const router = express.Router();

router.post("/", isAuth, aiCounsellor);
router.get("/history", isAuth, getConversationHistory);
router.post("/save", isAuth, saveConversation);
router.delete("/history", isAuth, deleteConversationHistory);

export default router;