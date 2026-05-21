import "express-async-errors";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import chatRoutes from "./routes/chatRoutes";
import groupRoutes from "./routes/groupRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { initSocket } from "./socket";

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/groups", groupRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Global error handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ── Socket.io ──────────────────────────────────────────────────────────────
initSocket(io);

// ── Start server ───────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "5000");
httpServer.listen(PORT, () => {
  console.log(`⚡ FLASH server running on http://localhost:${PORT}`);
});

export { io };
