'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/chat');
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        gap: '24px',
      }}
    >
      <svg width="64" height="64" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="14" stroke="url(#gradient)" strokeWidth="3" />
        <path
          d="M10 16C10 12.5 12.5 10 16 10C19.5 10 22 12.5 22 16C22 19.5 19.5 22 16 22"
          stroke="url(#gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="16" cy="16" r="3" fill="url(#gradient)" />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-primary)" />
            <stop offset="100%" stopColor="var(--accent-secondary)" />
          </linearGradient>
        </defs>
      </svg>
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 700,
          background: 'var(--accent-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        VibeLink
      </h1>
      <div className="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}
