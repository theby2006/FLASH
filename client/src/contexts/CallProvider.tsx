import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useSocketContext } from "./SocketContext";
import { useAuthContext } from "./AuthContext";
import { useCallStore, createCallId } from "../store/useCallStore";
import { CALL_RING_TIMEOUT_MS } from "../utils/constants";
import { useCallRingtone } from "../hooks/useCallRingtone";
import { useIceServers } from "../hooks/useIceServers";
import type { CallType } from "../types/call";
import IncomingCallModal from "../components/call/IncomingCallModal";
import ActiveCallOverlay from "../components/call/ActiveCallOverlay";

interface CallContextValue {
  startCall: (
    conversationId: string,
    remoteUserId: string,
    remoteDisplayName: string,
    callType: CallType
  ) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
};

const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket, connected } = useSocketContext();
  const { dbUser } = useAuthContext();
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingAcceptRef = useRef(false);
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingCallRef = useRef(false);
  const activeCallIdRef = useRef<string | null>(null);
  const { iceServers } = useIceServers();
  const iceServersRef = useRef<RTCIceServer[]>(iceServers);

  useEffect(() => {
    iceServersRef.current = iceServers;
  }, [iceServers]);

  const {
    status,
    setStatus,
    setSession,
    setLocalStream,
    setRemoteStream,
    setError,
    resetCall,
    localStream,
  } = useCallStore();

  const isRinging = status === "incoming" || status === "outgoing";
  const session = useCallStore((s) => s.session);

  useCallRingtone(
    isRinging,
    status === "incoming" ? "incoming" : "outgoing"
  );

  // Browser notification when tab is in background
  useEffect(() => {
    if (status !== "incoming" || !session) return;
    if (typeof Notification === "undefined") return;

    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }

    if (
      document.visibilityState === "hidden" &&
      Notification.permission === "granted"
    ) {
      const n = new Notification(
        `Incoming ${session.callType} call`,
        {
          body: `${session.remoteDisplayName} is calling`,
          tag: `flash-call-${session.callId}`,
        }
      );
      n.onclick = () => window.focus();
    }
  }, [status, session]);

  const flushIceQueue = useCallback(async (pc: RTCPeerConnection) => {
    const queued = [...iceQueueRef.current];
    iceQueueRef.current = [];
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("[Call] Queued ICE:", err);
      }
    }
  }, []);

  const cleanupPeer = useCallback(() => {
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    peerRef.current?.close();
    peerRef.current = null;
    pendingOfferRef.current = null;
    pendingAcceptRef.current = false;
    iceQueueRef.current = [];
    localStream?.getTracks().forEach((t) => t.stop());
    useCallStore.getState().remoteStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
  }, [localStream, setLocalStream, setRemoteStream]);

  const endCall = useCallback(
    (notifyRemote = true) => {
      const s = useCallStore.getState().session;
      if (notifyRemote && socket?.connected && s) {
        socket.emit("call_end", {
          callId: s.callId,
          toUserId: s.remoteUserId,
        });
      }
      activeCallIdRef.current = null;
      startingCallRef.current = false;
      cleanupPeer();
      resetCall();
    },
    [socket, cleanupPeer, resetCall]
  );

  const getMediaStream = useCallback(async (callType: CallType) => {
    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: callType === "video",
    });
  }, []);

  const createPeerConnection = useCallback(
    (callId: string, conversationId: string, remoteUserId: string) => {
      const pc = new RTCPeerConnection({
        iceServers: iceServersRef.current,
        iceCandidatePoolSize: 10,
        bundlePolicy: "max-bundle",
      });

      pc.oniceconnectionstatechange = () => {
        console.log("[Call] ICE connection:", pc.iceConnectionState);
        if (pc.iceConnectionState === "failed") {
          setError(
            "Could not connect media (network). Ensure TURN is enabled on the server."
          );
          window.setTimeout(() => endCall(false), 1500);
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && socket) {
          socket.emit("call_ice_candidate", {
            callId,
            conversationId,
            toUserId: remoteUserId,
            candidate: e.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (e) => {
        const existing = useCallStore.getState().remoteStream;
        const stream =
          e.streams[0] ??
          existing ??
          new MediaStream();
        if (e.track && !stream.getTracks().some((t) => t.id === e.track!.id)) {
          stream.addTrack(e.track);
        }
        setRemoteStream(stream);
        setStatus("active");
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          if (disconnectTimerRef.current) {
            clearTimeout(disconnectTimerRef.current);
            disconnectTimerRef.current = null;
          }
          setStatus("active");
        }
        if (pc.connectionState === "disconnected") {
          if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = setTimeout(() => {
            if (peerRef.current?.connectionState === "disconnected") {
              setError("Call connection lost");
              endCall(false);
            }
          }, 8000);
        }
        if (pc.connectionState === "failed") {
          setError("Call connection lost");
          endCall(false);
        }
      };

      peerRef.current = pc;
      return pc;
    },
    [socket, setRemoteStream, setStatus, setError, endCall]
  );

  const sendAnswer = useCallback(
    async (pc: RTCPeerConnection) => {
      const s = useCallStore.getState().session;
      if (!socket || !s) return;
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call_answer", {
        callId: s.callId,
        conversationId: s.conversationId,
        toUserId: s.remoteUserId,
        sdp: answer,
      });
    },
    [socket]
  );

  const sendOffer = useCallback(
    async (pc: RTCPeerConnection) => {
      const s = useCallStore.getState().session;
      if (!socket || !s) return;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call_offer", {
        callId: s.callId,
        conversationId: s.conversationId,
        toUserId: s.remoteUserId,
        sdp: offer,
      });
    },
    [socket]
  );

  const prepareCallerMedia = useCallback(
    async (
      callId: string,
      conversationId: string,
      remoteUserId: string,
      callType: CallType
    ) => {
      const stream = await getMediaStream(callType);
      setLocalStream(stream);
      const pc = createPeerConnection(callId, conversationId, remoteUserId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      if (pendingAcceptRef.current && peerRef.current) {
        pendingAcceptRef.current = false;
        setStatus("connecting");
        await sendOffer(peerRef.current);
      }
    },
    [getMediaStream, createPeerConnection, setLocalStream, setStatus, sendOffer]
  );

  const startCall = useCallback(
    async (
      conversationId: string,
      remoteUserId: string,
      remoteDisplayName: string,
      callType: CallType
    ) => {
      if (startingCallRef.current) return;
      if (!socket?.connected || !dbUser) {
        setError("Not connected — wait a moment and try again");
        return;
      }

      const current = useCallStore.getState();
      if (current.status !== "idle") {
        setError("A call is already in progress");
        return;
      }

      startingCallRef.current = true;

      const callId = createCallId();
      activeCallIdRef.current = callId;
      pendingAcceptRef.current = false;
      setSession({
        callId,
        conversationId,
        callType,
        remoteUserId,
        remoteDisplayName,
        isInitiator: true,
      });
      setStatus("outgoing");
      setError(null);

      socket.emit("call_invite", {
        callId,
        conversationId,
        callType,
        toUserId: remoteUserId,
        fromDisplayName: dbUser.displayName,
      });

      try {
        await prepareCallerMedia(
          callId,
          conversationId,
          remoteUserId,
          callType
        );
      } catch (err) {
        console.error(err);
        setError("Could not access microphone or camera");
        endCall(true);
      } finally {
        startingCallRef.current = false;
      }
    },
    [
      socket,
      dbUser,
      prepareCallerMedia,
      setSession,
      setStatus,
      setError,
      endCall,
    ]
  );

  const acceptCall = useCallback(async () => {
    const s = useCallStore.getState().session;
    if (!socket?.connected || !s || useCallStore.getState().status !== "incoming") {
      return;
    }

    setStatus("connecting");
    activeCallIdRef.current = s.callId;
    setError(null);

    socket.emit("call_accept", {
      callId: s.callId,
      conversationId: s.conversationId,
      toUserId: s.remoteUserId,
    });

    try {
      const stream = await getMediaStream(s.callType);
      setLocalStream(stream);

      const pc = createPeerConnection(
        s.callId,
        s.conversationId,
        s.remoteUserId
      );
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = pendingOfferRef.current;
      if (offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        pendingOfferRef.current = null;
        await flushIceQueue(pc);
        await sendAnswer(pc);
      }
    } catch (err) {
      console.error(err);
      setError("Could not access microphone or camera");
      endCall(false);
    }
  }, [
    socket,
    getMediaStream,
    createPeerConnection,
    setStatus,
    setError,
    setLocalStream,
    sendAnswer,
    flushIceQueue,
    endCall,
  ]);

  const rejectCall = useCallback(() => {
    const s = useCallStore.getState().session;
    const st = useCallStore.getState().status;
    if (socket && s) {
      if (st === "outgoing") {
        socket.emit("call_end", {
          callId: s.callId,
          toUserId: s.remoteUserId,
        });
      } else {
        socket.emit("call_reject", {
          callId: s.callId,
          toUserId: s.remoteUserId,
        });
      }
    }
    cleanupPeer();
    resetCall();
  }, [socket, cleanupPeer, resetCall]);

  // No answer timeout — tied to this call id only
  useEffect(() => {
    if (status !== "outgoing" && status !== "incoming") return;
    const callId = session?.callId;
    if (!callId) return;

    const timer = window.setTimeout(() => {
      const state = useCallStore.getState();
      if (
        state.session?.callId === callId &&
        (state.status === "outgoing" || state.status === "incoming")
      ) {
        setError("No answer");
        endCall(true);
      }
    }, CALL_RING_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [status, session?.callId, setError, endCall]);

  // Drop stuck call UI if socket disconnects mid-call
  useEffect(() => {
    if (connected) return;
    const st = useCallStore.getState().status;
    if (st !== "idle") {
      setError("Connection lost");
      endCall(false);
    }
  }, [connected, setError, endCall]);

  // Auto-clear idle error hint after a few seconds
  useEffect(() => {
    if (status !== "idle") return;
    const err = useCallStore.getState().error;
    if (!err) return;
    const t = window.setTimeout(() => setError(null), 5000);
    return () => window.clearTimeout(t);
  }, [status, setError]);

  useEffect(() => {
    if (!socket || !dbUser) return;

    const onIncoming = (payload: {
      callId: string;
      conversationId: string;
      callType: CallType;
      fromUserId: string;
      fromDisplayName: string;
    }) => {
      const state = useCallStore.getState();
      if (
        state.session?.callId === payload.callId &&
        (state.status === "incoming" || state.status === "connecting")
      ) {
        return;
      }

      if (state.status !== "idle") {
        socket.emit("call_reject", {
          callId: payload.callId,
          toUserId: payload.fromUserId,
          reason: "busy",
        });
        return;
      }

      setSession({
        callId: payload.callId,
        conversationId: payload.conversationId,
        callType: payload.callType,
        remoteUserId: payload.fromUserId,
        remoteDisplayName: payload.fromDisplayName,
        isInitiator: false,
      });
      setStatus("incoming");
    };

    const onAccept = async (payload: {
      callId: string;
      conversationId: string;
    }) => {
      const state = useCallStore.getState();
      const s = state.session;
      if (!s?.isInitiator || s.callId !== payload.callId) return;

      setStatus("connecting");
      if (!peerRef.current) {
        pendingAcceptRef.current = true;
        return;
      }

      try {
        await sendOffer(peerRef.current);
      } catch (err) {
        console.error(err);
        setError("Failed to start call");
        endCall(false);
      }
    };

    const onOffer = async (payload: {
      callId: string;
      conversationId: string;
      sdp: RTCSessionDescriptionInit;
      fromUserId: string;
    }) => {
      const state = useCallStore.getState();
      const s = state.session;

      if (s?.isInitiator) return;

      if (!s || s.callId !== payload.callId) {
        pendingOfferRef.current = payload.sdp;
        return;
      }

      pendingOfferRef.current = payload.sdp;

      if (peerRef.current && state.status === "connecting") {
        try {
          await peerRef.current.setRemoteDescription(
            new RTCSessionDescription(payload.sdp)
          );
          pendingOfferRef.current = null;
          await flushIceQueue(peerRef.current);
          await sendAnswer(peerRef.current);
        } catch (err) {
          console.error(err);
          setError("Failed to connect call");
          endCall(false);
        }
      }
    };

    const onAnswer = async (payload: {
      callId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      const s = useCallStore.getState().session;
      if (!s || s.callId !== payload.callId || !peerRef.current) return;
      try {
        await peerRef.current.setRemoteDescription(
          new RTCSessionDescription(payload.sdp)
        );
        await flushIceQueue(peerRef.current);
        setStatus("active");
      } catch (err) {
        console.error(err);
        setError("Failed to establish call");
        endCall(false);
      }
    };

    const onIce = async (payload: {
      callId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const s = useCallStore.getState().session;
      const pc = peerRef.current;
      if (!s || s.callId !== payload.callId || !pc) return;

      if (!pc.remoteDescription) {
        iceQueueRef.current.push(payload.candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (err) {
        console.warn("[Call] ICE candidate:", err);
      }
    };

    const onReject = (payload: { callId: string }) => {
      const s = useCallStore.getState().session;
      if (s?.callId === payload.callId) {
        setError("Call declined");
        endCall(false);
      }
    };

    const onBusy = (payload: { callId: string }) => {
      const s = useCallStore.getState().session;
      if (s?.callId === payload.callId) {
        setError("User is busy");
        endCall(false);
      }
    };

    const onEnd = (payload: { callId: string }) => {
      const s = useCallStore.getState().session;
      if (s?.callId === payload.callId) endCall(false);
    };

    const onCallError = (payload: { message: string }) => {
      setError(payload.message);
      endCall(false);
    };

    const onUnreachable = (payload: { callId: string; message: string }) => {
      const s = useCallStore.getState().session;
      if (s?.callId === payload.callId) {
        setError(payload.message || "User is offline");
        endCall(false);
      }
    };

    socket.on("call_incoming", onIncoming);
    socket.on("call_accept", onAccept);
    socket.on("call_offer", onOffer);
    socket.on("call_answer", onAnswer);
    socket.on("call_ice_candidate", onIce);
    socket.on("call_reject", onReject);
    socket.on("call_busy", onBusy);
    socket.on("call_end", onEnd);
    socket.on("call_error", onCallError);
    socket.on("call_unreachable", onUnreachable);

    return () => {
      socket.off("call_incoming", onIncoming);
      socket.off("call_accept", onAccept);
      socket.off("call_offer", onOffer);
      socket.off("call_answer", onAnswer);
      socket.off("call_ice_candidate", onIce);
      socket.off("call_reject", onReject);
      socket.off("call_busy", onBusy);
      socket.off("call_end", onEnd);
      socket.off("call_error", onCallError);
      socket.off("call_unreachable", onUnreachable);
    };
  }, [
    socket,
    dbUser,
    setSession,
    setStatus,
    setError,
    sendAnswer,
    sendOffer,
    flushIceQueue,
    endCall,
  ]);

  return (
    <CallContext.Provider
      value={{ startCall, acceptCall, rejectCall, endCall: () => endCall(true) }}
    >
      {children}
      {(status === "incoming" || status === "outgoing") && (
        <IncomingCallModal onAccept={acceptCall} onReject={rejectCall} />
      )}
      {(status === "connecting" || status === "active") && (
        <ActiveCallOverlay onEnd={() => endCall(true)} />
      )}
    </CallContext.Provider>
  );
};

export default CallProvider;
