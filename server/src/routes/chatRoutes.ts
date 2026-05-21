import { Router } from "express";
import {
  getConversations,
  getOrCreateDM,
  getMessages,
} from "../controllers/chatController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);

router.get("/", getConversations);
router.post("/dm", getOrCreateDM);
router.get("/:id/messages", getMessages);

export default router;
