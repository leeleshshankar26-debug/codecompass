'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { ProtectedRoute } from '@/components/ui/ProtectedRoute';
import { Navbar } from '@/components/ui/Navbar';
import { Sun, Moon, LogOut, User, Shield } from 'lucide-react';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

function SettingsContent() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push(`${basePath}/`);
  };

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-8 text-2xl font-bold text-zinc-100">Settings</h1>

        <div className="space-y-6">

          {/* Account section */}
          <section className="card space-y-4">
            <div className="flex items-center gap-3 border-b border-surface-600 pb-4">
              <User className="h-5 w-5 text-brand-400" aria-hidden="true" />
              <h2 className="font-semibold text-zinc-100">Account</h2>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">
                Signed in as
              </p>
              <p className="text-sm text-zinc-200">{user?.email}</p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">
                User ID
              </p>
              <p className="font-mono text-xs text-zinc-400 break-all">
                {user?.id}
              </p>
            </div>

            <button
              onClick={handleSignOut}
              className="btn-danger flex items-center gap-2"
              aria-label="Sign out of your account"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </section>

          {/* Appearance section */}
          <section className="card space-y-4">
            <div className="flex items-center gap-3 border-b border-surface-600 pb-4">
              <Sun className="h-5 w-5 text-brand-400" aria-hidden="true" />
              <h2 className="font-semibold text-zinc-100">Appearance</h2>
            </div>

            <p className="text-sm text-zinc-400">Choose your preferred color scheme.</p>

            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Color theme">
              {/* Dark theme */}
              <button
                role="radio"
                aria-checked={theme === 'dark'}
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                  theme === 'dark'
                    ? 'border-brand-500 bg-brand-600/10'
                    : 'border-surface-400 hover:border-surface-300 hover:bg-surface-700'
                }`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-700">
                  <Moon className="h-4 w-4 text-zinc-300" aria-hidden="true" />
                </div>
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-brand-300' : 'text-zinc-200'}`}>
                    Dark
                  </p>
                  <p className="text-xs text-zinc-500">Easy on the eyes</p>
                </div>
              </button>

              {/* Light theme */}
              <button
                role="radio"
                aria-checked={theme === 'light'}
                onClick={() => setTheme('light')}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                  theme === 'light'
                    ? 'border-brand-500 bg-brand-600/10'
                    : 'border-surface-400 hover:border-surface-300 hover:bg-surface-700'
                }`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-zinc-200">
                  <Sun className="h-4 w-4 text-yellow-500" aria-hidden="true" />
                </div>
                <div>
                  <p className={`text-sm font-medium ${theme === 'light' ? 'text-brand-300' : 'text-zinc-200'}`}>
                    Light
                  </p>
                  <p className="text-xs text-zinc-500">High contrast</p>
                </div>
              </button>
            </div>
          </section>

          {/* Privacy section */}
          <section className="card space-y-4">
            <div className="flex items-center gap-3 border-b border-surface-600 pb-4">
              <Shield className="h-5 w-5 text-brand-400" aria-hidden="true" />
              <h2 className="font-semibold text-zinc-100">Privacy</h2>
            </div>
            <div className="space-y-3 text-sm text-zinc-400">
              <p>
                CodeCompass stores your learning sessions, code, and chat history to let you
                continue where you left off. All data is associated with your account.
              </p>
              <p>
                No personally identifiable information is sent to the AI provider.
                Your code and messages are transmitted only as context for the tutoring session.
              </p>
              <p>
                Monitoring is disabled by default. If your administrator has enabled Sentry or
                PostHog, error traces and usage events may be collected — code content and chat
                messages are never captured.
              </p>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
