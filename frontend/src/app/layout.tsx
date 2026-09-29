import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'CodeCompass — Socratic AI Code Tutor',
  description:
    'Learn programming through guided discovery. CodeCompass asks the right questions to help you think like a programmer.',
  icons: {
    icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/favicon.ico`,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Theme initializer — prevents flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('cc-theme');
                if (t === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
