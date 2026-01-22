'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { validateFile, fileToBase64 } from '@/lib/imageUtils';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const user = session?.user;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    // Validate size only (we already have a helper, but specific constraint here)
    if (file.size > 2 * 1024 * 1024) {
        setError('Image must be less than 2MB');
        return;
    }
    
    // Validate type
    if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        return;
    }

    try {
      setUploading(true);
      const base64 = await fileToBase64(file);

      // Upload to API
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: base64 }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update session
        await update({ 
            ...session, 
            user: { ...session?.user, image: data.user.avatar } 
        });
        setSuccess('Profile photo updated successfully!');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong');
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        width: '100%',
        maxWidth: '500px',
        background: 'var(--bg-secondary)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        padding: '32px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <button 
                onClick={() => router.back()} 
                style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    marginRight: '16px'
                }}
            >
                ←
            </button>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Edit Profile</h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div 
            style={{ 
              position: 'relative', 
              cursor: 'pointer',
              marginBottom: '16px' 
            }}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'var(--bg-tertiary)',
              border: '4px solid var(--bg-primary)',
              boxShadow: '0 0 0 2px var(--accent-primary)'
            }}>
              {user.image ? (
                <img 
                  src={user.image} 
                  alt={user.name || 'Profile'} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  color: 'var(--text-muted)',
                  fontWeight: 'bold'
                }}>
                  {user.name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                background: 'var(--accent-primary)',
                color: 'white',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--bg-primary)'
            }}>
                📷
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
            disabled={uploading}
          />
          
          <h2 style={{ marginBottom: '4px' }}>{user.name}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user.email}</p>
        </div>

        {error && (
            <div style={{ 
                padding: '12px', 
                background: 'rgba(239, 68, 68, 0.1)', 
                color: '#ef4444', 
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.9rem',
                textAlign: 'center'
            }}>
                {error}
            </div>
        )}

        {success && (
            <div style={{ 
                padding: '12px', 
                background: 'rgba(34, 197, 94, 0.1)', 
                color: '#22c55e', 
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.9rem',
                textAlign: 'center'
            }}>
                {success}
            </div>
        )}

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Email
                </label>
                <input 
                    type="text" 
                    value={user.email || ''} 
                    disabled 
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-muted)',
                        cursor: 'not-allowed'
                    }}
                />
            </div>
        </div>
      </div>
    </div>
  );
}
