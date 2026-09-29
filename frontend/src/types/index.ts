export type Language = 'python' | 'javascript' | 'java' | 'cpp';

export interface LearningSession {
  id: string;
  userId: string;
  title: string;
  language: Language;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
  messages?: ChatMessage[];
  codeState?: CodeState | null;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface CodeState {
  id: string;
  sessionId: string;
  code: string;
  language: Language;
  stdin: string;
  lastExecStatus?: string;
  lastExecOutput?: string;
  lastExecStderr?: string;
  lastExecTime?: string;
  lastExecMemory?: string;
  lastExecAt?: string;
}

export interface ExecutionResult {
  status: string;
  statusId: number;
  stdout: string;
  stderr: string;
  compileOutput: string;
  time: string;
  memory: string;
}

export interface LanguageConfig {
  id: Language;
  label: string;
  monacoId: string;
  judge0Id: number;
  starterCode: string;
}
