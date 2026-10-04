import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-900 px-4 text-center">
      <Compass className="mb-6 h-16 w-16 text-zinc-700" aria-hidden="true" />
      <h1 className="mb-2 text-4xl font-bold text-zinc-100">404</h1>
      <p className="mb-6 text-zinc-400">
        This page doesn&apos;t exist. You may have followed a broken link.
      </p>
      <Link href="/" className="btn-primary">
        Back to home
      </Link>
    </div>
  );
}
