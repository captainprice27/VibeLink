'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/components/SocketProvider';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  isAgent: boolean;
  personality?: string;
}

interface Conversation {
  id: string;
  otherParticipant: User;
  lastMessage?: {
    content: string;
    createdAt: string;
  };
}

interface SidebarProps {
  onSelectConversation: (conversationId: string, user: User) => void;
  activeConversationId?: string;
}

export default function Sidebar({ onSelectConversation, activeConversationId }: SidebarProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleMessageUpdate = (data: any) => {
      const { conversationId, message } = data;
      
      const index = conversations.findIndex((c) => c.id === conversationId);
      
      if (index === -1) {
          fetchUsersAndConversations();
          return;
      }

      const updatedConv = {
          ...conversations[index],
          lastMessage: {
              content: (message.content && message.content.trim().length > 0) ? message.content : (message.image ? '📷 Image' : 'Message'),
              createdAt: message.createdAt || new Date().toISOString()
          }
      };
      
      const newConversations = [...conversations];
      newConversations.splice(index, 1);
      newConversations.unshift(updatedConv);
      setConversations(newConversations);
    };

    socket.on('message:new', handleMessageUpdate);
    socket.on('message:sent', handleMessageUpdate);

    return () => {
      socket.off('message:new', handleMessageUpdate);
      socket.off('message:sent', handleMessageUpdate);
    };
  }, [socket, conversations]);

  useEffect(() => {
    fetchUsersAndConversations();
  }, []);

  const fetchUsersAndConversations = async () => {
    try {
      const [usersRes, convsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/conversations'),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }

      if (convsRes.ok) {
        const convsData = await convsRes.json();
        setConversations(convsData.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (user: User) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: user.id }),
      });

      if (res.ok) {
        const data = await res.json();
        onSelectConversation(data.conversation.id, user);
        fetchUsersAndConversations(); // Refresh conversations
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate agents and real users
  const agents = filteredUsers.filter((u) => u.isAgent);
  const realUsers = filteredUsers.filter((u) => !u.isAgent);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <input
          type="text"
          className="sidebar-search"
          placeholder="Search users or agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="contacts-list">
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading...
          </div>
        ) : (
          <>
            {/* AI Agents Section */}
            {agents.length > 0 && (
              <>
                <div
                  style={{
                    padding: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  🤖 AI Agents
                </div>
                {agents.map((user) => {
                  const conversation = conversations.find(
                    (c) => c.otherParticipant?.id === user.id
                  );
                  return (
                    <div
                      key={user.id}
                      className={`contact-item ${
                        activeConversationId === conversation?.id ? 'active' : ''
                      }`}
                      onClick={() => handleUserClick(user)}
                    >
                      <div className={`contact-avatar agent`}>
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} />
                        ) : (
                          getInitials(user.name)
                        )}
                        <div className={`online-indicator online`} />
                      </div>
                      <div className="contact-info">
                        <div className="contact-name">
                          {user.name}
                          <span className="badge agent">BOT</span>
                        </div>
                        <div className="contact-preview">
                          {conversation?.lastMessage?.content || user.personality || 'Start chatting!'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Real Users Section */}
            {realUsers.length > 0 && (
              <>
                <div
                  style={{
                    padding: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginTop: agents.length > 0 ? '8px' : 0,
                  }}
                >
                  👤 Users
                </div>
                {realUsers.map((user) => {
                  const conversation = conversations.find(
                    (c) => c.otherParticipant?.id === user.id
                  );
                  return (
                    <div
                      key={user.id}
                      className={`contact-item ${
                        activeConversationId === conversation?.id ? 'active' : ''
                      }`}
                      onClick={() => handleUserClick(user)}
                    >
                      <div className={`contact-avatar user`}>
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} />
                        ) : (
                          getInitials(user.name)
                        )}
                        <div
                          className={`online-indicator ${user.isOnline ? 'online' : 'offline'}`}
                        />
                      </div>
                      <div className="contact-info">
                        <div className="contact-name">
                          {user.name}
                          <span className="badge user">USER</span>
                        </div>
                        <div className="contact-preview">
                          {conversation?.lastMessage?.content ||
                            (user.isOnline ? 'Online' : 'Offline')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {filteredUsers.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No users found
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
