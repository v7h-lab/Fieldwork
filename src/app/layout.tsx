import type { Metadata } from 'next';
import './globals.css';
import { StudyProvider } from '@/lib/StudyContext';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Fieldwork — AI UX Research Agent',
  description: 'AI-powered UX research moderation. Define your research, generate interview guides, and conduct live interviews with a Gemini-powered agent.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <StudyProvider>
          <AppShell>{children}</AppShell>
        </StudyProvider>
      </body>
    </html>
  );
}
