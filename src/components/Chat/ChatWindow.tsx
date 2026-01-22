'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { useSocket } from '@/components/SocketProvider';
import { validateFile, fileToBase64 } from '@/lib/imageUtils';

interface Message {
  id: string;
  content: string;
  status: 'sending' | 'sent' | 'delivered' | 'seen';
  createdAt: string;
  senderId: string;
  image?: {
    data: string;
    mimeType: string;
    size: number;
  };
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
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);
    
    // Validate
    const validation = validateFile(file);
    if (!validation.valid) {
      setImageError(validation.error || 'Invalid file');
      return;
    }

    // Set selected image and preview
    setSelectedImage(file);
    const base64 = await fileToBase64(file);
    setImagePreview(base64);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || sending || !isConnected) return;

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

    // Prepare image data
    let imageData = null;
    if (selectedImage && imagePreview) {
      imageData = {
        data: imagePreview,
        mimeType: selectedImage.type,
        size: selectedImage.size,
      };
    }

    // Create temp message
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      content: messageContent,
      status: 'sending',
      createdAt: new Date().toISOString(),
      senderId: currentUserId || '',
      image: imageData || undefined,
      sender: {
        id: currentUserId || '',
        name: session?.user?.name || '',
        avatar: session?.user?.image || undefined,
        isAgent: false,
      },
    };

    setMessages((prev) => [...prev, tempMessage]);
    removeImage(); // Clear image preview after adding to tempMessage

    try {
      const payload: any = {
        conversationId,
        content: messageContent,
      };

      if (imageData) {
        payload.image = imageData;
      }

      console.log('Sending message with payload:', { 
        hasImage: !!payload.image, 
        imageSize: payload.image?.size,
        contentLength: payload.content?.length 
      });

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
        sendMessage(conversationId, data.message, tempId, [otherUser.id]);

        // Handle agent response
        if (data.agentMessage) {
          setMessages((prev) => [...prev, data.agentMessage]);
        }
      } else {
        const errorData = await res.json();
        console.error('API error response:', errorData);
        setImageError(errorData.error || 'Failed to send message');
        if (errorData.details) {
         console.error('Error details:', errorData.details);
        }
        
        // Remove failed message
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setImageError('Failed to send message');
      
      // Remove failed message
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
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
        <Link href={`/profile/${otherUser.id}`} style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '12px', textDecoration: 'none', color: 'inherit' }}>
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
        </Link>
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
                  {message.image && message.image.data && (
                    <div className="message-image" style={{ marginBottom: message.content ? '8px' : '0' }}>
                      {message.image.mimeType === 'application/pdf' ? (
                        <div 
                          onClick={() => window.open(message.image!.data, '_blank')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            background: 'rgba(0,0,0,0.05)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            minWidth: '200px',
                          }}
                        >
                          <div style={{
                            width: '40px',
                            height: '40px',
                            background: '#ff0000',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                          }}>PDF</div>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ 
                                fontSize: '0.9rem', 
                                fontWeight: '500', 
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                Document.pdf
                            </div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                                {(message.image.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </div>
                      ) : message.image.mimeType === 'video/mp4' ? (
                        <video 
                          src={message.image.data} 
                          controls
                          style={{
                            maxWidth: '300px',
                            maxHeight: '300px',
                            borderRadius: '8px',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <img 
                          src={message.image.data} 
                          alt="Shared image"
                          style={{
                            maxWidth: '300px',
                            maxHeight: '300px',
                            borderRadius: '8px',
                            display: 'block',
                            cursor: 'pointer',
                          }}
                          onClick={() => window.open(message.image!.data, '_blank')}
                        />
                      )}
                    </div>
                  )}
                  {message.content && (
                    <div className="message-text">{message.content}</div>
                  )}
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
        {imageError && (
          <div style={{ 
            padding: '8px 12px', 
            background: 'var(--danger)', 
            color: 'white', 
            borderRadius: '4px', 
            marginBottom: '8px',
            fontSize: '0.875rem',
          }}>
            {imageError}
          </div>
        )}
        
        {imagePreview && (
          <div style={{ 
            padding: '12px', 
            background: 'var(--bg-secondary)', 
            borderRadius: '8px', 
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            {selectedImage?.type === 'application/pdf' ? (
              <div style={{
                width: '60px',
                height: '60px',
                background: '#ff0000',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1rem',
              }}>PDF</div>
            ) : selectedImage?.type === 'video/mp4' ? (
              <div style={{
                width: '60px',
                height: '60px',
                background: '#000',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1rem',
              }}>▶</div>
            ) : (
              <img 
                src={imagePreview} 
                alt="Preview" 
                style={{ 
                  maxWidth: '100px', 
                  maxHeight: '100px', 
                  borderRadius: '4px',
                  objectFit: 'cover',
                }} 
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                {selectedImage?.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {selectedImage && `${(selectedImage.size / 1024).toFixed(1)} KB`}
              </div>
            </div>
            <button
              type="button"
              onClick={removeImage}
              style={{
                background: 'var(--danger)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Remove image"
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="chat-input-container">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,application/pdf,video/mp4"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || !isConnected}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
            title="Attach file"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

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
            disabled={sending || (!newMessage.trim() && !selectedImage) || !isConnected}
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
