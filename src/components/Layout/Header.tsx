'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from '@/context/ThemeContext';
import { useState, useEffect } from 'react';
import { useSocket } from '@/components/SocketProvider';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    if (session?.user) {
      // Initial fetch
      fetch('/api/messages/unread')
        .then(res => res.json())
        .then(data => {
            if (data.count !== undefined) setUnreadCount(data.count);
        })
        .catch(err => console.error('Failed to fetch unread count', err));
    }
  }, [session, pathname]);

  useEffect(() => {
      if (!socket) return;
      
      const handleNotification = (data: any) => {
           setUnreadCount((prev: number) => prev + 1);
      };
      
      // Also listen to message:seen/read events to decrease count? 
      // Ideally yes, but complex. Only increment on new notification for now.
      // If user visits chat, count won't decrease until page refresh or more complex logic.
      // We can implement a "conversation opened" event to refetch count.
      
      socket.on('notification:new', handleNotification);
      
      return () => {
          socket.off('notification:new', handleNotification);
      };
  }, [socket]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h1>VibeLink</h1>
        </Link>
      </div>

      <div className="header-actions">
        {session?.user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Notifications">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        background: '#ef4444',
                        color: 'white',
                        borderRadius: '50%',
                        minWidth: '18px',
                        height: '18px',
                        padding: '0 4px',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        border: '2px solid var(--bg-primary)' // hollow effect
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </div>

            {/* User Profile Link */}
            <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }} title="View Profile">
                <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%', 
                    overflow: 'hidden', 
                    background: session.user.image ? 'transparent' : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'white', 
                    fontWeight: 'bold',
                    fontSize: '14px',
                    border: '2px solid var(--bg-tertiary)'
                }}>
                     {session.user.image ? (
                         <img src={session.user.image} alt={session.user.name || 'User'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     ) : (
                         getInitials(session.user.name || '')
                     )}
                </div>
                <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>
                    {session.user.name}
                </span>
            </Link>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
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
