'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

let socket = null;

export function useWebSocket() {
  const socketRef = useRef(null);
  const listenersRef = useRef(new Map());

  useEffect(() => {
    // Initialize socket connection
    const token = localStorage.getItem('token');
    
    if (!token) {
      return;
    }

    if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
        auth: {
          token
        },
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        console.log('✅ WebSocket connected');
      });

      socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
      });
    }

    socketRef.current = socket;

    return () => {
      // Don't disconnect on unmount, keep connection alive
      // socket.disconnect();
    };
  }, []);

  const on = useCallback((event, callback) => {
    if (!socketRef.current) return;

    // Remove old listener if exists
    if (listenersRef.current.has(event)) {
      const oldCallback = listenersRef.current.get(event);
      socketRef.current.off(event, oldCallback);
    }

    // Add new listener
    socketRef.current.on(event, callback);
    listenersRef.current.set(event, callback);

    // Return cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.off(event, callback);
        listenersRef.current.delete(event);
      }
    };
  }, []);

  const emit = useCallback((event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }, []);

  return {
    socket: socketRef.current,
    on,
    emit,
    disconnect,
    isConnected: socketRef.current?.connected || false
  };
}
