'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Layout/Header';
import Sidebar from '@/components/Layout/Sidebar';
import ChatWindow from '@/components/Chat/ChatWindow';
import LocationPermission from '@/components/Auth/LocationPermission';

interface User {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  isAgent: boolean;
  personality?: string;
}

interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    // Check if location permission needs to be shown
    const locationPermission = localStorage.getItem('vibelink-location-permission');
    if (!locationPermission && status === 'authenticated') {
      setShowLocationModal(true);
    }
  }, [status]);

  const handleSelectConversation = (conversationId: string, user: User) => {
    setSelectedConversation(conversationId);
    setSelectedUser(user);
  };

  const handleLocationGranted = async (location: LocationData) => {
    setShowLocationModal(false);
    // Update user profile with location
    try {
      await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location }),
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const handleLocationDenied = () => {
    setShowLocationModal(false);
  };

  if (status === 'loading') {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
        }}
      >
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <Sidebar
          onSelectConversation={handleSelectConversation}
          activeConversationId={selectedConversation || undefined}
        />
        {selectedConversation && selectedUser ? (
          <ChatWindow conversationId={selectedConversation} otherUser={selectedUser} />
        ) : (
          <div className="chat-area">
            <div className="empty-state">
              <div className="empty-state-icon">💬</div>
              <h3>Welcome to VibeLink</h3>
              <p>Select a contact from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </main>

      {showLocationModal && (
        <LocationPermission
          onLocationGranted={handleLocationGranted}
          onLocationDenied={handleLocationDenied}
        />
      )}
    </div>
  );
}
