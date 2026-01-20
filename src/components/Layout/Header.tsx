'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from '@/context/ThemeContext';

export default function Header() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="header">
      <div className="header-logo">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
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
        <h1>VibeLink</h1>
      </div>

      <div className="header-actions">
        {session?.user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {session.user.name}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            >
              Logout
            </button>
          </div>
        )}

        <div className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          <div className="theme-toggle-slider" />
        </div>
      </div>
    </header>
  );
}
