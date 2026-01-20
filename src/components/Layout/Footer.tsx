'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

export default function Footer() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return format(date, 'dd-MM-yyyy');
  };

  const formatDay = (date: Date) => {
    return format(date, 'EEEE');
  };

  const formatTime = (date: Date) => {
    return format(date, 'hh:mm:ss a');
  };

  return (
    <footer className="footer">
      <div className="footer-left">
        <span>© 2026 VibeLink</span>
        <span style={{ color: 'var(--text-muted)' }}>•</span>
        <span style={{ color: 'var(--text-muted)' }}>Made by Prayas</span>
      </div>
      <div className="footer-right">
        {currentTime && (
          <>
            <span>{formatDate(currentTime)}</span>
            <span style={{ color: 'var(--text-muted)' }}>|</span>
            <span>{formatDay(currentTime)}</span>
            <span style={{ color: 'var(--text-muted)' }}>|</span>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
              {formatTime(currentTime)}
            </span>
          </>
        )}
      </div>
    </footer>
  );
}
