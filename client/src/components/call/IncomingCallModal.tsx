import React from "react";
import { useCallStore } from "../../store/useCallStore";
import Avatar from "../ui/Avatar";

interface IncomingCallModalProps {
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  onAccept,
  onReject,
}) => {
  const { session, status, error } = useCallStore();

  if (!session) return null;

  const isVideo = session.callType === "video";
  const isIncoming = status === "incoming";
  const title = isIncoming
    ? `Incoming ${isVideo ? "video" : "voice"} call`
    : `Calling ${session.remoteDisplayName}…`;

  return (
    <div className="call-modal-backdrop" role="dialog" aria-modal="true">
      <div className={`call-modal ${isIncoming || status === "outgoing" ? "call-modal-ringing" : ""}`}>
        <div className="call-modal-avatar-ring">
          <Avatar name={session.remoteDisplayName} size="xl" />
        </div>
        <h2 className="call-modal-title">{session.remoteDisplayName}</h2>
        <p className="call-modal-subtitle">{title}</p>
        {(isIncoming || status === "outgoing") && (
          <p className="call-modal-ring-hint" aria-live="polite">
            {isIncoming ? "Ringing…" : "Ringing…"}
          </p>
        )}
        {error && <p className="call-modal-error">{error}</p>}
        <div className="call-modal-actions">
          {isIncoming && (
            <>
              <button
                type="button"
                className="call-btn call-btn-reject"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onReject();
                }}
                aria-label="Decline call"
              >
                ✕
              </button>
              <button
                type="button"
                className="call-btn call-btn-accept"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAccept();
                }}
                aria-label="Accept call"
              >
                {isVideo ? "📹" : "📞"}
              </button>
            </>
          )}
          {status === "outgoing" && (
            <button
              type="button"
              className="call-btn call-btn-reject call-btn-cancel"
              onClick={onReject}
              aria-label="Cancel call"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
