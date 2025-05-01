import express from "express";
import * as organizationController from "../controller/organization.controller";
import { auth } from "../middleware";

const router = express.Router();

router.use(auth);

router.get("/", organizationController.getUserOrganizations);

router.get("/:id", organizationController.getOrganizationById);

router.get("/:id/members", organizationController.getOrganizationMembers);

router.post("/", organizationController.createOrganization);

router.put("/:id", organizationController.updateOrganization);

router.delete("/:id", organizationController.deleteOrganization);

router.post("/:id/members", organizationController.addMember);

router.delete("/:id/members/:memberId", organizationController.removeMember);

export default router;
