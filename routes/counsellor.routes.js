import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { aiCounsellor } from "../controllers/counsellor.controller.js";

const router = express.Router();

router.post("/", isAuth, aiCounsellor);

export default router;