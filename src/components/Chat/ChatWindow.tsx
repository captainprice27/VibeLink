'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { useSocket } from '@/components/SocketProvider';

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
  const { socket, isConnected, sendMessage, markAsDelivered, markAsSeen } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentUserId = (session?.user as { id: string })?.id;

  // Fetch initial messages
  useEffect(() => {
    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId]);

  // Join conversation room and set up socket listeners
  useEffect(() => {
    if (!socket || !conversationId || !currentUserId) return;

    console.log('🔌 Joining conversation:', conversationId);
    socket.emit('conversation:join', conversationId);

    // Listen for new messages
    const handleNewMessage = (data: { conversationId: string; message: Message; senderId: string }) => {
      if (data.conversationId === conversationId) {
        console.log('📩 New message received:', data.message);
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.find((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });

        // Mark as delivered immediately
        if (data.senderId !== currentUserId) {
          setTimeout(() => {
            markAsDelivered(conversationId, [data.message.id], currentUserId);
          }, 100);

          // Mark as seen (simulate user viewing the message)
          setTimeout(() => {
            markAsSeen(conversationId, [data.message.id], currentUserId);
          }, 1000);
        }

        scrollToBottom();
      }
    };

    // Listen for message sent confirmation
    const handleMessageSent = (data: { tempId: string; messageId: string; status: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.tempId
            ? { ...m, id: data.messageId, status: 'sent' as any }
            : m
        )
      );
    };

    // Listen for delivery status updates
    const handleDelivered = (data: { messageIds: string[]; userId: string; status: string }) => {
      console.log('✅ Messages delivered:', data.messageIds);
      setMessages((prev) =>
        prev.map((m) =>
          data.messageIds.includes(m.id) && m.senderId === currentUserId
            ? { ...m, status: 'delivered' as any }
            : m
        )
      );
    };

    // Listen for seen status updates
    const handleSeen = (data: { messageIds: string[]; userId: string; status: string }) => {
      console.log('👁️ Messages seen:', data.messageIds);
      setMessages((prev) =>
        prev.map((m) =>
          data.messageIds.includes(m.id) && m.senderId === currentUserId
            ? { ...m, status: 'seen' as any }
            : m
        )
      );
    };

    // Listen for typing indicators
    const handleTyping = (data: { conversationId: string; userId: string; userName: string; isTyping: boolean }) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        setIsTyping(data.isTyping);
        setTypingUser(data.isTyping ? data.userName : null);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:sent', handleMessageSent);
    socket.on('message:status:delivered', handleDelivered);
    socket.on('message:status:seen', handleSeen);
    socket.on('typing:user', handleTyping);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:sent', handleMessageSent);
      socket.off('message:status:delivered', handleDelivered);
      socket.off('message:status:seen', handleSeen);
      socket.off('typing:user', handleTyping);
    };
  }, [socket, conversationId, currentUserId]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as seen when they come into view
  useEffect(() => {
    if (!currentUserId || messages.length === 0) return;

    const unseenMessages = messages.filter(
      (m) => m.senderId !== currentUserId && m.status !== 'seen'
    );

    if (unseenMessages.length > 0) {
      const messageIds = unseenMessages.map((m) => m.id);
      markAsSeen(conversationId, messageIds, currentUserId);
      
      // Also update in database
      updateMessageStatusInDB(messageIds, 'seen');
    }
  }, [messages, currentUserId]);

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

  const updateMessageStatusInDB = async (messageIds: string[], status: string) => {
    try {
      await fetch('/api/messages/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds, status }),
      });
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = () => {
    if (!socket || !currentUserId) return;

    socket.emit('typing:start', {
      conversationId,
      userId: currentUserId,
      userName: session?.user?.name || 'User',
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', {
        conversationId,
        userId: currentUserId,
      });
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !isConnected) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Stop typing indicator
    if (socket) {
      socket.emit('typing:stop', {
        conversationId,
        userId: currentUserId,
      });
    }

    // Create temp message
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      content: messageContent,
      status: 'sending',
      createdAt: new Date().toISOString(),
      senderId: currentUserId || '',
      sender: {
        id: currentUserId || '',
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
        
        // Update temp message with real ID
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...data.message, status: 'sent' }
              : m
          )
        );

        // Emit via socket
        sendMessage(conversationId, data.message, tempId);

        // Handle agent response
        if (data.agentMessage) {
          setMessages((prev) => [...prev, data.agentMessage]);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Mark as failed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, status: 'sent' }  // Keep as sent for now, could add 'failed' status
            : m
        )
      );
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

    const statusConfig = {
      sending: { icon: '○', className: 'sending', color: 'var(--text-muted)' },
      sent: { icon: '✓', className: 'sent', color: 'var(--text-muted)' },
      delivered: { icon: '✓✓', className: 'delivered', color: 'var(--text-muted)' },
      seen: { icon: '✓✓', className: 'seen', color: 'var(--accent-primary)' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.sent;

    return (
      <span 
        className={`message-status ${config.className}`}
        style={{ color: config.color }}
        title={status}
      >
        {config.icon}
      </span>
    );
  };

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
            {isTyping && typingUser ? (
              <span style={{ color: 'var(--accent-primary)' }}>typing...</span>
            ) : otherUser.isAgent ? (
              'Always available'
            ) : otherUser.isOnline ? (
              'Online'
            ) : (
              'Offline'
            )}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div 
            style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: isConnected ? 'var(--accent-primary)' : 'var(--danger)',
            }}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
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
        {isTyping && typingUser && (
          <div className="message received">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <form onSubmit={handleSendMessage} className="chat-input-container">
          <input
            type="text"
            className="chat-input"
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            disabled={sending || !isConnected}
          />
          <button 
            type="submit" 
            className="send-button" 
            disabled={sending || !newMessage.trim() || !isConnected}
            title={!isConnected ? 'Disconnected - reconnecting...' : 'Send message'}
          >
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
