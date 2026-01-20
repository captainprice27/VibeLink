'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  status: 'sending' | 'sent' | 'delivered' | 'seen';
  createdAt: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
    isAgent: boolean;
  };
}

interface User {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  isAgent: boolean;
  personality?: string;
}

interface ChatWindowProps {
  conversationId: string;
  otherUser: User;
}

export default function ChatWindow({ conversationId, otherUser }: ChatWindowProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/messages?conversationId=${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistically add message
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      status: 'sending',
      createdAt: new Date().toISOString(),
      senderId: (session?.user as { id: string })?.id || '',
      sender: {
        id: (session?.user as { id: string })?.id || '',
        name: session?.user?.name || '',
        avatar: session?.user?.image || undefined,
        isAgent: false,
      },
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          content: messageContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update temp message with real data
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempMessage.id
              ? { ...data.message, id: data.message.id }
              : m
          )
        );

        // Add agent response if any
        if (data.agentMessage) {
          setMessages((prev) => [...prev, data.agentMessage]);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
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

  const formatMessageTime = (dateString: string) => {
    return format(new Date(dateString), 'hh:mm a');
  };

  const renderMessageStatus = (status: string, isOwnMessage: boolean) => {
    if (!isOwnMessage) return null;

    const statusIcons = {
      sending: <span className="tick">○</span>,
      sent: <span className="tick">✓</span>,
      delivered: <span className="tick">✓✓</span>,
      seen: <span className="tick">✓✓</span>,
    };

    return (
      <span className={`message-status ${status}`}>
        {statusIcons[status as keyof typeof statusIcons]}
      </span>
    );
  };

  const currentUserId = (session?.user as { id: string })?.id;

  return (
    <div className="chat-area">
      <div className="chat-header">
        <div className={`contact-avatar ${otherUser.isAgent ? 'agent' : 'user'}`}>
          {otherUser.avatar ? (
            <img src={otherUser.avatar} alt={otherUser.name} />
          ) : (
            getInitials(otherUser.name)
          )}
        </div>
        <div className="chat-header-info">
          <h2>
            {otherUser.name}
            {otherUser.isAgent && (
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'var(--agent-badge)',
                  color: 'var(--bg-primary)',
                  marginLeft: '8px',
                }}
              >
                AI
              </span>
            )}
          </h2>
          <p>
            {otherUser.isAgent
              ? 'Always available'
              : otherUser.isOnline
              ? 'Online'
              : 'Offline'}
          </p>
        </div>
      </div>

      <div className="chat-messages">
        {loading ? (
          <div className="empty-state">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <h3>Start the conversation</h3>
            <p>Send a message to {otherUser.name}</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={`message ${isOwnMessage ? 'sent' : 'received'}`}
              >
                {!isOwnMessage && (
                  <div
                    className={`message-avatar ${
                      message.sender.isAgent ? 'agent' : 'user'
                    }`}
                    style={{
                      background: message.sender.isAgent
                        ? 'var(--agent-badge)'
                        : 'var(--user-badge)',
                    }}
                  >
                    {getInitials(message.sender.name)}
                  </div>
                )}
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
                  <div className="message-meta">
                    <span>{formatMessageTime(message.createdAt)}</span>
                    {renderMessageStatus(message.status, isOwnMessage)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <form onSubmit={handleSendMessage} className="chat-input-container">
          <input
            type="text"
            className="chat-input"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
          />
          <button type="submit" className="send-button" disabled={sending || !newMessage.trim()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 2L11 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 2L15 22L11 13L2 9L22 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
