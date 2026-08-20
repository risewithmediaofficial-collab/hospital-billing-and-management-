import React, { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { SocketProvider } from './providers/SocketProvider';
import { AppRoutes } from './routes/AppRoutes';
import { useAuthStore } from './store/authStore';
import { useDepartmentNotificationStore } from './store/departmentNotificationStore';
import { useNotificationStore } from './store/notificationStore';

import { LiveToastNotification } from './components/notifications/LiveToastNotification';

const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    const mainElements = document.querySelectorAll('main, .overflow-y-auto');
    mainElements.forEach((el) => {
      el.scrollTop = 0;
    });
  }, [pathname, search]);

  return null;
};

export const App = () => {
  const { fetchProfile } = useAuthStore();

  useEffect(() => {
    fetchProfile();
    const token = localStorage.getItem('hpmbs_access_token');
    if (token) {
      useDepartmentNotificationStore.getState().fetchPendingWork();
      useNotificationStore.getState().fetchNotifications();
    }
  }, [fetchProfile]);

  return (
    <QueryProvider>
      <SocketProvider>
        <BrowserRouter>
          <ScrollToTop />
          <LiveToastNotification />
          <AppRoutes />
        </BrowserRouter>
      </SocketProvider>
    </QueryProvider>
  );
};

export default App;
