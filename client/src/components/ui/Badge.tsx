import React from "react";

interface BadgeProps {
  count: number;
}

const Badge: React.FC<BadgeProps> = ({ count }) => {
  if (count <= 0) return null;
  return (
    <span className="badge">{count > 99 ? "99+" : count}</span>
  );
};

export default Badge;
