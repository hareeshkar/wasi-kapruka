import React from 'react';

interface WasiRobotAvatarProps {
  size?: number;
  className?: string;
}

export default function WasiRobotAvatar({ size = 28, className = '' }: WasiRobotAvatarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block' }}
    >
      {/* Background circle — warm violet */}
      <circle cx="32" cy="32" r="32" fill="url(#wasiBg)" />

      {/* Antenna stem */}
      <rect x="30" y="8" width="4" height="10" rx="2" fill="#9B8BBF" />

      {/* Antenna ball — gold soul */}
      <circle cx="32" cy="8" r="4" fill="#E8C96B" />
      <circle cx="31" cy="7" r="1.5" fill="#F5E0A0" opacity="0.7" />

      {/* Head — rounded square */}
      <rect x="17" y="16" width="30" height="24" rx="10" fill="#7B6BA0" />

      {/* Head highlight */}
      <rect x="19" y="18" width="26" height="10" rx="6" fill="#9B8BBF" opacity="0.3" />

      {/* Visor — dark area */}
      <rect x="21" y="22" width="22" height="12" rx="6" fill="#1A1028" />

      {/* Left eye — gold */}
      <ellipse cx="28" cy="28" rx="3.2" ry="3.5" fill="#E8C96B" />
      <ellipse cx="27.5" cy="27.5" rx="1.2" ry="1.3" fill="#F5E0A0" opacity="0.8" />

      {/* Right eye — gold */}
      <ellipse cx="36" cy="28" rx="3.2" ry="3.5" fill="#E8C96B" />
      <ellipse cx="35.5" cy="27.5" rx="1.2" ry="1.3" fill="#F5E0A0" opacity="0.8" />

      {/* Mouth — subtle smile */}
      <path d="M29 32 Q32 34.5 35 32" stroke="#E8C96B" strokeWidth="1.2" fill="none" strokeLinecap="round" />

      {/* Body — tapered */}
      <path d="M22 40 Q22 46 26 48 L38 48 Q42 46 42 40 Z" fill="#7B6BA0" />

      {/* Body highlight */}
      <path d="M24 41 Q24 45 27 46 L37 46 Q40 45 40 41 Z" fill="#9B8BBF" opacity="0.25" />

      {/* Core glow — gold */}
      <circle cx="32" cy="43" r="2.5" fill="#E8C96B" opacity="0.8" />
      <circle cx="32" cy="43" r="1.2" fill="#F5E0A0" opacity="0.6" />

      {/* Cheek blush — subtle warmth */}
      <circle cx="23" cy="30" r="2" fill="#D4A84B" opacity="0.15" />
      <circle cx="41" cy="30" r="2" fill="#D4A84B" opacity="0.15" />

      <defs>
        <linearGradient id="wasiBg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5B3E8A" />
          <stop offset="100%" stopColor="#402970" />
        </linearGradient>
      </defs>
    </svg>
  );
}
