import React, { useState } from "react";
import { useChatStore } from "../../store/useChatStore";
import { createGroup } from "../../services/chatService";
import Modal from "../ui/Modal";
import Avatar from "../ui/Avatar";
import Spinner from "../ui/Spinner";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose }) => {
  const { contacts, addConversation, setActiveConversationId } = useChatStore();
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleContact = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleCreate = async () => {
    if (!name.trim()) return setError("Group name is required");
    if (selectedIds.size < 1) return setError("Select at least 1 contact");

    setLoading(true);
    setError("");
    try {
      const group = await createGroup(name.trim(), Array.from(selectedIds));
      addConversation(group);
      setActiveConversationId(group.id);
      setName("");
      setSelectedIds(new Set());
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Group">
      <div className="create-group-form">
        <div className="input-group">
          <label htmlFor="group-name">Group Name</label>
          <input
            id="group-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekend Trip"
            maxLength={50}
          />
        </div>

        <div className="input-group">
          <label>Select Members ({selectedIds.size} selected)</label>
          <div className="group-contact-list">
            {contacts.length === 0 ? (
              <p className="no-contacts-msg">No contacts available to add.</p>
            ) : (
              contacts.map((contact) => (
                <button
                  key={contact.id}
                  className={`group-contact-item ${selectedIds.has(contact.id) ? "selected" : ""}`}
                  onClick={() => toggleContact(contact.id)}
                  type="button"
                >
                  <Avatar src={contact.photoURL} name={contact.displayName} size="sm" />
                  <span className="contact-name">{contact.displayName}</span>
                  <div className="checkbox">
                    {selectedIds.has(contact.id) && "✓"}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={loading || !name.trim() || selectedIds.size === 0}
          >
            {loading ? <Spinner size="sm" /> : "Create Group"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateGroupModal;
