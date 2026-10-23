/**
 * API client for the CodeCompass backend.
 * All requests attach the Supabase access token as a Bearer header.
 * The base URL is set via NEXT_PUBLIC_API_URL.
 */

import { supabase } from './supabase';
import type { LearningSession, ExecutionResult, Language } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    'Missing NEXT_PUBLIC_API_URL. Set it in .env.local to point at your backend.'
  );
}

// ── Internal helpers ──────────────────────────────────────────

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
  });

  if (!res.ok) {
    let errMsg = `API error ${res.status}`;
    try {
      const body = await res.json();
      errMsg = body.error || body.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  return res.json() as Promise<T>;
}

// ── Sessions ──────────────────────────────────────────────────

export async function getSessions(): Promise<LearningSession[]> {
  return apiFetch<LearningSession[]>('/api/sessions');
}

export async function getSession(id: string): Promise<LearningSession> {
  return apiFetch<LearningSession>(`/api/sessions/${id}`);
}

export async function createSession(
  language: Language = 'python',
  title = 'New Session'
): Promise<LearningSession> {
  return apiFetch<LearningSession>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ language, title }),
  });
}

export async function updateSession(
  id: string,
  update: { title?: string; language?: Language }
): Promise<LearningSession> {
  return apiFetch<LearningSession>(`/api/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  });
}

export async function deleteSession(id: string): Promise<void> {
  await apiFetch(`/api/sessions/${id}`, { method: 'DELETE' });
}

export async function saveCode(
  sessionId: string,
  code: string,
  language: Language,
  stdin?: string
): Promise<void> {
  await apiFetch(`/api/sessions/${sessionId}/code`, {
    method: 'PATCH',
    body: JSON.stringify({ code, language, stdin }),
  });
}

// ── Code execution ────────────────────────────────────────────

// Execution can take up to ~30 s on the free Judge0 tier (queue wait + run time).
// We use an AbortController so the browser doesn't hang indefinitely if the
// backend is unreachable or Railway times out the request.
const EXECUTE_TIMEOUT_MS = 35_000; // 35 s — slightly over Railway's 30 s response budget

export async function executeCode(
  sessionId: string,
  code: string,
  language: Language,
  stdin = ''
): Promise<ExecutionResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXECUTE_TIMEOUT_MS);

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/execute/${sessionId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code, language, stdin }),
      signal: controller.signal,
    });

    if (!res.ok) {
      let errMsg = `API error ${res.status}`;
      try {
        const body = await res.json();
        errMsg = body.error || body.message || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    return res.json() as Promise<ExecutionResult>;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Execution timed out. The server took too long to respond — please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Chat messages ─────────────────────────────────────────────

export async function getChatMessages(sessionId: string) {
  return apiFetch<Array<{ id: string; role: 'user' | 'assistant'; content: string; createdAt: string }>>(
    `/api/chat/${sessionId}/messages`
  );
}

/**
 * Returns the backend chat stream URL + auth headers for use with
 * the AI SDK TextStreamChatTransport (or manual fetch).
 */
export async function getChatStreamConfig(sessionId: string) {
  const headers = await getAuthHeaders();
  return {
    url: `${API_URL}/api/chat/${sessionId}/stream`,
    headers: headers as Record<string, string>,
  };
}

/**
 * Get the current access token for use in AI SDK transport headers.
 */
export async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return token;
}
