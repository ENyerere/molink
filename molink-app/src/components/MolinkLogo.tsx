import React from "react";

interface MolinkLogoProps {
  size?: number;
  className?: string;
  variant?: "default" | "mono" | "pure";
}

export const MolinkLogo: React.FC<MolinkLogoProps> = ({
  size = 32,
  className = "",
  variant = "default",
}) => {
  const isMono = variant === "mono";
  const isPure = variant === "pure";
  const showBg = variant === "default";

  const leftColor = isMono ? "currentColor" : "#3b82f6";
  const rightColor = isMono ? "currentColor" : "#60a5fa";
  const midColor = isMono ? "currentColor" : "#3b82f6";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {showBg && (
        <rect
          x="16"
          y="16"
          width="480"
          height="480"
          rx="112"
          fill="#09090b"
        />
      )}

      {/* 左竖条 */}
      <rect
        x="136"
        y="116"
        width="72"
        height="296"
        rx="36"
        fill={leftColor}
        opacity={isMono ? 1 : 0.95}
      />

      {/* 右竖条 */}
      <rect
        x="304"
        y="116"
        width="72"
        height="296"
        rx="36"
        fill={rightColor}
        opacity={isMono ? 0.7 : 0.95}
      />

      {/* 中间连接块 */}
      <path
        d="M 208 116 L 256 232 L 304 116 Z"
        fill={midColor}
        opacity={isMono ? 0.85 : 0.95}
      />
    </svg>
  );
};

export default MolinkLogo;
