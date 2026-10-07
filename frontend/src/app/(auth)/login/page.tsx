'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Compass, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { signIn, user, loading, recoveryMode } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Redirect already-authenticated, non-recovery users to dashboard.
  //
  // Guard: do NOT redirect when recoveryMode is true. A PASSWORD_RECOVERY
  // session sets user non-null but the user intends to reset their password,
  // not use the app normally. cancelRecovery() / the reset page handles
  // clearing recoveryMode before sending the user here, so by the time
  // this effect runs recoveryMode should be false for intentional navigations.
  useEffect(() => {
    if (!loading && user && !recoveryMode) {
      router.replace('/dashboard/');
    }
  }, [user, loading, recoveryMode, router]);

  // NOTE: We intentionally do NOT add a second effect that redirects
  // recoveryMode users to /reset-password/. That would create a loop when
  // cancel/sign-in navigates here. cancelRecovery() clears the flag before
  // navigating, so recoveryMode will be false when this page renders.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
      router.push('/dashboard/');
    } catch (err: unknown) {
      const authError = err as { message?: string };
      setError(authError.message ?? 'Sign in failed. Check your email and password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-900 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <Compass className="h-10 w-10 text-brand-400" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-zinc-100">
            Welcome back to <span className="text-brand-400">CodeCompass</span>
          </h1>
          <p className="text-sm text-zinc-400">Sign in to continue learning</p>
        </div>

        {/* Card */}
        <div className="card space-y-5">
          {error && (
            <ErrorBanner message={error} onDismiss={() => setError('')} />
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                placeholder="you@example.com"
                disabled={submitting}
              />
            </div>

            <div>
              {/* Password label row — label left, forgot link right */}
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-zinc-300"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password/"
                  className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base pr-10"
                  placeholder="••••••••"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="btn-primary w-full py-2.5"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" label="Signing in..." />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-zinc-400">
            Don&apos;t have an account?{' '}
            <Link
              href="/register/"
              className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
            >
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
