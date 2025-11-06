import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from '../contexts/ThemeContext';
import Navigation from '../components/Navigation';

export const metadata: Metadata = {
  title: 'LipSyncAutomation Web UI',
  description: 'Web interface for LipSyncAutomation v2.0 system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className="font-sans antialiased bg-neutral-950 text-neutral-50">
        <ThemeProvider defaultMode="system">
          <Navigation />
          <div className="min-h-screen">
            <main className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {children}
              </div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}