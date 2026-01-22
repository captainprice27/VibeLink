'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';

export default function UserProfile() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = Array.isArray(params?.userId) ? params.userId[0] : params?.userId;

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    // If viewing own profile, redirect to edit page
    if (session?.user && (session.user as any).id === userId) {
      router.replace('/profile');
      return;
    }
    
    fetchUser();
  }, [userId, session, router]);

  const fetchUser = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const startChat = async () => {
      // Logic to start chat and navigate
      try {
          const res = await fetch('/api/conversations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ participantId: user._id || user.id }),
          });
          
          if (res.ok) {
              const data = await res.json();
              router.push(`/?conversationId=${data.conversation.id}`);
          }
      } catch(e) {
          console.error(e);
      }
  };

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-secondary)' }}>User not found</div>
      </div>
    );
  }

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
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>User Profile</h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'var(--bg-tertiary)',
              border: '4px solid var(--bg-primary)',
              boxShadow: '0 0 0 2px var(--accent-primary)',
              marginBottom: '16px'
          }}>
            {user.avatar ? (
              <img 
                src={user.avatar} 
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
          
          <h2 style={{ marginBottom: '4px' }}>{user.name}</h2>
          <span className={`badge ${user.isAgent ? 'agent' : 'user'}`} style={{ marginBottom: '12px' }}>
              {user.isAgent ? 'BOT' : 'USER'}
          </span>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
              {user.personality || 'No bio available'}
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Email
                </label>
                <div style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                    <span>{user.email}</span>
                </div>
            </div>
            
            <button 
                onClick={startChat}
                style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: '16px'
                }}
            >
                Start Conversation
            </button>
        </div>
      </div>
    </div>
  );
}
