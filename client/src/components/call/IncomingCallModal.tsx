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
  const title =
    status === "outgoing"
      ? `Calling ${session.remoteDisplayName}…`
      : `Incoming ${isVideo ? "video" : "voice"} call`;

  return (
    <div className="call-modal-backdrop" role="dialog" aria-modal="true">
      <div className="call-modal">
        <Avatar name={session.remoteDisplayName} size="xl" />
        <h2 className="call-modal-title">{session.remoteDisplayName}</h2>
        <p className="call-modal-subtitle">{title}</p>
        {error && <p className="call-modal-error">{error}</p>}
        <div className="call-modal-actions">
          {status === "incoming" && (
            <>
              <button
                type="button"
                className="call-btn call-btn-reject"
                onClick={onReject}
                aria-label="Decline call"
              >
                ✕
              </button>
              <button
                type="button"
                className="call-btn call-btn-accept"
                onClick={onAccept}
                aria-label="Accept call"
              >
                ✓
              </button>
            </>
          )}
          {status === "outgoing" && (
            <button
              type="button"
              className="call-btn call-btn-reject"
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
