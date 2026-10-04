'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ui/ProtectedRoute';
import { Navbar } from '@/components/ui/Navbar';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { FullPageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CodeEditor } from '@/components/tutor/CodeEditor';
import { ExecutionPanel } from '@/components/tutor/ExecutionPanel';
import { ChatPanel } from '@/components/tutor/ChatPanel';
import { getSession, executeCode, saveCode } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { LANGUAGE_MAP, LANGUAGES } from '@/lib/languages';
import { useDebounce } from '@/hooks/useDebounce';
import type { LearningSession, Language, ExecutionResult } from '@/types';
import { Play, ChevronDown, Code2, MessageSquare, PanelLeftClose, PanelRightClose } from 'lucide-react';
import { cn } from '@/lib/utils';

// Autosave debounce delay in milliseconds
const AUTOSAVE_DELAY = 1500;

function TutorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const sessionId = searchParams.get('session');

  const [session, setSession] = useState<LearningSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<Language>('python');
  const [stdin, setStdin] = useState('');

  const [execResult, setExecResult] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState('');

  const [authToken, setAuthToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Mobile tab state
  const [activeTab, setActiveTab] = useState<'editor' | 'chat'>('editor');
  const [chatCollapsed, setChatCollapsed] = useState(false);

  // ── Load session ────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) {
      router.replace('/dashboard/');
      return;
    }

    getSession(sessionId)
      .then((s) => {
        setSession(s);
        setLanguage(s.language as Language);
        if (s.codeState) {
          setCode(s.codeState.code);
          setStdin(s.codeState.stdin ?? '');
          if (s.codeState.lastExecStatus) {
            setExecResult({
              status: s.codeState.lastExecStatus,
              statusId: 0,
              stdout: s.codeState.lastExecOutput ?? '',
              stderr: s.codeState.lastExecStderr ?? '',
              compileOutput: '',
              time: s.codeState.lastExecTime ?? '',
              memory: s.codeState.lastExecMemory ?? '',
            });
          }
        } else {
          // New session — use starter code
          const langConf = LANGUAGE_MAP[s.language as Language];
          setCode(langConf?.starterCode ?? '');
        }
      })
      .catch((err: Error) => {
        setError(err.message ?? 'Failed to load session');
      })
      .finally(() => setLoading(false));
  }, [sessionId, router]);

  // ── Fetch auth token ────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthToken(data.session?.access_token ?? '');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthToken(session?.access_token ?? '');
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Autosave ────────────────────────────────────────────────
  const persistCode = useCallback(
    async (newCode: string, newLang: Language, newStdin: string) => {
      if (!sessionId) return;
      setIsSaving(true);
      try {
        await saveCode(sessionId, newCode, newLang, newStdin);
      } catch {
        // Silent — autosave failures don't interrupt the user
      } finally {
        setIsSaving(false);
      }
    },
    [sessionId]
  );

  const debouncedSave = useDebounce(persistCode, AUTOSAVE_DELAY);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    debouncedSave(newCode, language, stdin);
  };

  const handleLanguageChange = (newLang: Language) => {
    const conf = LANGUAGE_MAP[newLang];
    const newCode = conf?.starterCode ?? '';
    setLanguage(newLang);
    setCode(newCode);
    setExecResult(null);
    debouncedSave(newCode, newLang, stdin);
  };

  const handleStdinChange = (newStdin: string) => {
    setStdin(newStdin);
    debouncedSave(code, language, newStdin);
  };

  // ── Code execution ──────────────────────────────────────────
  const handleRun = async () => {
    if (!sessionId || isRunning) return;
    setIsRunning(true);
    setRunError('');
    setExecResult(null);

    try {
      const result = await executeCode(sessionId, code, language, stdin);
      setExecResult(result);
    } catch (err: unknown) {
      const e = err as Error;
      setRunError(e.message ?? 'Execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  if (loading) return <FullPageLoader message="Loading your session..." />;
  if (!session) return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <ErrorBanner message={error || 'Session not found'} />
    </div>
  );

  const initialMessages = session.messages?.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
  })) ?? [];

  return (
    <div className="flex h-screen flex-col bg-surface-900 overflow-hidden">
      <Navbar />

      {/* Top toolbar */}
      <div className="flex items-center justify-between border-b border-surface-600 bg-surface-800 px-4 py-2 gap-3">
        {/* Language selector */}
        <div className="relative flex items-center gap-2">
          <Code2 className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden="true" />
          <div className="relative">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as Language)}
              className="appearance-none rounded-lg border border-surface-400 bg-surface-700 pl-3 pr-8 py-1.5 text-sm text-zinc-200 focus:border-brand-500 focus:outline-none cursor-pointer"
              aria-label="Select programming language"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
          </div>
        </div>

        {/* Session title + save indicator */}
        <div className="flex-1 text-center hidden sm:block">
          <span className="text-sm text-zinc-400 truncate">
            {session.title}
            {isSaving && (
              <span className="ml-2 text-xs text-zinc-600">
                <LoadingSpinner size="sm" className="inline mr-1" />
                Saving...
              </span>
            )}
          </span>
        </div>

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={isRunning || !code.trim()}
          className="btn-primary shrink-0"
          aria-label={isRunning ? 'Running code...' : 'Run code'}
        >
          {isRunning ? (
            <LoadingSpinner size="sm" label="Running..." />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" fill="currentColor" />
          )}
          {isRunning ? 'Running...' : 'Run Code'}
        </button>
      </div>

      {/* Mobile tabs */}
      <div className="flex border-b border-surface-600 bg-surface-800 md:hidden">
        <button
          onClick={() => setActiveTab('editor')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors',
            activeTab === 'editor'
              ? 'border-b-2 border-brand-400 text-brand-300'
              : 'text-zinc-400'
          )}
        >
          <Code2 className="h-4 w-4" aria-hidden="true" />
          Editor
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors',
            activeTab === 'chat'
              ? 'border-b-2 border-brand-400 text-brand-300'
              : 'text-zinc-400'
          )}
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Tutor
        </button>
      </div>

      {/* Main workspace */}
      <main className="flex flex-1 overflow-hidden">

        {/* Left pane — Code editor + execution */}
        <div
          className={cn(
            'flex flex-col border-r border-surface-600 overflow-hidden',
            'md:flex md:w-1/2 lg:w-[55%]',
            activeTab === 'editor' ? 'flex w-full' : 'hidden'
          )}
        >
          {/* Editor */}
          <div className="flex-1 overflow-hidden p-3">
            <CodeEditor
              code={code}
              language={language}
              onChange={handleCodeChange}
              minHeight={400}
            />
          </div>

          {/* Stdin */}
          <div className="border-t border-surface-600 px-3 py-2">
            <label
              htmlFor="stdin-input"
              className="mb-1 block text-xs font-medium text-zinc-500 uppercase tracking-wide"
            >
              Standard Input (stdin)
            </label>
            <textarea
              id="stdin-input"
              value={stdin}
              onChange={(e) => handleStdinChange(e.target.value)}
              placeholder="Enter program input here..."
              rows={2}
              className="w-full resize-none rounded-lg border border-surface-400 bg-surface-700 px-3 py-2 font-mono text-xs text-zinc-300 placeholder-zinc-600 focus:border-brand-500 focus:outline-none"
              aria-label="Program standard input"
            />
          </div>

          {/* Execution output */}
          <div className="border-t border-surface-600 px-3 py-2 max-h-52 overflow-y-auto">
            {runError && (
              <ErrorBanner
                message={runError}
                onDismiss={() => setRunError('')}
                className="mb-2"
              />
            )}
            <ExecutionPanel result={execResult} isRunning={isRunning} />
          </div>
        </div>

        {/* Right pane — Chat */}
        <div
          className={cn(
            'flex flex-col overflow-hidden',
            'md:flex',
            chatCollapsed ? 'md:w-10' : 'md:w-1/2 lg:w-[45%]',
            activeTab === 'chat' ? 'flex w-full' : 'hidden'
          )}
        >
          {/* Chat collapse toggle (desktop only) */}
          <div className="hidden md:flex items-center justify-between border-b border-surface-600 bg-surface-800 px-3 py-2">
            {!chatCollapsed && (
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                AI Tutor
              </span>
            )}
            <button
              onClick={() => setChatCollapsed((c) => !c)}
              className="ml-auto rounded p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label={chatCollapsed ? 'Expand chat' : 'Collapse chat'}
            >
              {chatCollapsed ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          {!chatCollapsed && authToken && (
            <div className="flex-1 overflow-hidden">
              <ChatPanel
                sessionId={session.id}
                language={language}
                code={code}
                executionResult={execResult}
                authToken={authToken}
                initialMessages={initialMessages}
              />
            </div>
          )}

          {!chatCollapsed && !authToken && (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner label="Authenticating..." />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function TutorPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<FullPageLoader message="Loading tutor..." />}>
        <TutorContent />
      </Suspense>
    </ProtectedRoute>
  );
}

export default TutorPage;
