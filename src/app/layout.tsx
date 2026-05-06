import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SideQuest — Misiones para estar vivo',
  description:
    'Una misión diaria para recordarte que la vida pasa entre las cosas importantes.',
  openGraph: {
    title: 'SideQuest',
    description: 'Una misión diaria para estar vivo más allá de lo básico.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es" className={roboto.variable}>
        <body className="min-h-screen flex flex-col antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
