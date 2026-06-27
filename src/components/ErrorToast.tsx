import React, { useEffect, useState } from 'react';
import { AlertCircle, X, RefreshCw } from 'lucide-react';

interface ErrorToastProps {
  message: string;
  category?: string;
  isRetryable?: boolean;
  onRetry?: () => void;
  onDismiss: () => void;
  duration?: number;
}

const CATEGORY_MESSAGES: Record<string, { title: string; color: string }> = {
  auth: { title: 'Authentication Error', color: '#DC3545' },
  rate_limit: { title: 'Rate Limited', color: '#FFC107' },
  quota: { title: 'Quota Exceeded', color: '#DC3545' },
  network: { title: 'Network Error', color: '#6C757D' },
  server: { title: 'Server Error', color: '#DC3545' },
  validation: { title: 'Invalid Request', color: '#FFC107' },
  not_found: { title: 'Not Found', color: '#6C757D' },
  unknown: { title: 'Error', color: '#DC3545' },
};

export default function ErrorToast({
  message,
  category = 'unknown',
  isRetryable = true,
  onRetry,
  onDismiss,
  duration = 5000,
}: ErrorToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const { title, color } = CATEGORY_MESSAGES[category] || CATEGORY_MESSAGES.unknown;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onDismiss, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 300);
  };

  const handleRetry = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
      onRetry?.();
    }, 300);
  };

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
    >
      <div
        className="rounded-xl shadow-lg border overflow-hidden"
        style={{
          background: 'white',
          borderColor: color,
          boxShadow: `0 4px 20px ${color}20`,
        }}
      >
        <div className="flex items-start p-3 gap-3">
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: `${color}15` }}
          >
            <AlertCircle className="w-4 h-4" style={{ color }} />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{message}</p>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isRetryable && onRetry && (
          <div className="px-3 pb-3">
            <button
              onClick={handleRetry}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors"
              style={{ background: color }}
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}