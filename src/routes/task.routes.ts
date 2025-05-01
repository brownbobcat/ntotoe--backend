import express from "express";
import * as taskController from "../controller/task.controller";
import { auth } from "../middleware";

const router = express.Router();

router.use(auth);

router.get("/", taskController.getTasks);

router.get("/search", taskController.searchTasks);

router.get("/:id", taskController.getTaskById);

router.post("/", taskController.createTask);

router.put("/:id", taskController.updateTask);

router.delete("/:id", taskController.deleteTask);

export default router;
