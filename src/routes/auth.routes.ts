import express from "express";
import * as authController from "../auth/auth-controller";
import { auth } from "../middleware";
import * as userController from "../auth/user-controller";

const router = express.Router();

router.post("/register", authController.register);

router.post("/login", authController.login);

router.post("/forgot-password", authController.forgotPassword);

router.post("/reset-password", authController.resetPassword);

router.get("/validate-reset-token/:token", authController.validateResetToken);

router.use(auth);

router.get("/profile", authController.getProfile);

router.get("/search", userController.searchUsers);

router.get("/:id", userController.getUserById);

export default router;
