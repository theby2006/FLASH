import { create } from "zustand";
import type { CallSession, CallStatus } from "../types/call";

interface CallStore {
  status: CallStatus;
  session: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  error: string | null;

  setStatus: (status: CallStatus) => void;
  setSession: (session: CallSession | null) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setMuted: (muted: boolean) => void;
  setVideoOff: (off: boolean) => void;
  setError: (error: string | null) => void;
  resetCall: () => void;
  /** Clear stuck state so call buttons work again */
  forceIdle: () => void;
}

export const useCallStore = create<CallStore>((set) => ({
  status: "idle",
  session: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isVideoOff: false,
  error: null,

  setStatus: (status) => set({ status }),
  setSession: (session) => set({ session }),
  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setMuted: (isMuted) => set({ isMuted }),
  setVideoOff: (isVideoOff) => set({ isVideoOff }),
  setError: (error) => set({ error }),
  resetCall: () =>
    set({
      status: "idle",
      session: null,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isVideoOff: false,
      error: null,
    }),
  forceIdle: () =>
    set({
      status: "idle",
      session: null,
      localStream: null,
      remoteStream: null,
      error: null,
    }),
}));

export const createCallId = () =>
  `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
