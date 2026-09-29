'use client';

import { useRef, useEffect, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import type { ExecutionResult, Language } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import {
  Send,
  Square,
  Lightbulb,
  AlertTriangle,
  GitBranch,
  Bot,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  sessionId: string;
  language: Language;
  code: string;
  executionResult: ExecutionResult | null;
  authToken: string;
  initialMessages?: Array<{ role: 'user' | 'assistant'; content: string; id?: string }>;
}

function getMessageText(msg: UIMessage): string {
  // UIMessage in AI SDK 5 stores text in parts[].text
  for (const part of msg.parts ?? []) {
    if (part.type === 'text' && 'text' in part) {
      return (part as { type: 'text'; text: string }).text;
    }
  }
  return '';
}

function formatMessageContent(content: string): React.ReactNode {
  // Split on code fences ```...```
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const inner = part.slice(3, -3);
          const firstNewline = inner.indexOf('\n');
          const lang = firstNewline > 0 ? inner.slice(0, firstNewline).trim() : '';
          const code = firstNewline > 0 ? inner.slice(firstNewline + 1) : inner;
          return (
            <pre key={i} className="mt-2 mb-2 rounded-lg bg-surface-900 p-3 text-xs overflow-x-auto font-mono text-zinc-200">
              {lang && <span className="text-brand-400 text-xs">{lang}{'\n'}</span>}
              {code}
            </pre>
          );
        }
        const inlineParts = part.split(/(`[^`]+`)/g);
        return (
          <span key={i}>
            {inlineParts.map((ip, j) => {
              if (ip.startsWith('`') && ip.endsWith('`')) {
                return (
                  <code key={j} className="rounded bg-surface-900 px-1 py-0.5 font-mono text-xs text-brand-300">
                    {ip.slice(1, -1)}
                  </code>
                );
              }
              return <span key={j}>{ip}</span>;
            })}
          </span>
        );
      })}
    </>
  );
}

export function ChatPanel({
  sessionId,
  language,
  code,
  executionResult,
  authToken,
  initialMessages = [],
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const [chatError, setChatError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // Build initial UIMessages from DB history
  const seed: UIMessage[] = initialMessages.map((m, i) => ({
    id: m.id ?? `init-${i}`,
    role: m.role,
    parts: [{ type: 'text' as const, text: m.content }],
    metadata: undefined,
  }));

  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new TextStreamChatTransport({
      api: `${apiUrl}/api/chat/${sessionId}/stream`,
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: {
        language,
        code: code.substring(0, 4000),
        executionOutput: executionResult
          ? [
              executionResult.stdout,
              executionResult.stderr,
              executionResult.compileOutput,
              `Status: ${executionResult.status}`,
            ]
              .filter(Boolean)
              .join('\n')
              .substring(0, 2000)
          : '',
      },
    }),
    id: sessionId,
    messages: seed,
    onError: (err) => {
      setChatError(err.message ?? 'Something went wrong. Please try again.');
    },
  });

  const isStreaming = status === 'streaming' || status === 'submitted';

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  useEffect(() => {
    if (inputText) setChatError('');
  }, [inputText]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;
    setChatError('');
    sendMessage({ text });
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sendQuickPrompt = (prompt: string) => {
    if (isStreaming) return;
    setChatError('');
    sendMessage({ text: prompt });
  };

  const quickPrompts = [
    { icon: Lightbulb, label: 'Give me a hint', prompt: 'Give me a hint about what I should try next without giving away the answer.' },
    { icon: AlertTriangle, label: 'Explain this error', prompt: `Can you explain the error or issue in my ${language} code? Help me understand what's going wrong.` },
    { icon: GitBranch, label: 'Review my approach', prompt: 'Can you review my overall approach and tell me if I am on the right track? Ask me questions to help me think it through.' },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto space-y-4 p-4"
        aria-label="Chat messages"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
            <Bot className="h-10 w-10 text-zinc-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-zinc-400">CodeCompass is ready</p>
              <p className="mt-1 text-xs text-zinc-600">
                Ask a question, paste an error, or use a quick prompt below.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const content = getMessageText(msg);

          return (
            <div
              key={msg.id}
              className={cn(
                'flex items-end gap-2',
                isUser ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <div
                className={cn(
                  'shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-xs',
                  isUser ? 'bg-brand-600' : 'bg-surface-600'
                )}
                aria-hidden="true"
              >
                {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>

              <div className={cn(isUser ? 'chat-user' : 'chat-assistant')}>
                {formatMessageContent(content)}
              </div>
            </div>
          );
        })}

        {isStreaming && (
          <div className="flex items-end gap-2">
            <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-surface-600">
              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
            <div className="chat-assistant flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '0ms' }} />
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '150ms' }} />
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* Error */}
      {(chatError || error) && (
        <div className="px-4 pb-2">
          <ErrorBanner
            message={chatError || error?.message || 'An error occurred'}
            onDismiss={() => { setChatError(''); }}
          />
        </div>
      )}

      {/* Quick prompts */}
      <div className="border-t border-surface-600 px-3 py-2 flex gap-2 flex-wrap">
        {quickPrompts.map(({ icon: Icon, label, prompt }) => (
          <button
            key={label}
            onClick={() => sendQuickPrompt(prompt)}
            disabled={isStreaming}
            className="flex items-center gap-1.5 rounded-full border border-surface-400 bg-surface-700 px-3 py-1 text-xs text-zinc-300 hover:border-brand-500/50 hover:text-brand-300 disabled:opacity-50 transition-colors"
            aria-label={label}
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="border-t border-surface-600 p-3">
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Message CodeCompass
          </label>
          <textarea
            id="chat-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question... (Enter to send, Shift+Enter for newline)"
            rows={2}
            disabled={isStreaming}
            className="flex-1 resize-none rounded-lg border border-surface-400 bg-surface-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50 transition-colors"
            aria-describedby="chat-hint"
          />
          {isStreaming ? (
            <button
              onClick={stop}
              className="shrink-0 rounded-lg bg-red-600 p-2.5 text-white hover:bg-red-500 transition-colors"
              aria-label="Stop generating"
              title="Stop generating"
            >
              <Square className="h-4 w-4" fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="shrink-0 rounded-lg bg-brand-600 p-2.5 text-white hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
        <p id="chat-hint" className="sr-only">
          Press Enter to send, Shift+Enter for a new line.
        </p>
      </div>
    </div>
  );
}
