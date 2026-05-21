import React, { useEffect, useRef } from "react";
import { useCallStore } from "../../store/useCallStore";

interface ActiveCallOverlayProps {
  onEnd: () => void;
}

const ActiveCallOverlay: React.FC<ActiveCallOverlayProps> = ({ onEnd }) => {
  const {
    session,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    setMuted,
    setVideoOff,
    status,
  } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !isMuted;
    });
  }, [isMuted, localStream]);

  useEffect(() => {
    localStream?.getVideoTracks().forEach((t) => {
      t.enabled = !isVideoOff;
    });
  }, [isVideoOff, localStream]);

  if (!session) return null;

  const isVideo = session.callType === "video" && !isVideoOff;

  return (
    <div className="call-overlay">
      <div className="call-overlay-header">
        <span>{session.remoteDisplayName}</span>
        <span className="call-overlay-status">
          {status === "connecting" ? "Connecting…" : "On call"}
        </span>
      </div>

      <div className="call-overlay-video-area">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="call-video-remote"
          />
        ) : (
          <div className="call-video-placeholder">
            <span>{session.remoteDisplayName}</span>
          </div>
        )}
        {isVideo && localStream && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="call-video-local"
          />
        )}
      </div>

      <div className="call-overlay-controls">
        <button
          type="button"
          className={`call-control-btn ${isMuted ? "active" : ""}`}
          onClick={() => setMuted(!isMuted)}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? "🔇" : "🎤"}
        </button>
        {session.callType === "video" && (
          <button
            type="button"
            className={`call-control-btn ${isVideoOff ? "active" : ""}`}
            onClick={() => setVideoOff(!isVideoOff)}
            aria-label={isVideoOff ? "Turn camera on" : "Turn camera off"}
          >
            {isVideoOff ? "📷 Off" : "📷"}
          </button>
        )}
        <button
          type="button"
          className="call-control-btn call-control-end"
          onClick={onEnd}
          aria-label="End call"
        >
          End
        </button>
      </div>
    </div>
  );
};

export default ActiveCallOverlay;
