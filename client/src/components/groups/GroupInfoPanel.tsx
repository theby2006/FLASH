import React, { useState } from "react";
import { Conversation } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { addGroupMember, removeGroupMember } from "../../services/chatService";
import { useChatStore } from "../../store/useChatStore";
import Avatar from "../ui/Avatar";
import Spinner from "../ui/Spinner";

interface GroupInfoPanelProps {
  conversation: Conversation;
  onClose: () => void;
}

const GroupInfoPanel: React.FC<GroupInfoPanelProps> = ({
  conversation,
  onClose,
}) => {
  const { dbUser } = useAuth();
  const { contacts } = useChatStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);

  const myMembership = conversation.members.find((m) => m.userId === dbUser?.id);
  const isAdmin = myMembership?.role === "ADMIN";

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    setLoading(true);
    setError("");
    try {
      await removeGroupMember(conversation.id, userId);
      // Let socket/real-time sync handle UI updates in a full app
      alert("Member removed. Changes will reflect on refresh.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    setLoading(true);
    setError("");
    try {
      await addGroupMember(conversation.id, userId);
      alert("Member added. Changes will reflect on refresh.");
      setShowAddMember(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Leave this group?")) return;
    if (!dbUser) return;
    setLoading(true);
    try {
      await removeGroupMember(conversation.id, dbUser.id);
      window.location.reload();
    } catch {
      setError("Failed to leave group");
      setLoading(false);
    }
  };

  // Contacts who are not currently members
  const availableContacts = contacts.filter(
    (c) => !conversation.members.some((m) => m.userId === c.id)
  );

  return (
    <div className="group-info-panel">
      <div className="group-info-header">
        <h2>Group Info</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="group-info-body">
        <div className="group-hero">
          <Avatar src={conversation.photoURL} name={conversation.name ?? "Group"} size="xl" />
          <h3 className="group-name">{conversation.name}</h3>
          <p className="group-member-count">{conversation.members.length} members</p>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="members-section">
          <div className="members-header">
            <h4>Members</h4>
            {isAdmin && !showAddMember && (
              <button className="add-member-btn" onClick={() => setShowAddMember(true)}>
                + Add
              </button>
            )}
          </div>

          {showAddMember && (
            <div className="add-member-list">
              <h5>Select contact to add:</h5>
              {availableContacts.length === 0 ? (
                <p className="no-contacts-msg">No available contacts to add.</p>
              ) : (
                availableContacts.map((c) => (
                  <button key={c.id} className="contact-row" onClick={() => handleAddMember(c.id)}>
                    <Avatar src={c.photoURL} name={c.displayName} size="sm" />
                    <span>{c.displayName}</span>
                  </button>
                ))
              )}
              <button className="btn-secondary sm" onClick={() => setShowAddMember(false)}>
                Cancel
              </button>
            </div>
          )}

          <ul className="member-list">
            {conversation.members.map((m) => (
              <li key={m.userId} className="member-row">
                <Avatar src={m.user.photoURL} name={m.user.displayName} size="sm" />
                <div className="member-details">
                  <span className="member-name">
                    {m.userId === dbUser?.id ? "You" : m.user.displayName}
                  </span>
                  {m.role === "ADMIN" && <span className="role-badge">Admin</span>}
                </div>
                {isAdmin && m.userId !== dbUser?.id && (
                  <button
                    className="remove-btn"
                    onClick={() => handleRemoveMember(m.userId)}
                    disabled={loading}
                    title="Remove member"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="group-actions">
          <button className="leave-btn" onClick={handleLeave} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Leave Group"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupInfoPanel;
