import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { getIceServersHandler } from "../controllers/callController";

const router = Router();

router.get("/ice-servers", authMiddleware, getIceServersHandler);

export default router;
