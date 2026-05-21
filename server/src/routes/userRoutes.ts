import { Router } from "express";
import {
  searchByEmail,
  sendFriendRequest,
  getPendingRequests,
  respondToRequest,
  getContacts,
} from "../controllers/userController";
import { authMiddleware } from "../middleware/authMiddleware";
import { validateBody, validateQuery } from "../middleware/validate";
import {
  friendRequestBodySchema,
  respondRequestBodySchema,
  searchQuerySchema,
} from "../validators";

const router = Router();

router.use(authMiddleware);

router.get("/search", validateQuery(searchQuerySchema), searchByEmail);
router.post("/request", validateBody(friendRequestBodySchema), sendFriendRequest);
router.get("/requests", getPendingRequests);
router.patch("/request/:id", validateBody(respondRequestBodySchema), respondToRequest);
router.get("/contacts", getContacts);

export default router;
