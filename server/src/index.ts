import "express-async-errors";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import chatRoutes from "./routes/chatRoutes";
import groupRoutes from "./routes/groupRoutes";
import callRoutes from "./routes/callRoutes";
import debugRoutes from "./routes/debugRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { initSocket } from "./socket";
import { corsOptions } from "./config/cors";

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    ...corsOptions,
    methods: ["GET", "POST"],
  },
});

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/calls", callRoutes);

if (process.env.NODE_ENV !== "production") {
  app.use("/api/debug", debugRoutes);
}

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
const HOST = process.env.HOST ?? "0.0.0.0";
httpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[Server] Port ${PORT} is already in use. Run: npm run dev:kill`
    );
    process.exit(1);
  }
  throw err;
});

httpServer.listen(PORT, HOST, () => {
  console.log(`⚡ FLASH server running on http://${HOST}:${PORT}`);
});

export { io };
