'use client';

import dynamic from 'next/dynamic';
import { useTheme } from '@/hooks/useTheme';
import type { Language } from '@/types';
import { LANGUAGE_MAP } from '@/lib/languages';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Monaco must only be loaded in the browser — dynamic import with ssr: false
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#1e1e1e] rounded-lg">
        <LoadingSpinner label="Loading editor..." />
      </div>
    ),
  }
);

interface CodeEditorProps {
  code: string;
  language: Language;
  onChange: (value: string) => void;
  readOnly?: boolean;
  minHeight?: number;
}

export function CodeEditor({
  code,
  language,
  onChange,
  readOnly = false,
  minHeight = 300,
}: CodeEditorProps) {
  const { theme } = useTheme();
  const langConfig = LANGUAGE_MAP[language];

  return (
    <div
      className="monaco-editor-container overflow-hidden rounded-lg border border-surface-500"
      style={{ minHeight }}
    >
      <MonacoEditor
        height={`${minHeight}px`}
        language={langConfig?.monacoId ?? language}
        value={code}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: 2,
          readOnly,
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
          overviewRulerLanes: 0,
          renderLineHighlight: 'gutter',
          suggest: { showKeywords: true },
          quickSuggestions: { other: true, comments: false, strings: false },
        }}
        onChange={(val) => onChange(val ?? '')}
      />
    </div>
  );
}
