import os from "os";
import { Router } from "express";
import { agentDebugLog } from "../utils/agentDebugLog";
import { getOnlineUserIds } from "../socket/socketNotifier";

function getLanShareUrl(): string | null {
  const nets = os.networkInterfaces();
  for (const ifaces of Object.values(nets)) {
    for (const net of ifaces ?? []) {
      if (net.family === "IPv4" && !net.internal && net.address.startsWith("192.168.")) {
        return `http://${net.address}:5173`;
      }
    }
  }
  return null;
}

const router = Router();

router.post("/client-log", (req, res) => {
  const { location, message, data, hypothesisId, runId } = req.body ?? {};
  agentDebugLog(
    String(location ?? "debugRoutes"),
    String(message ?? "client log"),
    typeof data === "object" && data !== null ? data : {},
    String(hypothesisId ?? "H1"),
    String(runId ?? "post-fix")
  );
  res.json({ ok: true });
});

router.get("/dev-info", (_req, res) => {
  res.json({
    shareUrl: getLanShareUrl(),
    onlineUserIds: getOnlineUserIds(),
  });
});

export default router;
