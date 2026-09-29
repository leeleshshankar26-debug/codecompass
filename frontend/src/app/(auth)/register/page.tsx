'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Compass, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function RegisterPage() {
  const { signUp, user, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(`${basePath}/dashboard/`);
    }
  }, [user, loading, router]);

  const validate = (): string | null => {
    if (!email.includes('@')) return 'Please enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirm) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await signUp(email.trim(), password);
      setSuccess(true);
    } catch (err: unknown) {
      const authError = err as { message?: string };
      setError(authError.message ?? 'Registration failed. Please try again.');
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
            Join <span className="text-brand-400">CodeCompass</span>
          </h1>
          <p className="text-sm text-zinc-400">Free forever — no card required</p>
        </div>

        {/* Success state */}
        {success ? (
          <div className="card flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-400" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Check your inbox
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                We sent a confirmation link to{' '}
                <strong className="text-zinc-200">{email}</strong>.
                Click it to activate your account, then sign in.
              </p>
            </div>
            <Link href={`${basePath}/login/`} className="btn-primary mt-2">
              Go to sign in
            </Link>
          </div>
        ) : (
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
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-zinc-300"
                >
                  Password
                  <span className="ml-1 text-xs text-zinc-500">(min 8 characters)</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
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

              <div>
                <label
                  htmlFor="confirm"
                  className="mb-1.5 block text-sm font-medium text-zinc-300"
                >
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input-base"
                  placeholder="••••••••"
                  disabled={submitting}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !email || !password || !confirm}
                className="btn-primary w-full py-2.5"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" label="Creating account..." />
                    Creating account...
                  </>
                ) : (
                  'Create free account'
                )}
              </button>
            </form>

            <p className="text-center text-sm text-zinc-400">
              Already have an account?{' '}
              <Link
                href={`${basePath}/login/`}
                className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
