import React, { useState } from "react";
import CreateGroupModal from "./CreateGroupModal";

const GroupList: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="group-list-wrapper">
      <button className="create-group-trigger" onClick={() => setIsModalOpen(true)}>
        <span className="plus-icon">+</span>
        <span>New Group</span>
      </button>

      <CreateGroupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default GroupList;
