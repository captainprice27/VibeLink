import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import Footer from '@/components/Layout/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VibeLink - Real-time Chat',
  description: 'Connect with friends and AI agents in real-time. Made by Prayas.',
  keywords: ['chat', 'messaging', 'real-time', 'vibelink', 'ai agents'],
  authors: [{ name: 'Prayas' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="app-container">
            {children}
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
