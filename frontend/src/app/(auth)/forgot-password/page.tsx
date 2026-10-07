'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Compass, ArrowLeft, MailCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      // Build the redirectTo URL — Supabase embeds this in the reset email.
      // Next.js handles the basePath automatically, so we use window.location.origin
      // plus the raw env var (empty string on localhost).
      const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}${base}/reset-password/`
          : `${base}/reset-password/`;

      await requestPasswordReset(trimmed, redirectTo);
      // Show success regardless — don't reveal whether the email exists
      setSubmitted(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      // Surface genuine errors (network, config) but not account-existence leaks
      const msg = e.message ?? '';
      if (msg.toLowerCase().includes('rate')) {
        setError('Too many requests. Please wait a few minutes and try again.');
      } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
        setError('Network error. Check your connection and try again.');
      } else {
        // For anything else show the success state — avoids user enumeration
        setSubmitted(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-900 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <Compass className="h-10 w-10 text-brand-400" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-zinc-100">Reset your password</h1>
          <p className="text-sm text-zinc-400 text-center">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {submitted ? (
          /* ── Success state ─────────────────────────────────── */
          <div className="card flex flex-col items-center gap-4 py-8 text-center">
            <MailCheck className="h-12 w-12 text-green-400" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Check your inbox</h2>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                If an account exists for{' '}
                <strong className="text-zinc-200">{email.trim()}</strong>, you&apos;ll
                receive a password reset link shortly.
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                The link expires in 1 hour. Check your spam folder if you don&apos;t see it.
              </p>
            </div>
            <Link href="/login/" className="btn-secondary mt-2">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to sign in
            </Link>
          </div>
        ) : (
          /* ── Request form ──────────────────────────────────── */
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

              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="btn-primary w-full py-2.5"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" label="Sending..." />
                    Sending reset link...
                  </>
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>

            <p className="text-center text-sm text-zinc-400">
              <Link
                href="/login/"
                className="inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 font-medium transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back to sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
