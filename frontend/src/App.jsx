import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { SocketProvider } from './providers/SocketProvider';
import { AppRoutes } from './routes/AppRoutes';
import { useAuthStore } from './store/authStore';

export const App = () => {
  const { fetchProfile } = useAuthStore();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <QueryProvider>
      <SocketProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </SocketProvider>
    </QueryProvider>
  );
};

export default App;
