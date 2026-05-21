import React from "react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
}

const sizeMap = { sm: 16, md: 28, lg: 44 };

const Spinner: React.FC<SpinnerProps> = ({ size = "md" }) => {
  const px = sizeMap[size];
  return (
    <div
      className="spinner"
      style={{ width: px, height: px }}
      role="status"
      aria-label="Loading"
    />
  );
};

export default Spinner;
