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
import { ICE_SERVERS } from "../utils/constants";
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

  const cleanupPeer = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    pendingOfferRef.current = null;
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
      audio: true,
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
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
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

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("call_offer", {
          callId,
          conversationId,
          toUserId: remoteUserId,
          sdp: offer,
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
    endCall,
  ]);

  const rejectCall = useCallback(() => {
    const s = useCallStore.getState().session;
    if (socket && s) {
      socket.emit("call_reject", {
        callId: s.callId,
        toUserId: s.remoteUserId,
      });
    }
    cleanupPeer();
    resetCall();
  }, [socket, cleanupPeer, resetCall]);

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
        setSession({
          callId: payload.callId,
          conversationId: payload.conversationId,
          callType: "audio",
          remoteUserId: payload.fromUserId,
          remoteDisplayName: "Caller",
          isInitiator: false,
        });
        setStatus("incoming");
        pendingOfferRef.current = payload.sdp;
        return;
      }

      if (peerRef.current && state.status === "connecting") {
        await peerRef.current.setRemoteDescription(
          new RTCSessionDescription(payload.sdp)
        );
        await sendAnswer(peerRef.current);
        return;
      }

      pendingOfferRef.current = payload.sdp;
    };

    const onAnswer = async (payload: {
      callId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      const s = useCallStore.getState().session;
      if (!s || s.callId !== payload.callId || !peerRef.current) return;
      await peerRef.current.setRemoteDescription(
        new RTCSessionDescription(payload.sdp)
      );
      setStatus("active");
    };

    const onIce = async (payload: {
      callId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const s = useCallStore.getState().session;
      if (!s || s.callId !== payload.callId || !peerRef.current) return;
      try {
        await peerRef.current.addIceCandidate(
          new RTCIceCandidate(payload.candidate)
        );
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
    socket.on("call_offer", onOffer);
    socket.on("call_answer", onAnswer);
    socket.on("call_ice_candidate", onIce);
    socket.on("call_reject", onReject);
    socket.on("call_end", onEnd);
    socket.on("call_error", onCallError);

    return () => {
      socket.off("call_incoming", onIncoming);
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
