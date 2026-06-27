import { useState, useEffect } from 'react';
import WasiRobotAvatar from '../WasiRobotAvatar';

const THINKING_PHRASES = [
  'Searching for the best options',
  'Looking through Kapruka\'s catalog',
  'Finding the perfect match',
  'Checking availability & prices',
  'Curating recommendations',
  'Exploring gift ideas',
];

interface ThinkingIndicatorProps {
  lang?: 'en' | 'si' | 'ta';
}

export default function ThinkingIndicator({ lang = 'en' }: ThinkingIndicatorProps) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx(i => (i + 1) % THINKING_PHRASES.length);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">
        <WasiRobotAvatar size={28} />
      </div>
      <div className="flex flex-col gap-2 py-1">
        <div className="thinking-indicator">
          <span className="thinking-dot" />
          <span className="thinking-dot" />
          <span className="thinking-dot" />
          <span className="thinking-text">{THINKING_PHRASES[idx]}</span>
        </div>
        <div className="thinking-shimmer" />
      </div>
    </div>
  );
}
