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

export async function executeCode(
  sessionId: string,
  code: string,
  language: Language,
  stdin = ''
): Promise<ExecutionResult> {
  return apiFetch<ExecutionResult>(`/api/execute/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify({ code, language, stdin }),
  });
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
