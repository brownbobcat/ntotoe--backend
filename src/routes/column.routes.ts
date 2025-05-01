import express from "express";
import * as columnController from "../controller/column.controller";
import { auth } from "../middleware";

const router = express.Router();

router.use(auth);

router.get("/board/:boardId", columnController.getColumns);

router.get("/:boardId/:columnId", columnController.getColumnById);

router.post("/:boardId", columnController.createColumn);

router.put("/:boardId/:columnId", columnController.updateColumn);

router.delete("/:boardId/:columnId", columnController.deleteColumn);

router.post("/:boardId/move-task", columnController.moveTask);

export default router;
