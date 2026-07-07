/**
 * LiveControlBar — replaces the text composer row while a Gemini Live
 * voice session is active. Renders inline (same layout slot as the
 * composer), no overlay/backdrop, so the rest of the chat stays visible
 * and legible while the user talks.
 *
 * The "soul orb" reuses Wasi's own established gold/violet identity
 * (see WasiRobot.tsx's GOLD_SOUL) rather than a generic waveform or a
 * literal copy of iOS's rainbow Siri orb — same character, just active.
 */
import { motion } from 'motion/react';
import { Mic, MicOff, PhoneOff } from 'lucide-react';

export interface LiveControlBarProps {
  state: 'idle' | 'connecting' | 'active' | 'disconnecting' | 'error';
  isMuted: boolean;
  elapsedLabel: string;
  onToggleMic: () => void;
  onEnd: () => void;
}

const STATE_LABELS: Record<LiveControlBarProps['state'], string> = {
  idle: 'Ending…',
  connecting: 'Connecting…',
  active: 'Listening…',
  disconnecting: 'Ending…',
  error: 'Voice error',
};

function SoulOrb({ state, isMuted }: { state: LiveControlBarProps['state']; isMuted: boolean }) {
  const isError = state === 'error';
  const isLive = state === 'active' && !isMuted;

  return (
    <div className="relative w-7 h-7 shrink-0 rounded-full" aria-hidden="true">
      {/* Base — same violet gradient family as the composer's send button */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: isError
            ? 'linear-gradient(135deg, #f43f5e 0%, #9f1239 100%)'
            : 'linear-gradient(135deg, #5B3E8A 0%, #402970 50%, #2D1B69 100%)',
          boxShadow: isLive ? '0 0 12px rgba(232,201,107,0.45)' : '0 2px 8px rgba(64,41,112,0.25)',
        }}
      />
      {/* Gold sheen ring — rotates while live, static glow otherwise */}
      <motion.div
        className="absolute inset-[-2px] rounded-full motion-reduce:animate-none"
        style={{
          background: 'conic-gradient(from 0deg, #E8C96B, transparent 30%, transparent 70%, #E8C96B)',
          opacity: isError ? 0 : isLive ? 0.9 : 0.35,
          maskImage: 'radial-gradient(circle, transparent 55%, black 58%)',
          WebkitMaskImage: 'radial-gradient(circle, transparent 55%, black 58%)',
        }}
        animate={isLive ? { rotate: 360 } : { rotate: 0 }}
        transition={isLive ? { duration: 1.6, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
      />
    </div>
  );
}

export default function LiveControlBar({ state, isMuted, elapsedLabel, onToggleMic, onEnd }: LiveControlBarProps) {
  const isBusy = state === 'connecting' || state === 'disconnecting';

  return (
    <div
      className="flex items-center w-full rounded-full gap-2 px-3"
      style={{
        minHeight: '54px',
        background: 'rgba(255,255,255,0.80)',
        backdropFilter: 'blur(12px)',
        border: state === 'error' ? '1.5px solid rgba(244,63,94,0.30)' : '1.5px solid rgba(139,92,246,0.25)',
        boxShadow: '0 6px 28px rgba(139,92,246,0.08)',
      }}
      role="status"
      aria-live="polite"
    >
      <SoulOrb state={state} isMuted={isMuted} />

      <span className={`text-[13.5px] font-medium flex-1 truncate ${state === 'error' ? 'text-rose-600' : 'text-ink'}`}>
        {STATE_LABELS[state]}
      </span>

      {state === 'active' && (
        <span className="text-[11px] tabular-nums text-ink-faint font-mono shrink-0">{elapsedLabel}</span>
      )}

      <button
        type="button"
        onClick={onToggleMic}
        disabled={!(state === 'active')}
        title={isMuted ? 'Unmute mic' : 'Mute mic'}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-30 ${
          isMuted ? 'bg-gray-200 text-gray-500' : 'bg-violet-tint text-violet'
        }`}
      >
        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>

      <button
        type="button"
        onClick={onEnd}
        disabled={isBusy}
        title="End live session"
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-rose-500 text-white transition-all disabled:opacity-40"
      >
        <PhoneOff className="w-4 h-4" />
      </button>
    </div>
  );
}
