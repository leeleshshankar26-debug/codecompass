/**
 * Tiny utility belt — no external dependency needed.
 */

/** Merge class names, filtering falsy values */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Format a date string to a human-readable relative or absolute string */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Debounce a function */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Truncate a string to maxLength with ellipsis */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/** Judge0 status ID → friendly color class */
export function executionStatusColor(statusId: number | undefined): string {
  if (!statusId) return 'text-zinc-400';
  if (statusId === 3) return 'text-green-400';          // Accepted
  if (statusId >= 4 && statusId <= 6) return 'text-yellow-400'; // Wrong Answer / TLE / MLE
  if (statusId >= 7 && statusId <= 12) return 'text-red-400';  // Runtime Error / CE
  return 'text-zinc-400';
}
