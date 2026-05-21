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
import { ICE_SERVERS, CALL_RING_TIMEOUT_MS } from "../utils/constants";
import { useCallRingtone } from "../hooks/useCallRingtone";
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
  const { socket } = useSocketContext();
  const { dbUser } = useAuthContext();
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([]);

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
  useCallRingtone(
    isRinging,
    status === "incoming" ? "incoming" : "outgoing"
  );

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
    peerRef.current?.close();
    peerRef.current = null;
    pendingOfferRef.current = null;
    iceQueueRef.current = [];
    localStream?.getTracks().forEach((t) => t.stop());
    useCallStore.getState().remoteStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
  }, [localStream, setLocalStream, setRemoteStream]);

  const endCall = useCallback(
    (notifyRemote = true) => {
      const s = useCallStore.getState().session;
      if (notifyRemote && socket && s) {
        socket.emit("call_end", {
          callId: s.callId,
          toUserId: s.remoteUserId,
        });
      }
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
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

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
        const [stream] = e.streams;
        if (stream) setRemoteStream(stream);
        setStatus("active");
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setStatus("active");
        }
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
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
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: s.callType === "video",
      });
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

  const startCall = useCallback(
    async (
      conversationId: string,
      remoteUserId: string,
      remoteDisplayName: string,
      callType: CallType
    ) => {
      if (!socket || !dbUser || useCallStore.getState().status !== "idle") return;

      const callId = createCallId();
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

      try {
        const stream = await getMediaStream(callType);
        setLocalStream(stream);

        const pc = createPeerConnection(callId, conversationId, remoteUserId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        socket.emit("call_invite", {
          callId,
          conversationId,
          callType,
          toUserId: remoteUserId,
          fromDisplayName: dbUser.displayName,
        });
      } catch (err) {
        console.error(err);
        setError("Could not access microphone or camera");
        endCall(false);
      }
    },
    [
      socket,
      dbUser,
      getMediaStream,
      createPeerConnection,
      setSession,
      setStatus,
      setError,
      setLocalStream,
      endCall,
    ]
  );

  const acceptCall = useCallback(async () => {
    const s = useCallStore.getState().session;
    if (!socket || !s || useCallStore.getState().status !== "incoming") return;

    setStatus("connecting");
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

      if (pendingOfferRef.current) {
        await pc.setRemoteDescription(
          new RTCSessionDescription(pendingOfferRef.current)
        );
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

  // No answer timeout while ringing
  useEffect(() => {
    if (status !== "outgoing" && status !== "incoming") return;
    const timer = window.setTimeout(() => {
      if (
        useCallStore.getState().status === "outgoing" ||
        useCallStore.getState().status === "incoming"
      ) {
        setError("No answer");
        endCall(true);
      }
    }, CALL_RING_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [status, setError, endCall]);

  useEffect(() => {
    if (!socket || !dbUser) return;

    const onIncoming = (payload: {
      callId: string;
      conversationId: string;
      callType: CallType;
      fromUserId: string;
      fromDisplayName: string;
    }) => {
      if (useCallStore.getState().status !== "idle") {
        socket.emit("call_reject", {
          callId: payload.callId,
          toUserId: payload.fromUserId,
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
      if (!peerRef.current) return;

      setStatus("connecting");
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

    const onEnd = (payload: { callId: string }) => {
      const s = useCallStore.getState().session;
      if (s?.callId === payload.callId) endCall(false);
    };

    const onCallError = (payload: { message: string }) => {
      setError(payload.message);
      endCall(false);
    };

    socket.on("call_incoming", onIncoming);
    socket.on("call_accept", onAccept);
    socket.on("call_offer", onOffer);
    socket.on("call_answer", onAnswer);
    socket.on("call_ice_candidate", onIce);
    socket.on("call_reject", onReject);
    socket.on("call_end", onEnd);
    socket.on("call_error", onCallError);

    return () => {
      socket.off("call_incoming", onIncoming);
      socket.off("call_accept", onAccept);
      socket.off("call_offer", onOffer);
      socket.off("call_answer", onAnswer);
      socket.off("call_ice_candidate", onIce);
      socket.off("call_reject", onReject);
      socket.off("call_end", onEnd);
      socket.off("call_error", onCallError);
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
