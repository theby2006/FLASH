import { Response } from "express";
import { AuthRequest } from "../types";
import { getIceServers, isTurnConfigured } from "../services/iceService";

/** GET /api/calls/ice-servers — STUN/TURN for WebRTC (required for different devices/networks) */
export const getIceServersHandler = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  const iceServers = getIceServers();
  res.status(200).json({
    success: true,
    data: {
      iceServers,
      turnConfigured: isTurnConfigured(),
    },
  });
};
