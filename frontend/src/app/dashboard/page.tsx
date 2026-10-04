'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ui/ProtectedRoute';
import { Navbar } from '@/components/ui/Navbar';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getSessions, createSession, deleteSession } from '@/lib/api';
import { formatDate, truncate } from '@/lib/utils';
import { LANGUAGE_MAP, LANGUAGES } from '@/lib/languages';
import type { LearningSession, Language } from '@/types';
import {
  Plus,
  Trash2,
  MessageSquare,
  Code2,
  Compass,
  ChevronRight,
} from 'lucide-react';

const LANG_COLORS: Record<Language, string> = {
  python: 'bg-blue-500/20 text-blue-300',
  javascript: 'bg-yellow-500/20 text-yellow-300',
  java: 'bg-orange-500/20 text-orange-300',
  cpp: 'bg-purple-500/20 text-purple-300',
};

function NewSessionModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (lang: Language) => Promise<void>;
}) {
  const [selectedLang, setSelectedLang] = useState<Language>('python');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    await onCreate(selectedLang);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-session-title"
    >
      <div className="w-full max-w-sm card space-y-5">
        <h2 id="new-session-title" className="text-lg font-semibold text-zinc-100">
          New Learning Session
        </h2>
        <p className="text-sm text-zinc-400">Choose a programming language to start with:</p>

        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => setSelectedLang(lang.id)}
              className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors text-left ${
                selectedLang === lang.id
                  ? 'border-brand-500 bg-brand-600/20 text-brand-300'
                  : 'border-surface-400 text-zinc-300 hover:border-surface-300 hover:bg-surface-600'
              }`}
            >
              <Code2 className="mb-1 h-4 w-4" aria-hidden="true" />
              {lang.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1" disabled={creating}>
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="btn-primary flex-1"
          >
            {creating ? <LoadingSpinner size="sm" label="Creating..." /> : null}
            {creating ? 'Creating...' : 'Start Session'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();

  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to load sessions');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreate = async (language: Language) => {
    try {
      const session = await createSession(language);
      router.push(`/tutor/?session=${session.id}`);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to create session');
      setShowNewModal(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this session? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await deleteSession(id);
      setSessions((s) => s.filter((x) => x.id !== id));
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to delete session');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Your Sessions</h1>
            <p className="mt-1 text-sm text-zinc-400">
              {user?.email && `Signed in as ${user.email}`}
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="btn-primary"
            aria-label="Create new session"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Session
          </button>
        </div>

        {error && (
          <ErrorBanner message={error} onDismiss={() => setError('')} className="mb-6" />
        )}

        {/* Sessions list */}
        {loadingList ? (
          <div className="flex items-center justify-center py-24">
            <LoadingSpinner size="lg" label="Loading sessions..." />
          </div>
        ) : sessions.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-surface-500 py-24 text-center">
            <Compass className="mb-4 h-12 w-12 text-zinc-600" aria-hidden="true" />
            <h2 className="mb-2 text-lg font-medium text-zinc-300">
              No sessions yet
            </h2>
            <p className="mb-6 text-sm text-zinc-500">
              Start your first learning session and let CodeCompass guide you.
            </p>
            <button onClick={() => setShowNewModal(true)} className="btn-primary">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create your first session
            </button>
          </div>
        ) : (
          <ul className="space-y-3" role="list">
            {sessions.map((session) => {
              const langConfig = LANGUAGE_MAP[session.language as Language];
              return (
                <li key={session.id}>
                  <div className="group card flex items-center gap-4 hover:border-surface-400 transition-colors">
                    {/* Language badge */}
                    <div
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${
                        LANG_COLORS[session.language as Language] ?? 'bg-zinc-500/20 text-zinc-300'
                      }`}
                    >
                      {langConfig?.label ?? session.language}
                    </div>

                    {/* Session info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-100 truncate">
                        {truncate(session.title, 60)}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                        <span>{formatDate(session.updatedAt)}</span>
                        {session._count && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" aria-hidden="true" />
                            {session._count.messages} messages
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDelete(session.id)}
                        disabled={deletingId === session.id}
                        aria-label={`Delete session: ${session.title}`}
                        className="rounded-lg p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        {deletingId === session.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                      <Link
                        href={`/tutor/?session=${session.id}`}
                        aria-label={`Open session: ${session.title}`}
                        className="btn-secondary px-3 py-1.5 text-xs"
                      >
                        Open
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {showNewModal && (
        <NewSessionModal
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
