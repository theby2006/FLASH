import { Request, Response, NextFunction } from "express";
import { adminAuth, isFirebaseConfigured } from "../config/firebase";

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name: string;
    picture: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!isFirebaseConfigured || !adminAuth) {
      res.status(503).json({
        success: false,
        message:
          "Server auth not configured. Add Firebase Admin credentials to server/.env",
      });
      return;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: No token provided",
      });
      return;
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? "",
      name: decoded.name ?? "",
      picture: decoded.picture ?? "",
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or expired token",
    });
  }
};
