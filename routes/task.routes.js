import express from "express";
import isAuth from "../middlewares/isAuth.js";
import {
  getTasks,
  updateTaskStatus,
  completeTask,
  createTask,
  regenerateTasks
} from "../controllers/task.controller.js";

const router = express.Router();

router.post("/", isAuth, createTask);
router.get("/", isAuth, getTasks);
router.post("/regenerate", isAuth, regenerateTasks);
router.put("/:id/status", isAuth, updateTaskStatus);
router.put("/:id/complete", isAuth, completeTask);

export default router;
