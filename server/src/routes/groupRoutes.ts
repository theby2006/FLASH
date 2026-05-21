import { Router } from "express";
import {
  createGroup,
  getGroupInfo,
  addMember,
  removeMember,
} from "../controllers/groupController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);

router.post("/", createGroup);
router.get("/:id", getGroupInfo);
router.post("/:id/members", addMember);
router.delete("/:id/members/:userId", removeMember);

export default router;
