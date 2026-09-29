'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { FullPageLoader } from './LoadingSpinner';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Wraps a page/section that requires authentication.
 * Redirects to /login if the user is not signed in.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`${basePath}/login/`);
    }
  }, [user, loading, router]);

  if (loading) return <FullPageLoader message="Checking authentication..." />;
  if (!user) return <FullPageLoader message="Redirecting to login..." />;

  return <>{children}</>;
}
