'use client';

import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
