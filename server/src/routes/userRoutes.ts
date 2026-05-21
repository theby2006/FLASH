import { Router } from "express";
import {
  searchByEmail,
  sendFriendRequest,
  getPendingRequests,
  respondToRequest,
  getContacts,
} from "../controllers/userController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);

router.get("/search", searchByEmail);
router.post("/request", sendFriendRequest);
router.get("/requests", getPendingRequests);
router.patch("/request/:id", respondToRequest);
router.get("/contacts", getContacts);

export default router;
