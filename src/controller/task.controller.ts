import { Request, Response } from "express";
import { Task } from "../models/task";
import { Column } from "../models/column";
import { Board } from "../models/board";

// Get all tasks for an organization
export const getTasks = async (req: Request, res: Response) => {
  try {
    const { organizationId, status, priority, assignee } = req.query;

    // Build filter object
    const filter: any = {};

    if (organizationId) filter.organization = organizationId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assignee = assignee;

    const tasks = await Task.find(filter)
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

// Get task by ID
export const getTaskById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .populate("organization", "name");

    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    res.status(200).json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

// Create a new task
export const createTask = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      assignee,
      reporter,
      organization,
      columnId,
    } = req.body;

    const newTask = new Task({
      title,
      description,
      status: status || "todo",
      priority: priority || "medium",
      assignee,
      reporter,
      organization,
    });

    const savedTask = await newTask.save();

    if (columnId) {
      const result = await Board.updateOne(
        { "columns._id": columnId },
        { $push: { "columns.$.tasks": savedTask._id } }
      );

      if (result.modifiedCount === 0) {
        console.warn(
          "Failed to add task to column. Column may not exist:",
          columnId
        );
      } else {
        console.log("Task added to column successfully");
      }
    }

    const populatedTask = await Task.findById(savedTask._id)
      .populate("assignee", "name email")
      .populate("reporter", "name email");

    res.status(201).json(populatedTask);
  } catch (error) {
    console.error("Error creating task:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

// Update a task
export const updateTask = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assignee, columnId } =
      req.body;

    const task = await Task.findById(id);

    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    if (status && status !== task.status && columnId) {
      const sourceBoard = await Board.findOne({ "columns.tasks": id });

      if (sourceBoard) {
        const sourceColumn = sourceBoard.columns.find((col) =>
          col.tasks.some((taskId) => taskId.toString() === id)
        );

        if (sourceColumn) {
          await Board.updateOne(
            { _id: sourceBoard._id, "columns._id": sourceColumn._id },
            { $pull: { "columns.$.tasks": id } }
          );
        }
      }

      await Board.updateOne(
        { "columns._id": columnId },
        { $push: { "columns.$.tasks": id } }
      );
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignee !== undefined) updateData.assignee = assignee;

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    )
      .populate("assignee", "name email")
      .populate("reporter", "name email");

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

// Delete a task
export const deleteTask = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);

    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    await Board.updateMany(
      { "columns.tasks": id },
      { $pull: { "columns.$[].tasks": id } }
    );

    await Task.findByIdAndDelete(id);

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

// Search tasks
export const searchTasks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { query, organizationId } = req.query;

    if (!query) {
      res.status(400).json({ message: "Search query is required" });
      return;
    }

    const filter: any = {
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    };

    // Filter by organization if provided
    if (organizationId) {
      filter.organization = organizationId;
    }

    const tasks = await Task.find(filter)
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .limit(20);

    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error searching tasks:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};
