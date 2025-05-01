import { Request, Response } from "express";
import { Task } from "../models/task";
import { Column } from "../models/column";

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

    // Create and save the new task
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

    // If columnId is provided, add the task to the column
    if (columnId) {
      await Column.findByIdAndUpdate(columnId, {
        $push: { tasks: savedTask._id },
      });
    }

    // Return the new task with populated fields
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

    // Find current task
    const task = await Task.findById(id);

    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    // If status is changing and columnId is provided, move task between columns
    if (status && status !== task.status && columnId) {
      // Find current column containing the task
      const currentColumn = await Column.findOne({ tasks: id });

      if (currentColumn) {
        // Remove task from current column
        await Column.findByIdAndUpdate(currentColumn._id, {
          $pull: { tasks: id },
        });
      }

      // Add task to new column
      await Column.findByIdAndUpdate(columnId, { $push: { tasks: id } });
    }

    // Update task fields
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignee !== undefined) updateData.assignee = assignee;

    // Update the task
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

    // Find the task
    const task = await Task.findById(id);

    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    // Remove task from any column that contains it
    await Column.updateMany({ tasks: id }, { $pull: { tasks: id } });

    // Delete the task
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
