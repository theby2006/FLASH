import React from "react";
import { getInitials } from "../../utils/formatTime";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  isOnline?: boolean;
}

const sizeMap = {
  sm: 32,
  md: 40,
  lg: 52,
  xl: 72,
};

const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = "md",
  isOnline,
}) => {
  const px = sizeMap[size];
  const fontSize = px * 0.35;

  return (
    <div className="avatar-wrapper" style={{ width: px, height: px }}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="avatar-img"
          style={{ width: px, height: px, fontSize }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div
          className="avatar-fallback"
          style={{ width: px, height: px, fontSize }}
        >
          {getInitials(name)}
        </div>
      )}
      {isOnline !== undefined && (
        <span className={`avatar-presence ${isOnline ? "online" : "offline"}`} />
      )}
    </div>
  );
};

export default Avatar;
