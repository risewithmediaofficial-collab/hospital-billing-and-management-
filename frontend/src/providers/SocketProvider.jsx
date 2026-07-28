import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuthStore();
  const [socket, setSocket] = useState(null);
  const [activeCodeBlue, setActiveCodeBlue] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketInstance = io('/', {
      auth: { token },
      autoConnect: true,
      reconnectionAttempts: 5,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket.IO Client] Connected to server successfully');
    });

    socketInstance.on('emergency:code_blue_triggered', (data) => {
      console.warn('[EMERGENCY] Code Blue Received!', data);
      setActiveCodeBlue(data);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, isAuthenticated]);

  const dismissCodeBlue = () => setActiveCodeBlue(null);

  return (
    <SocketContext.Provider value={{ socket, activeCodeBlue, dismissCodeBlue }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
