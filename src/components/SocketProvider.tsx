'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'seen';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (conversationId: string, message: any, tempId: string) => void;
  markAsDelivered: (conversationId: string, messageIds: string[], userId: string) => void;
  markAsSeen: (conversationId: string, messageIds: string[], userId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  sendMessage: () => {},
  markAsDelivered: () => {},
  markAsSeen: () => {},
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    // Initialize socket connection
    const socketInstance = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket connected:', socketInstance.id);
      setIsConnected(true);
      
      // Register user as online
      const userId = (session.user as any).id;
      socketInstance.emit('user:online', userId);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [session]);

  const sendMessage = (conversationId: string, message: any, tempId: string) => {
    if (!socket || !session) return;
    
    socket.emit('message:send', {
      conversationId,
      message,
      senderId: (session.user as any).id,
      tempId,
    });
  };

  const markAsDelivered = (conversationId: string, messageIds: string[], userId: string) => {
    if (!socket) return;
    
    socket.emit('message:delivered', {
      conversationId,
      messageIds,
      userId,
    });
  };

  const markAsSeen = (conversationId: string, messageIds: string[], userId: string) => {
    if (!socket) return;
    
    socket.emit('message:seen', {
      conversationId,
      messageIds,
      userId,
    });
  };

  return (
    <SocketContext.Provider 
      value={{ 
        socket, 
        isConnected, 
        sendMessage,
        markAsDelivered,
        markAsSeen,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
