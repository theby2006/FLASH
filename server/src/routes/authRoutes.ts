import { Router } from "express";
import { loginOrRegister } from "../controllers/authController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/login", authMiddleware, loginOrRegister);

export default router;
