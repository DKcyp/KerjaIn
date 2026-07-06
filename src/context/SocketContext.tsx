"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only initialize on client side
    if (typeof window === 'undefined') return;

    // Initialize Socket.IO client with Windows-friendly configuration
    const socketInstance = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'], // Try websocket first for better performance
      reconnection: true,
      reconnectionDelay: 2000, // Increased delay for Windows
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 10, // More attempts for Windows
      autoConnect: true,
      timeout: 20000, // Increased timeout for Windows
      forceNew: false,
      // Windows-specific configurations
      upgrade: true,
      rememberUpgrade: true,
      // Add CORS handling for Windows
      withCredentials: true,
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket.IO connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      setIsConnected(false);
      
      // Windows-specific error handling
      if (error.message?.includes('websocket')) {
        console.log('🔄 WebSocket failed, falling back to polling...');
        // Force polling transport on WebSocket failure
        socketInstance.io.opts.transports = ['polling'];
      }
    });
    
    // Add reconnection event handlers for better Windows support
    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket.IO reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
    });
    
    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Socket.IO reconnection attempt ${attemptNumber}`);
    });
    
    socketInstance.on('reconnect_error', (error) => {
      console.error('Socket.IO reconnection error:', error);
    });
    
    socketInstance.on('reconnect_failed', () => {
      console.error('❌ Socket.IO reconnection failed after all attempts');
      setIsConnected(false);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}
