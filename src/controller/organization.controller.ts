import { Request, Response } from "express";
import { Organization } from "../models/organization";
import { User } from "../models/user";
import { Board } from "../models/board";
import { Task } from "../models/task";

// Get all organizations for the current user
export const getUserOrganizations = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const user = await User.findById(userId).populate("organizations");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(user.organizations);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

// Get organization by ID
export const getOrganizationById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    const organization = await Organization.findById(id)
      .populate("members", "name email role")
      .populate("boards", "name");

    if (!organization) {
      res.status(404).json({ message: "Organization not found" });
      return;
    }

    // Check if user is a member
    const isMember = organization.members.some(
      (member) => member._id.toString() === userId
    );

    if (!isMember) {
      res
        .status(403)
        .json({ message: "Not authorized to access this organization" });
      return;
    }

    res.status(200).json(organization);
  } catch (error) {
    console.error("Error fetching organization:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

// Create a new organization
export const createOrganization = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name } = req.body;
    const userId = (req as any).user.userId;

    // Create organization
    const newOrganization = new Organization({
      name,
      members: [userId],
    });

    const savedOrganization = await newOrganization.save();

    // Add organization to user's organizations
    await User.findByIdAndUpdate(userId, {
      $push: { organizations: savedOrganization._id },
    });

    // Create default board
    const defaultBoard = new Board({
      name: "Default Board",
      columns: [
        { name: "To Do", order: 0, tasks: [] },
        { name: "In Progress", order: 1, tasks: [] },
        { name: "Review", order: 2, tasks: [] },
        { name: "Done", order: 3, tasks: [] },
      ],
      organizationId: savedOrganization._id,
    });

    const savedBoard = await defaultBoard.save();

    // Add board to organization
    await Organization.findByIdAndUpdate(savedOrganization._id, {
      $push: { boards: savedBoard._id },
    });

    const populatedOrg = await Organization.findById(savedOrganization._id)
      .populate("members", "name email")
      .populate("boards", "name");

    res.status(201).json(populatedOrg);
  } catch (error) {
    console.error("Error creating organization:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

// Update organization
export const updateOrganization = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = (req as any).user.userId;

    // Find the organization
    const organization = await Organization.findById(id);

    if (!organization) {
      res.status(404).json({ message: "Organization not found" });
      return;
    }

    // Verify user is a member
    const isMember = organization.members.some(
      (member) => member.toString() === userId
    );

    if (!isMember) {
      res
        .status(403)
        .json({ message: "Not authorized to update this organization" });
      return;
    }

    // Update organization
    const updatedOrganization = await Organization.findByIdAndUpdate(
      id,
      { $set: { name } },
      { new: true }
    )
      .populate("members", "name email")
      .populate("boards", "name");

    res.status(200).json(updatedOrganization);
  } catch (error) {
    console.error("Error updating organization:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

// Delete organization
export const deleteOrganization = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    // Find the organization
    const organization = await Organization.findById(id);

    if (!organization) {
      res.status(404).json({ message: "Organization not found" });
      return;
    }

    // Check user is an admin or created the organization
    const userRole = (req as any).user.role;

    if (userRole !== "admin") {
      res
        .status(403)
        .json({ message: "Not authorized to delete this organization" });
      return;
    }

    // Delete all boards associated with the organization
    const boards = await Board.find({ organizationId: id });

    // Delete all tasks for this organization
    await Task.deleteMany({ organization: id });

    // Delete all boards
    await Board.deleteMany({ organizationId: id });

    // Remove organization from all users
    await User.updateMany(
      { organizations: id },
      { $pull: { organizations: id } }
    );

    // Delete the organization
    await Organization.findByIdAndDelete(id);

    res.status(200).json({ message: "Organization deleted successfully" });
  } catch (error) {
    console.error("Error deleting organization:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

// Add member to organization
export const addMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    const userId = (req as any).user.userId;

    // Find the organization
    const organization = await Organization.findById(id);

    if (!organization) {
      res.status(404).json({ message: "Organization not found" });
      return;
    }

    // Verify current user is a member
    const isMember = organization.members.some(
      (member) => member.toString() === userId
    );

    if (!isMember) {
      res.status(403).json({
        message: "Not authorized to add members to this organization",
      });
      return;
    }

    // Find user by email
    const userToAdd = await User.findOne({ email });

    if (!userToAdd) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Check if user is already a member
    if (organization.members.includes(userToAdd._id)) {
      res
        .status(400)
        .json({ message: "User is already a member of this organization" });
      return;
    }

    // Add user to organization
    organization.members.push(userToAdd._id);
    await organization.save();

    // Add organization to user's organizations
    await User.findByIdAndUpdate(userToAdd._id, {
      $addToSet: { organizations: id },
    });

    const updatedOrg = await Organization.findById(id)
      .populate("members", "name email")
      .populate("boards", "name");

    res.status(200).json(updatedOrg);
  } catch (error) {
    console.error("Error adding member:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

// Remove member from organization
export const removeMember = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id, memberId } = req.params;
    const userId = (req as any).user.userId;

    // Find the organization
    const organization = await Organization.findById(id);

    if (!organization) {
      res.status(404).json({ message: "Organization not found" });
      return;
    }

    // Verify current user is a member with admin role
    const currentUserRole = (req as any).user.role;

    if (currentUserRole !== "admin" && userId !== memberId) {
      res.status(403).json({
        message: "Not authorized to remove members from this organization",
      });
      return;
    }

    // Remove user from organization
    organization.members = organization.members.filter(
      (member) => member.toString() !== memberId
    );

    await organization.save();

    // Remove organization from user's organizations
    await User.findByIdAndUpdate(memberId, { $pull: { organizations: id } });

    // Reassign tasks where user is assignee
    await Task.updateMany(
      { organization: id, assignee: memberId },
      { $set: { assignee: userId } }
    );

    const updatedOrg = await Organization.findById(id)
      .populate("members", "name email")
      .populate("boards", "name");

    res.status(200).json(updatedOrg);
  } catch (error) {
    console.error("Error removing member:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

// Get all members of an organization
export const getOrganizationMembers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    // Find the organization
    const organization = await Organization.findById(id).populate(
      "members",
      "name email role"
    );

    if (!organization) {
      res.status(404).json({ message: "Organization not found" });
      return;
    }

    // Verify user is a member
    const isMember = organization.members.some(
      (member) => member._id.toString() === userId
    );

    if (!isMember) {
      res
        .status(403)
        .json({ message: "Not authorized to view this organization" });
      return;
    }

    res.status(200).json(organization.members);
  } catch (error) {
    console.error("Error fetching members:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};
