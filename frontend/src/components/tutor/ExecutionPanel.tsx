'use client';

import { cn, executionStatusColor } from '@/lib/utils';
import type { ExecutionResult } from '@/types';
import { Terminal, Clock, MemoryStick, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ExecutionPanelProps {
  result: ExecutionResult | null;
  isRunning: boolean;
}

export function ExecutionPanel({ result, isRunning }: ExecutionPanelProps) {
  if (isRunning) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-surface-500 bg-surface-800 p-4 text-sm text-zinc-400">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-400" aria-hidden="true" />
        Running code...
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-surface-500 bg-surface-800/50 p-4 text-sm text-zinc-500">
        <Terminal className="h-4 w-4" aria-hidden="true" />
        Run your code to see output here
      </div>
    );
  }

  const isSuccess = result.statusId === 3; // Judge0 "Accepted"
  const hasOutput = result.stdout || result.compileOutput;
  const hasError = result.stderr || (result.statusId && result.statusId !== 3 && result.compileOutput);

  return (
    <div className="space-y-2 rounded-lg border border-surface-500 bg-surface-800 overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center justify-between border-b border-surface-600 px-3 py-2">
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <CheckCircle2 className="h-4 w-4 text-green-400" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400" aria-hidden="true" />
          )}
          <span className={cn('text-sm font-medium', executionStatusColor(result.statusId))}>
            {result.status}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {result.time && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {result.time}
            </span>
          )}
          {result.memory && (
            <span className="flex items-center gap-1">
              <MemoryStick className="h-3 w-3" aria-hidden="true" />
              {result.memory}
            </span>
          )}
        </div>
      </div>

      {/* stdout */}
      {result.stdout && (
        <div className="px-3 pb-1">
          <p className="mb-1 text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Output
          </p>
          <pre
            className="overflow-x-auto rounded bg-surface-900 p-2.5 font-mono text-xs text-zinc-200 whitespace-pre-wrap"
            aria-label="Program output"
          >
            {result.stdout}
          </pre>
        </div>
      )}

      {/* stderr */}
      {result.stderr && (
        <div className="px-3 pb-1">
          <p className="mb-1 text-xs font-medium text-red-400 uppercase tracking-wide">
            stderr
          </p>
          <pre
            className="overflow-x-auto rounded bg-red-950/30 border border-red-900/30 p-2.5 font-mono text-xs text-red-300 whitespace-pre-wrap"
            aria-label="Error output"
          >
            {result.stderr}
          </pre>
        </div>
      )}

      {/* Compile output */}
      {result.compileOutput && result.compileOutput !== result.stdout && (
        <div className="px-3 pb-3">
          <p className="mb-1 text-xs font-medium text-yellow-400 uppercase tracking-wide">
            Compiler output
          </p>
          <pre
            className="overflow-x-auto rounded bg-yellow-950/20 border border-yellow-900/20 p-2.5 font-mono text-xs text-yellow-300 whitespace-pre-wrap"
            aria-label="Compiler output"
          >
            {result.compileOutput}
          </pre>
        </div>
      )}

      {/* No output */}
      {isSuccess && !hasOutput && (
        <div className="px-3 pb-3 text-sm text-zinc-500 italic">
          Program ran successfully with no output.
        </div>
      )}
    </div>
  );
}
