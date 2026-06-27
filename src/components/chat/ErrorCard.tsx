import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, MessageSquarePlus, Wifi, Clock, ShieldAlert, AlertTriangle } from 'lucide-react';

interface ErrorInfo {
  message: string;
  category: string;
  isRetryable: boolean;
  retryAfterMs?: number;
}

interface ErrorCardProps {
  error: ErrorInfo;
  isRetrying?: boolean;
  onRetry: () => void;
  onNewChat?: () => void;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Wifi; label: string }> = {
  network:     { icon: Wifi,          label: 'Connection issue' },
  timeout:     { icon: Clock,         label: 'Request timed out' },
  rate_limit:  { icon: ShieldAlert,   label: 'Rate limited' },
  server:      { icon: AlertTriangle, label: 'Server error' },
  auth:        { icon: ShieldAlert,   label: 'Authentication' },
  unknown:     { icon: AlertTriangle, label: 'Something went wrong' },
};

export default function ErrorCard({ error, isRetrying, onRetry, onNewChat }: ErrorCardProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onRetryRef = useRef(onRetry);
  onRetryRef.current = onRetry;

  const config = CATEGORY_CONFIG[error.category] || CATEGORY_CONFIG.unknown;
  const Icon = config.icon;

  // Auto-retry countdown — side effect in useEffect, not in state updater
  useEffect(() => {
    if (error.isRetryable && error.retryAfterMs && !isRetrying) {
      const seconds = Math.ceil(error.retryAfterMs / 1000);
      setCountdown(seconds);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev !== null && prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [error.retryAfterMs, error.isRetryable, isRetrying]);

  // Trigger retry when countdown hits 0
  useEffect(() => {
    if (countdown === 0 && error.isRetryable && !isRetrying) {
      onRetryRef.current();
    }
  }, [countdown, error.isRetryable, isRetrying]);

  return (
    <div className={`error-card ${isRetrying ? 'error-card-retrying' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="error-card-icon">
          <Icon className="w-4 h-4" style={{ color: '#9f1239' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="error-card-title">{config.label}</p>
          <p className="error-card-body">{error.message}</p>

          <div className="flex items-center gap-2 mt-3">
            {error.isRetryable && (
              <button onClick={onRetry} className="error-card-btn error-btn-retry" disabled={isRetrying}>
                <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying
                  ? 'Retrying...'
                  : countdown !== null && countdown > 0
                    ? `Retrying in ${countdown}s`
                    : 'Try again'}
              </button>
            )}
            {onNewChat && (
              <button onClick={onNewChat} className="error-card-btn error-btn-newchat">
                <MessageSquarePlus className="w-3 h-3" />
                New chat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
