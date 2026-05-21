import { Router } from "express";
import {
  getConversations,
  getOrCreateDM,
  getMessages,
} from "../controllers/chatController";
import { authMiddleware } from "../middleware/authMiddleware";
import { validateBody } from "../middleware/validate";
import { dmBodySchema } from "../validators";

const router = Router();

router.use(authMiddleware);

router.get("/", getConversations);
router.post("/dm", validateBody(dmBodySchema), getOrCreateDM);
router.get("/:id/messages", getMessages);

export default router;
