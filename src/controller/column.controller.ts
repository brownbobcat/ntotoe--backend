// src/controllers/columnController.ts
import { Request, Response } from "express";
import { Board } from "../models/board";
import { Task } from "../models/task";

// Get all columns for a board
export const getColumns = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { boardId } = req.params;

    const board = await Board.findById(boardId);

    if (!board) {
      res.status(404).json({ message: "Board not found" });
      return;
    }

    // Sort columns by order
    const columns = board.columns.sort((a, b) => a.order - b.order);

    res.status(200).json(columns);
  } catch (error) {
    console.error("Error fetching columns:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

// Get column by ID
export const getColumnById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { boardId, columnId } = req.params;

    const board = await Board.findById(boardId);

    if (!board) {
      res.status(404).json({ message: "Board not found" });
      return;
    }

    const column = board.columns.id(columnId);

    if (!column) {
      res.status(404).json({ message: "Column not found" });
      return;
    }

    res.status(200).json(column);
  } catch (error) {
    console.error("Error fetching column:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

// Create column
export const createColumn = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { boardId } = req.params;
    const { name } = req.body;

    const board = await Board.findById(boardId);

    if (!board) {
      res.status(404).json({ message: "Board not found" });
      return;
    }

    // Get the highest order value
    const maxOrder = board.columns.reduce(
      (max, column) => Math.max(max, column.order),
      -1
    );

    // Create new column
    const newColumn = {
      name,
      tasks: [],
      order: maxOrder + 1,
    };

    // Add column to board
    board.columns.push(newColumn);
    await board.save();

    res.status(201).json(newColumn);
  } catch (error) {
    console.error("Error creating column:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

// Update column
export const updateColumn = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { boardId, columnId } = req.params;
    const { name, order } = req.body;

    const board = await Board.findById(boardId);

    if (!board) {
      res.status(404).json({ message: "Board not found" });
      return;
    }

    const column = board.columns.id(columnId);

    if (!column) {
      res.status(404).json({ message: "Column not found" });
      return;
    }

    // Update column properties
    if (name !== undefined) column.name = name;
    if (order !== undefined && order !== column.order) {
      // Handle reordering
      const oldOrder = column.order;
      column.order = order;

      // Adjust order of other columns
      board.columns.forEach((col) => {
        if (col._id.toString() !== columnId) {
          if (oldOrder < order && col.order > oldOrder && col.order <= order) {
            col.order -= 1;
          } else if (
            oldOrder > order &&
            col.order < oldOrder &&
            col.order >= order
          ) {
            col.order += 1;
          }
        }
      });
    }

    await board.save();

    res.status(200).json(column);
  } catch (error) {
    console.error("Error updating column:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

// Delete column
export const deleteColumn = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { boardId, columnId } = req.params;

    const board = await Board.findById(boardId);

    if (!board) {
      res.status(404).json({ message: "Board not found" });
      return;
    }

    const column = board.columns.id(columnId);

    if (!column) {
      res.status(404).json({ message: "Column not found" });
      return;
    }

    // Check if column has tasks
    if (column.tasks && column.tasks.length > 0) {
      res.status(400).json({
        message:
          "Cannot delete column with tasks. Move tasks to another column first.",
      });
      return;
    }

    // Get the order of the column being deleted
    const deletedOrder = column.order;

    // Remove column
    board.columns.pull(columnId);

    // Update order of other columns
    board.columns.forEach((col) => {
      if (col.order > deletedOrder) {
        col.order -= 1;
      }
    });

    await board.save();

    res.status(200).json({ message: "Column deleted successfully" });
  } catch (error) {
    console.error("Error deleting column:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

// Move task between columns
export const moveTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { boardId } = req.params;
    const {
      taskId,
      sourceColumnId,
      destinationColumnId,
      sourceIndex,
      destinationIndex,
    } = req.body;

    const board = await Board.findById(boardId);

    if (!board) {
      res.status(404).json({ message: "Board not found" });
      return;
    }

    // Find source and destination columns
    const sourceColumn = board.columns.id(sourceColumnId);
    const destinationColumn = board.columns.id(destinationColumnId);

    if (!sourceColumn || !destinationColumn) {
      res.status(404).json({ message: "Column not found" });
      return;
    }

    // Check if task exists in source column
    if (!sourceColumn.tasks.includes(taskId)) {
      res.status(404).json({ message: "Task not found in source column" });
      return;
    }

    // Remove task from source column
    sourceColumn.tasks.splice(sourceColumn.tasks.indexOf(taskId), 1);

    // Add task to destination column
    if (sourceColumnId === destinationColumnId) {
      // Same column, just reordering
      destinationColumn.tasks.splice(destinationIndex, 0, taskId);
    } else {
      // Moving to a different column
      destinationColumn.tasks.splice(destinationIndex, 0, taskId);

      // Update task status based on destination column
      let status;
      switch (destinationColumn.name.toLowerCase()) {
        case "to do":
          status = "todo";
          break;
        case "in progress":
          status = "in-progress";
          break;
        case "review":
          status = "review";
          break;
        case "done":
          status = "done";
          break;
        default:
          status = "todo";
      }

      await Task.findByIdAndUpdate(taskId, { $set: { status } });
    }

    await board.save();

    // Return updated board
    const updatedBoard = await Board.findById(boardId).populate({
      path: "columns.tasks",
      model: "Task",
      populate: {
        path: "assignee",
        model: "User",
        select: "name email",
      },
    });

    res.status(200).json(updatedBoard);
  } catch (error) {
    console.error("Error moving task:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};
