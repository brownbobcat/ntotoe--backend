import { Request, Response } from "express";
import { Board } from "../models/board";
import { Organization } from "../models/organization";
import { Task } from "../models/task";

export const getBoards = async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    const boards = await Board.find({ organizationId })
      .populate({
        path: "columns",
        populate: {
          path: "tasks",
          model: "Task",
          populate: {
            path: "assignee",
            model: "User",
            select: "name email",
          },
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json(boards);
  } catch (error) {
    console.error("Error fetching boards:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

export const getBoardById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const board = await Board.findById(id).populate("organizationId", "name");

    if (!board) {
      res.status(404).json({ message: "Board not found" });
      return;
    }

    const boardObject = board.toObject();

    const taskIds: string[] = [];
    for (const column of boardObject.columns) {
      if (column.tasks && column.tasks.length > 0) {
        column.tasks.forEach((taskId: any) => {
          taskIds.push(taskId.toString());
        });
      }
    }

    if (taskIds.length > 0) {
      const tasks = await Task.find({ _id: { $in: taskIds } })
        .populate("assignee", "name email")
        .populate("reporter", "name email");

      const taskMap: Record<string, any> = {};
      tasks.forEach((task) => {
        taskMap[task._id.toString()] = task;
      });

      for (const column of boardObject.columns) {
        if (column.tasks && column.tasks.length > 0) {
          column.tasks = column.tasks.map((taskId: any) => {
            const taskIdStr = taskId.toString();
            return taskMap[taskIdStr] || taskId;
          });
        }
      }
    }

    boardObject.columns.sort((a: any, b: any) => a.order - b.order);

    res.status(200).json(boardObject);
  } catch (error) {
    console.error("Error fetching board:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

export const createBoard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, organizationId } = req.body;

    // Create default columns
    const defaultColumns = [
      { name: "To Do", order: 0, tasks: [] },
      { name: "In Progress", order: 1, tasks: [] },
      { name: "Review", order: 2, tasks: [] },
      { name: "Done", order: 3, tasks: [] },
    ];

    // Create and save the new board
    const newBoard = new Board({
      name,
      columns: defaultColumns,
      organizationId,
    });

    const savedBoard = await newBoard.save();

    // Add board to organization
    await Organization.findByIdAndUpdate(organizationId, {
      $push: { boards: savedBoard._id },
    });

    res.status(201).json(savedBoard);
  } catch (error) {
    console.error("Error creating board:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

export const updateBoard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const board = await Board.findById(id);

    if (!board) {
      res.status(404).json({ message: "Board not found" });
      return;
    }

    const updatedBoard = await Board.findByIdAndUpdate(
      id,
      { $set: { name } },
      { new: true }
    );

    res.status(200).json(updatedBoard);
  } catch (error) {
    console.error("Error updating board:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

export const deleteBoard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const board = await Board.findById(id);

    if (!board) {
      res.status(404).json({ message: "Board not found" });
      return;
    }

    // Remove board from organization
    await Organization.findByIdAndUpdate(board.organizationId, {
      $pull: { boards: id },
    });

    // Delete the board
    await Board.findByIdAndDelete(id);

    res.status(200).json({ message: "Board deleted successfully" });
  } catch (error) {
    console.error("Error deleting board:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

export const addColumn = async (req: Request, res: Response): Promise<void> => {
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

    // Create the new column
    const newColumn = {
      name,
      tasks: [],
      order: maxOrder + 1,
    };

    // Add column to board
    const updatedBoard = await Board.findByIdAndUpdate(
      boardId,
      { $push: { columns: newColumn } },
      { new: true }
    );

    res.status(200).json(updatedBoard);
  } catch (error) {
    console.error("Error adding column:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

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

    // Find the column to update
    const column = board.columns.id(columnId);

    if (!column) {
      res.status(404).json({ message: "Column not found" });
      return;
    }

    // Update column properties
    if (name) column.name = name;
    if (order !== undefined) column.order = order;

    // Save the board
    await board.save();

    res.status(200).json(board);
  } catch (error) {
    console.error("Error updating column:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

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

    // Find the column to delete
    const column = board.columns.id(columnId);

    if (!column) {
      res.status(404).json({ message: "Column not found" });
      return;
    }

    // If column has tasks, prevent deletion
    if (column.tasks.length > 0) {
      res.status(400).json({
        message:
          "Cannot delete column with tasks. Move tasks to another column first.",
      });
      return;
    }

    // Remove column from board
    board.columns.pull(columnId);

    // Save the board
    await board.save();

    res.status(200).json({ message: "Column deleted successfully" });
  } catch (error) {
    console.error("Error deleting column:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

export const reorderColumns = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { boardId } = req.params;
    const { columnOrder } = req.body;

    if (!columnOrder || !Array.isArray(columnOrder)) {
      res.status(400).json({ message: "Column order array is required" });
      return;
    }

    const board = await Board.findById(boardId);

    if (!board) {
      res.status(404).json({ message: "Board not found" });
      return;
    }

    // Update the order of each column
    for (const item of columnOrder) {
      const column = board.columns.id(item.columnId);
      if (column) {
        column.order = item.order;
      }
    }

    // Save the board
    await board.save();

    res.status(200).json(board);
  } catch (error) {
    console.error("Error reordering columns:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};
