import { Request, Response, NextFunction } from "express";
import { validateAuthToken } from "../auth";
import { JWTPayload } from "../types";
import { User } from "../models/user";
import { InvalidAuthTokenError } from "../utils/errors";

declare global {
  namespace Express {
    interface Request {
      user?: any;
      userId?: string;
    }
  }
}

export const auth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const token = authHeader.replace("Bearer ", "");
    const payload = validateAuthToken<JWTPayload>(token);

    const user = await User.findById(payload.userId).select("-password");
    if (!user) {
      res.status(401).json({ message: "User not found or token invalid" });
      return;
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (error) {
    if (error instanceof InvalidAuthTokenError) {
      res.status(401).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: "Authentication error" });
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin privileges required" });
  }
  next();
};

export const requireOrganizationMember = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const organizationId = req.params.organizationId || req.body.organizationId;

  if (!organizationId) {
    return res.status(400).json({ message: "Organization ID required" });
  }

  const isMember = req.user.organizations?.some(
    (orgId: any) => orgId.toString() === organizationId.toString()
  );

  if (!isMember) {
    return res
      .status(403)
      .json({ message: "You are not a member of this organization" });
  }

  next();
};
