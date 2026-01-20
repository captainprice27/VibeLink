'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push('/chat');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
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
          </div>
          <h1>VibeLink</h1>
          <p>Welcome back! Sign in to continue chatting.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link href="/signup">Sign up</Link>
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <div
            className="theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <div className="theme-toggle-slider" />
          </div>
        </div>
      </div>
    </div>
  );
}
