import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
};

export function LoadingSpinner({
  size = 'md',
  className,
  label = 'Loading...',
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn('inline-flex items-center justify-center', className)}
    >
      <div
        className={cn(
          'animate-spin rounded-full border-surface-400 border-t-brand-400',
          sizes[size]
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function FullPageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-900 dark:bg-surface-900 light:bg-zinc-50">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-zinc-400">{message}</p>
      </div>
    </div>
  );
}
