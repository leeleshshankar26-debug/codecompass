'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { FullPageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Compass, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── How token exchange works ───────────────────────────────────
//
// Supabase appends the recovery token as a URL hash fragment:
//   /reset-password/#access_token=...&type=recovery
//
// The Supabase JS client on the same page automatically exchanges the
// hash on load and fires PASSWORD_RECOVERY via onAuthStateChange.
// We wait up to TOKEN_TIMEOUT_MS for that event before declaring the
// link expired.
//
// When the link arrives at the homepage (Supabase Site URL) instead,
// page.tsx detects the hash and calls router.replace('/reset-password/' + hash),
// forwarding the fragment so the exchange still happens here.
// ──────────────────────────────────────────────────────────────

const TOKEN_TIMEOUT_MS = 8000; // max wait for Supabase to exchange the hash

type PageState =
  | 'loading'     // Waiting for Supabase to exchange the token
  | 'ready'       // Token valid — show the new-password form
  | 'submitting'  // updateUser in flight
  | 'success'     // Password updated
  | 'expired'     // Token missing, invalid, already used, or timed out
  | 'error';      // Unexpected error during update

function ResetPasswordContent() {
  const { recoveryMode, updatePassword, cancelRecovery, loading: authLoading } = useAuth();
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // Single error string shown in the form regardless of pageState
  const [errorMsg, setErrorMsg] = useState('');

  // Track whether we are in a terminal state that the validation effect
  // must not overwrite.
  const terminalRef = useRef(false);

  // ── Bounded wait for token exchange ───────────────────────
  // Start a timeout the moment the component mounts. If PASSWORD_RECOVERY
  // hasn't fired within TOKEN_TIMEOUT_MS, move to expired.
  // The timeout is cancelled as soon as we reach a non-loading state.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPageState((current) => {
        if (current === 'loading') {
          terminalRef.current = true;
          return 'expired';
        }
        return current;
      });
    }, TOKEN_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, []);

  // ── Primary validation effect ──────────────────────────────
  // Runs when authLoading or recoveryMode changes.
  // Guards terminal states (success, expired, submitting) so it
  // never overwrites them.
  useEffect(() => {
    // Never interfere with terminal or in-flight states
    if (terminalRef.current) return;
    setPageState((current) => {
      if (
        current === 'success' ||
        current === 'expired' ||
        current === 'submitting'
      ) {
        return current; // no-op
      }

      if (authLoading) return 'loading';

      if (recoveryMode) return 'ready';

      // Auth hydration done, no recovery mode.
      // Check if a hash is present — Supabase may still be exchanging it.
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      if (hash.includes('type=recovery') || hash.includes('access_token')) {
        // Hash still present, keep loading — the bounded timeout will rescue us
        return 'loading';
      }

      // No hash, no recovery session — link is expired or never valid
      terminalRef.current = true;
      return 'expired';
    });
  }, [recoveryMode, authLoading]);

  // ── Direct Supabase listener (handles race on direct navigation) ──
  // Registers a second listener in case the component mounts after
  // AuthProvider already processed the PASSWORD_RECOVERY event and the
  // context value hasn't propagated yet. Guards terminal states.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPageState((current) => {
          if (
            current === 'success' ||
            current === 'expired' ||
            current === 'submitting'
          ) {
            return current;
          }
          return 'ready';
        });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Form submission ────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation — show inline errors without changing pageState away from ready
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setPageState('submitting');
    try {
      // updatePassword calls supabase.auth.updateUser({ password })
      // and clears recoveryMode on success.
      // The password is NEVER logged anywhere in this call chain.
      await updatePassword(password);

      // Mark terminal before clearing fields so any stale effect run
      // cannot overwrite the success state.
      terminalRef.current = true;
      setPageState('success');
      setPassword('');
      setConfirm('');
    } catch (err: unknown) {
      const e = err as { message?: string };
      const msg = e.message ?? 'Failed to update password. Please try again.';

      if (
        msg.toLowerCase().includes('expired') ||
        msg.toLowerCase().includes('invalid') ||
        msg.toLowerCase().includes('not found') ||
        msg.toLowerCase().includes('jwt')
      ) {
        terminalRef.current = true;
        setPageState('expired');
      } else {
        setErrorMsg(msg);
        setPageState('error');
      }
    }
  };

  // ── Cancel: sign out first, then navigate ─────────────────
  // Calling cancelRecovery() clears recoveryMode BEFORE we navigate to
  // /login/, so the login page's useEffect does not see recoveryMode:true
  // and loop straight back here.
  const handleCancel = async () => {
    await cancelRecovery();
    router.push('/login/');
  };

  // ── Success sign-in: sign out first ───────────────────────
  // After a successful password update, updatePassword() cleared recoveryMode.
  // However the Supabase session is still active as an authenticated user,
  // so navigating to /login/ would redirect to /dashboard/.
  // We sign out first so the user arrives at a clean login form.
  const handleSignInAfterReset = async () => {
    await cancelRecovery(); // signs out and ensures recoveryMode is false
    router.push('/login/');
  };

  // ── Password strength ──────────────────────────────────────
  const strengthLabel = (): { label: string; color: string } => {
    if (password.length === 0) return { label: '', color: '' };
    if (password.length < 8) return { label: 'Too short', color: 'text-red-400' };
    if (password.length < 12) return { label: 'Fair', color: 'text-yellow-400' };
    if (/[A-Z]/.test(password) && /[0-9]/.test(password))
      return { label: 'Strong', color: 'text-green-400' };
    return { label: 'Good', color: 'text-brand-400' };
  };

  const strength = strengthLabel();

  // ── Render ─────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface-900 px-4">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" label="Verifying reset link..." />
          <p className="text-sm text-zinc-400">Verifying reset link…</p>
        </div>
        {/* Visible retry option in case JS is slow or hash is malformed */}
        <p className="text-xs text-zinc-600">
          Taking too long?{' '}
          <Link
            href="/forgot-password/"
            className="text-brand-400 hover:text-brand-300 transition-colors"
          >
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  if (pageState === 'expired') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-900 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card flex flex-col items-center gap-4 py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-400" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Link expired or invalid</h2>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                This password reset link has expired, already been used, or is invalid.
                Reset links are valid for 1 hour.
              </p>
            </div>
            <Link href="/forgot-password/" className="btn-primary mt-2">
              Request a new link
            </Link>
            <Link
              href="/login/"
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (pageState === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-900 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-400" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Password updated</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Your password has been changed successfully.
                Sign in below with your new password.
              </p>
            </div>
            {/* Signs out before navigating so the login form isn't
                skipped due to an active session */}
            <button onClick={handleSignInAfterReset} className="btn-primary mt-2">
              Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── ready | submitting | error ─────────────────────────────
  // errorMsg is always shown here regardless of whether pageState is
  // 'ready' (validation) or 'error' (server error). This fixes issue #4.
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-900 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <Compass className="h-10 w-10 text-brand-400" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-zinc-100">Set a new password</h1>
          <p className="text-sm text-zinc-400">Choose a strong password for your account.</p>
        </div>

        <div className="card space-y-5">
          {/* Show for both validation errors (ready state) and server errors */}
          {errorMsg && (
            <ErrorBanner
              message={errorMsg}
              onDismiss={() => {
                setErrorMsg('');
                if (pageState === 'error') setPageState('ready');
              }}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* New password */}
            <div>
              <label
                htmlFor="new-password"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                New password
                <span className="ml-1 text-xs text-zinc-500">(min 8 characters)</span>
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    // Clear stale validation error when user starts retyping
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="input-base pr-10"
                  placeholder="••••••••"
                  disabled={pageState === 'submitting'}
                  aria-describedby="password-strength"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {strength.label && (
                <p
                  id="password-strength"
                  className={`mt-1 text-xs ${strength.color}`}
                  aria-live="polite"
                >
                  Strength: {strength.label}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="input-base pr-10"
                  placeholder="••••••••"
                  disabled={pageState === 'submitting'}
                  aria-describedby={
                    confirm && confirm !== password ? 'confirm-mismatch' : undefined
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirm && confirm !== password && (
                <p
                  id="confirm-mismatch"
                  className="mt-1 text-xs text-red-400"
                  aria-live="polite"
                >
                  Passwords do not match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={
                pageState === 'submitting' ||
                !password ||
                !confirm ||
                password !== confirm ||
                password.length < 8
              }
              className="btn-primary w-full py-2.5"
            >
              {pageState === 'submitting' ? (
                <>
                  <LoadingSpinner size="sm" label="Updating password..." />
                  Updating password...
                </>
              ) : (
                'Set new password'
              )}
            </button>
          </form>

          {/* Cancel: signs out first so /login/ doesn't loop back here */}
          <p className="text-center text-sm text-zinc-400">
            <button
              onClick={handleCancel}
              disabled={pageState === 'submitting'}
              className="text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
            >
              Cancel and sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// Suspense boundary required for static export (Next.js 14)
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<FullPageLoader message="Loading..." />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
