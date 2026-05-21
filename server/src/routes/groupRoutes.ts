import { Router } from "express";
import {
  createGroup,
  getGroupInfo,
  addMember,
  removeMember,
} from "../controllers/groupController";
import { authMiddleware } from "../middleware/authMiddleware";
import { validateBody } from "../middleware/validate";
import { addMemberBodySchema, createGroupBodySchema } from "../validators";

const router = Router();

router.use(authMiddleware);

router.post("/", validateBody(createGroupBodySchema), createGroup);
router.get("/:id", getGroupInfo);
router.post("/:id/members", validateBody(addMemberBodySchema), addMember);
router.delete("/:id/members/:userId", removeMember);

export default router;
