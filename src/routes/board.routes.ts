import express from "express";
import * as boardController from "../controller/board.controller";
import { auth } from "../middleware";

const router = express.Router();

router.use(auth);

router.get("/organization/:organizationId", boardController.getBoards);

router.get("/:id", boardController.getBoardById);

router.post("/", boardController.createBoard);

router.put("/:id", boardController.updateBoard);

router.delete("/:id", boardController.deleteBoard);

router.post("/:boardId/columns", boardController.addColumn);

router.put("/:boardId/columns/:columnId", boardController.updateColumn);

router.delete("/:boardId/columns/:columnId", boardController.deleteColumn);

router.put("/:boardId/columns/reorder", boardController.reorderColumns);

export default router;
