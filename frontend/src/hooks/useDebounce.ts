import { useEffect, useRef } from 'react';

/**
 * Returns a debounced version of the callback.
 * Stable reference — safe to use as a useEffect dependency.
 */
export function useDebounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);

  // Keep fnRef current without resetting the debounce timer
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (...args: Parameters<T>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fnRef.current(...args);
    }, delay);
  };
}
