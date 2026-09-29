'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/ui/Navbar';
import {
  Compass,
  Brain,
  Code2,
  MessageSquare,
  Zap,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const features = [
  {
    icon: Brain,
    title: 'Socratic Method',
    description:
      'Instead of giving answers, CodeCompass asks guiding questions that help you discover solutions on your own.',
  },
  {
    icon: Code2,
    title: 'Live Code Editor',
    description:
      'Write and run Python, JavaScript, Java, or C++ directly in the browser with a full Monaco editor and instant feedback.',
  },
  {
    icon: MessageSquare,
    title: 'Contextual Hints',
    description:
      'Get hints tailored to your current code and execution output. The tutor sees exactly what you see.',
  },
  {
    icon: Zap,
    title: 'Adaptive Depth',
    description:
      'Whether you are a beginner or an experienced developer, the tutor adjusts explanations to your level.',
  },
];

const benefits = [
  'Build genuine understanding, not just working code',
  'Break through bugs with guided debugging sessions',
  'Learn algorithmic thinking step by step',
  'Revisit sessions to reinforce learning over time',
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-surface-900 dark:bg-surface-900">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-24 text-center sm:py-32">
        {/* Background glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="h-[500px] w-[800px] rounded-full bg-brand-600/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-300">
            <Compass className="h-4 w-4" aria-hidden="true" />
            <span>AI-Powered Socratic Tutor</span>
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight text-zinc-100 sm:text-6xl">
            Learn to code by{' '}
            <span className="bg-gradient-to-r from-brand-400 to-brand-300 bg-clip-text text-transparent">
              thinking it through
            </span>
          </h1>

          <p className="mb-10 text-lg text-zinc-400 leading-relaxed">
            CodeCompass is your personal programming tutor that never just gives you the answer.
            It guides you with questions, hints, and real code execution to help you truly understand
            what you&apos;re building.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link href={`${basePath}/dashboard/`} className="btn-primary px-6 py-3 text-base">
                Go to Dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link href={`${basePath}/register/`} className="btn-primary px-6 py-3 text-base">
                  Start learning for free <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href={`${basePath}/login/`} className="btn-secondary px-6 py-3 text-base">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20 bg-surface-800/50">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-zinc-100">
            A tutor that makes you{' '}
            <span className="text-brand-400">think deeper</span>
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="card group hover:border-brand-500/40 transition-colors">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600/20">
                  <Icon className="h-5 w-5 text-brand-400" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-zinc-100">{title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits list */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-8 text-3xl font-bold text-zinc-100">
            Built for real learning
          </h2>
          <ul className="space-y-4 text-left">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-brand-400"
                  aria-hidden="true"
                />
                <span className="text-zinc-300">{benefit}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            {!user && (
              <Link href={`${basePath}/register/`} className="btn-primary px-8 py-3 text-base">
                Create your free account <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-600 py-8 text-center text-sm text-zinc-500">
        <p>
          CodeCompass — Socratic AI Code Tutor &middot; Free educational MVP
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          This is an open-source educational tool. No payments required.
        </p>
      </footer>
    </div>
  );
}
