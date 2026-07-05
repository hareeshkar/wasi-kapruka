import React from 'react';

interface WasiRobotAvatarProps {
  size?: number;
  className?: string;
}

/**
 * Wasi avatar — chibi companion, matching the 3D WasiRobot.
 * Micro detail: face screen with iris/pupil/catchlight eyes, SMIL blink,
 * pulsing antenna soul, ear pods, panel seam, bolts, cream belly, hover glow.
 */
export default function WasiRobotAvatar({ size = 28, className = '' }: WasiRobotAvatarProps) {
  // Unique gradient ids per instance so multiple avatars don't collide
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (name: string) => `wasi-${name}-${uid}`;

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
      <defs>
        <linearGradient id={id('bg')} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5B3E8A" />
          <stop offset="100%" stopColor="#402970" />
        </linearGradient>
        <linearGradient id={id('head')} x1="14" y1="13" x2="50" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9B8BBF" />
          <stop offset="55%" stopColor="#7B6BA0" />
          <stop offset="100%" stopColor="#5A4B80" />
        </linearGradient>
        <linearGradient id={id('screen')} x1="32" y1="17" x2="32" y2="33" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#241638" />
          <stop offset="100%" stopColor="#150C22" />
        </linearGradient>
        <linearGradient id={id('body')} x1="22" y1="41" x2="42" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B7BAF" />
          <stop offset="100%" stopColor="#5A4B80" />
        </linearGradient>
        <radialGradient id={id('eye')} cx="0.42" cy="0.38" r="0.75">
          <stop offset="0%" stopColor="#FFF6D8" />
          <stop offset="55%" stopColor="#F5E0A0" />
          <stop offset="100%" stopColor="#D4A84B" />
        </radialGradient>
        <radialGradient id={id('halo')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#E8C96B" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#E8C96B" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background */}
      <circle cx="32" cy="32" r="32" fill={`url(#${id('bg')})`} />

      {/* Hover thruster glow under the body */}
      <ellipse cx="32" cy="59" rx="7.5" ry="1.8" fill={`url(#${id('halo')})`}>
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2.4s" repeatCount="indefinite" />
      </ellipse>

      {/* Antenna — coil stem + pulsing gold soul */}
      <rect x="30.6" y="7" width="2.8" height="8" rx="1.4" fill="#9B8BBF" />
      <ellipse cx="32" cy="11" rx="2.1" ry="0.8" fill="#D4A84B" opacity="0.85" />
      <ellipse cx="32" cy="13" rx="2.1" ry="0.8" fill="#D4A84B" opacity="0.85" />
      <circle cx="32" cy="6.4" r="6" fill={`url(#${id('halo')})`}>
        <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="32" cy="6.4" r="3.2" fill="#E8C96B" />
      <circle cx="31" cy="5.4" r="1.1" fill="#FFF6D8" opacity="0.9" />

      {/* Left mitten arm resting by the body */}
      <ellipse cx="20.5" cy="47.5" rx="3" ry="4" fill="#6A5B90" transform="rotate(14 20.5 47.5)" />
      <circle cx="19.8" cy="50.5" r="2" fill="#9B8BBF" />

      {/* Body — soft egg with cream belly and glowing heart-core */}
      <ellipse cx="32" cy="49" rx="10.5" ry="9.5" fill={`url(#${id('body')})`} />
      <ellipse cx="32" cy="49.8" rx="6.8" ry="6.6" fill="#EDE6F5" opacity="0.9" />
      {/* Waist trim */}
      <path d="M23 52.5 Q32 55.5 41 52.5" stroke="#D4A84B" strokeWidth="0.8" fill="none" opacity="0.7" strokeLinecap="round" />
      {/* Heart-core with breathing halo */}
      <circle cx="32" cy="48.5" r="4.2" fill={`url(#${id('halo')})`}>
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="32" cy="48.5" r="2.3" fill="#E8C96B" />
      <circle cx="31.3" cy="47.8" r="0.8" fill="#FFF6D8" opacity="0.85" />

      {/* Ear pods with gold radar dots */}
      <rect x="10.5" y="22" width="4.5" height="9" rx="2.2" fill="#4A3B70" />
      <rect x="49" y="22" width="4.5" height="9" rx="2.2" fill="#4A3B70" />
      <circle cx="12.7" cy="26.5" r="1.2" fill="#E8C96B" opacity="0.9" />
      <circle cx="51.2" cy="26.5" r="1.2" fill="#E8C96B" opacity="0.9" />

      {/* Head — big chibi dome */}
      <rect x="14" y="13" width="36" height="28" rx="13.5" fill={`url(#${id('head')})`} />
      {/* Crown sheen */}
      <path d="M18 19 Q22 14.5 30 14.2 L34 14.2 Q28 15.5 22 19.5 Z" fill="#B5A8D4" opacity="0.5" />
      {/* Panel seam across the crown */}
      <path d="M16.5 20 Q32 15 47.5 20" stroke="#5A4B80" strokeWidth="0.7" fill="none" opacity="0.8" />
      {/* Micro bolts on the seam */}
      <circle cx="19.5" cy="18.9" r="0.7" fill="#D4A84B" />
      <circle cx="44.5" cy="18.9" r="0.7" fill="#D4A84B" />
      {/* Forehead gem */}
      <path d="M32 14.6 L33.4 16.6 L32 18.6 L30.6 16.6 Z" fill="#E8C96B" />

      {/* Face screen — glass with warm edge */}
      <rect x="18" y="19.5" width="28" height="16.5" rx="8" fill={`url(#${id('screen')})`} stroke="#E8C96B" strokeOpacity="0.22" strokeWidth="0.7" />
      {/* Screen sheen */}
      <path d="M22 21.5 Q32 20 42 21.5 Q32 23.5 22 21.5 Z" fill="#FFFFFF" opacity="0.08" />

      {/* Eyes — gold orbs, iris, pupil, twin catchlights, synced blink */}
      <g>
        <ellipse cx="26.5" cy="27" rx="3.4" ry="3.7" fill={`url(#${id('eye')})`}>
          <animate attributeName="ry" values="3.7;3.7;0.4;3.7;3.7" keyTimes="0;0.90;0.94;0.98;1" dur="4.6s" repeatCount="indefinite" />
        </ellipse>
        <circle cx="26.1" cy="26.7" r="1.25" fill="#2A1B3E">
          <animate attributeName="opacity" values="1;1;0;1;1" keyTimes="0;0.90;0.94;0.98;1" dur="4.6s" repeatCount="indefinite" />
        </circle>
        <circle cx="25.4" cy="25.8" r="0.85" fill="#FFFFFF" opacity="0.95" />
        <circle cx="27.4" cy="27.9" r="0.45" fill="#FFFFFF" opacity="0.55" />

        <ellipse cx="37.5" cy="27" rx="3.4" ry="3.7" fill={`url(#${id('eye')})`}>
          <animate attributeName="ry" values="3.7;3.7;0.4;3.7;3.7" keyTimes="0;0.90;0.94;0.98;1" dur="4.6s" repeatCount="indefinite" />
        </ellipse>
        <circle cx="37.1" cy="26.7" r="1.25" fill="#2A1B3E">
          <animate attributeName="opacity" values="1;1;0;1;1" keyTimes="0;0.90;0.94;0.98;1" dur="4.6s" repeatCount="indefinite" />
        </circle>
        <circle cx="36.4" cy="25.8" r="0.85" fill="#FFFFFF" opacity="0.95" />
        <circle cx="38.4" cy="27.9" r="0.45" fill="#FFFFFF" opacity="0.55" />
      </g>

      {/* Blush — warm and happy */}
      <ellipse cx="21.8" cy="30.2" rx="1.9" ry="1.1" fill="#F0A08C" opacity="0.4" />
      <ellipse cx="42.2" cy="30.2" rx="1.9" ry="1.1" fill="#F0A08C" opacity="0.4" />

      {/* Open happy smile */}
      <path d="M29 31.2 Q32 34.6 35 31.2 Q32 32.2 29 31.2 Z" fill="#E8C96B" />

      {/* Right arm raised, mitten waving HI — pivots at the shoulder */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="-10 42 47; 12 42 47; -10 42 47"
          dur="1.6s"
          repeatCount="indefinite"
        />
        <ellipse cx="45.5" cy="43" rx="2.7" ry="4" fill="#6A5B90" transform="rotate(-38 45.5 43)" />
        <circle cx="47.6" cy="39.8" r="2.3" fill="#9B8BBF" />
        <circle cx="46.9" cy="39.1" r="0.8" fill="#EDE6F5" opacity="0.6" />
      </g>
    </svg>
  );
}
