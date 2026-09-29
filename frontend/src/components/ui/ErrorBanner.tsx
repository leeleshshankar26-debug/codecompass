import { AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
  variant?: 'error' | 'warning' | 'info';
}

const variantStyles = {
  error: 'border-red-500/30 bg-red-500/10 text-red-400',
  warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  info: 'border-brand-500/30 bg-brand-500/10 text-brand-400',
};

export function ErrorBanner({
  message,
  onDismiss,
  className,
  variant = 'error',
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
        variantStyles[variant],
        className
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="flex-1 leading-relaxed">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
