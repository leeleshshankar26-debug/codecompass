'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /**
   * True while a PASSWORD_RECOVERY session is active for the current user.
   *
   * Set to true only on PASSWORD_RECOVERY.
   *
   * Cleared by:
   *   - updatePassword()   — successful password change
   *   - cancelRecovery()   — user cancels the reset form
   *   - signOut()          — session ended
   *   - SIGNED_IN event    — ONLY when the incoming session belongs to a
   *                          different user than the active recovery session,
   *                          indicating a deliberate new login or account switch.
   *                          A SIGNED_IN event for the same user as the active
   *                          recovery session is the Supabase bootstrap sequence
   *                          and must NOT clear the flag.
   *
   * NOT cleared by TOKEN_REFRESHED, INITIAL_SESSION, MFA_CHALLENGE_VERIFIED,
   * USER_UPDATED or any other bookkeeping event that fires inside the same
   * recovery session.
   */
  recoveryMode: boolean;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Send a password-reset email.
   * redirectTo must be the full URL of /reset-password/.
   * Never logs the email.
   */
  requestPasswordReset: (email: string, redirectTo: string) => Promise<void>;
  /**
   * Set a new password for the current recovery session.
   * Clears recoveryMode on success. Never logs the password.
   */
  updatePassword: (password: string) => Promise<void>;
  /**
   * Explicitly cancel an active recovery session.
   * Signs the user out (removing the recovery token) and clears recoveryMode
   * BEFORE returning, so any navigation that follows sees the clean state.
   */
  cancelRecovery: () => Promise<void>;
}

type AuthContextValue = AuthState & AuthActions;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    recoveryMode: false,
  });

  // recoveryModeRef mirrors recoveryMode in state so the onAuthStateChange
  // callback can read the latest value without stale-closure risk.
  const recoveryModeRef = useRef(false);

  // recoveryUserIdRef holds the user.id of the active recovery session.
  // We use it to distinguish "same-session SIGNED_IN" (Supabase bootstrap)
  // from "new-login SIGNED_IN" (user signed in with different credentials).
  const recoveryUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Hydrate the session on mount.
    // recoveryMode is NOT set here — onAuthStateChange is the authoritative
    // source for that flag.
    supabase.auth.getSession().then(({ data }) => {
      setState((prev) => ({
        ...prev,
        user: data.session?.user ?? null,
        session: data.session ?? null,
        loading: false,
      }));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // ── PASSWORD_RECOVERY ─────────────────────────────────
        if (event === 'PASSWORD_RECOVERY') {
          recoveryModeRef.current = true;
          recoveryUserIdRef.current = session?.user?.id ?? null;
          setState({
            user: session?.user ?? null,
            session: session ?? null,
            loading: false,
            recoveryMode: true,
          });
          return;
        }

        // ── SIGNED_OUT ────────────────────────────────────────
        if (event === 'SIGNED_OUT') {
          recoveryModeRef.current = false;
          recoveryUserIdRef.current = null;
          setState({
            user: null,
            session: null,
            loading: false,
            recoveryMode: false,
          });
          return;
        }

        // ── SIGNED_IN ─────────────────────────────────────────
        // Only clear recoveryMode when this sign-in is for a DIFFERENT user
        // than the active recovery session.
        //
        // Rationale: Supabase fires SIGNED_IN immediately after
        // PASSWORD_RECOVERY for the same user as part of its bootstrap
        // sequence. Clearing recoveryMode on that event would race the
        // reset page's PASSWORD_RECOVERY handler.
        //
        // A SIGNED_IN for a different userId (or no recovery session active)
        // means a genuine new login — safe to clear.
        if (event === 'SIGNED_IN') {
          const incomingUserId = session?.user?.id ?? null;
          const isBootstrapSignIn =
            recoveryModeRef.current &&
            incomingUserId !== null &&
            incomingUserId === recoveryUserIdRef.current;

          if (isBootstrapSignIn) {
            // Same user, same recovery session — preserve recoveryMode
            setState((prev) => ({
              user: session?.user ?? null,
              session: session ?? null,
              loading: false,
              recoveryMode: prev.recoveryMode,
            }));
          } else {
            // Different user or no active recovery — this is a new login
            recoveryModeRef.current = false;
            recoveryUserIdRef.current = null;
            setState({
              user: session?.user ?? null,
              session: session ?? null,
              loading: false,
              recoveryMode: false,
            });
          }
          return;
        }

        // ── All other events ──────────────────────────────────
        // TOKEN_REFRESHED, INITIAL_SESSION, MFA_CHALLENGE_VERIFIED,
        // USER_UPDATED, etc. — bookkeeping events inside the same session.
        // Preserve recoveryMode exactly as-is.
        setState((prev) => ({
          user: session?.user ?? null,
          session: session ?? null,
          loading: false,
          recoveryMode: prev.recoveryMode,
        }));
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // onAuthStateChange fires SIGNED_IN with a different userId than any
    // prior recovery session → recoveryMode cleared ✓
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== 'undefined'
            ? `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH || ''}/dashboard/`
            : undefined,
      },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    // Clear the flags synchronously before the Supabase call so any
    // navigation that follows this await sees clean state immediately.
    recoveryModeRef.current = false;
    recoveryUserIdRef.current = null;
    setState((prev) => ({ ...prev, recoveryMode: false }));
    await supabase.auth.signOut();
    // onAuthStateChange fires SIGNED_OUT → also clears recoveryMode ✓
  }, []);

  const requestPasswordReset = useCallback(
    async (email: string, redirectTo: string) => {
      // Do NOT log email — it is PII
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
    },
    []
  );

  const updatePassword = useCallback(async (password: string) => {
    // Do NOT log the password under any circumstances
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    // Clear recovery mode synchronously — the session is now a normal
    // authenticated session (not a recovery session).
    recoveryModeRef.current = false;
    recoveryUserIdRef.current = null;
    setState((prev) => ({ ...prev, recoveryMode: false }));
  }, []);

  const cancelRecovery = useCallback(async () => {
    // Clear flags synchronously first so any code awaiting this function
    // sees recoveryMode:false immediately before navigating.
    recoveryModeRef.current = false;
    recoveryUserIdRef.current = null;
    setState((prev) => ({ ...prev, recoveryMode: false }));
    await supabase.auth.signOut();
    // onAuthStateChange fires SIGNED_OUT — state already correct ✓
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
        requestPasswordReset,
        updatePassword,
        cancelRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
