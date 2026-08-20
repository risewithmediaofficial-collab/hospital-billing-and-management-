import { create } from 'zustand';
import { axiosClient } from '../api/axiosClient';

const normalize = (notification) => ({
  ...notification,
  id: notification._id || notification.id,
  linkedPath: notification.targetRoute || notification.link || '',
  timestamp: notification.createdAt ? new Date(notification.createdAt) : new Date(),
  patientName: notification.metadata?.patientName || 'Patient',
  uhid: notification.metadata?.uhid || 'N/A',
});

/** Persisted bell notifications. This store never contains or mutates pending work. */
export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const result = await axiosClient.get('/notifications');
      const data = result?.data || result || {};
      set({
        notifications: (data.notifications || []).map(normalize),
        unreadCount: Number(data.unreadCount) || 0,
      });
    } catch (error) {
      console.error('Failed to load notifications:', error);
      set({ notifications: [], unreadCount: 0 });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchInitialNotifications: async () => get().fetchNotifications(),
  addNotification: () => get().fetchNotifications(),

  markAsRead: async (id) => {
    const item = get().notifications.find((n) => n.id === id);
    if (!item || item.isRead) return;
    set((state) => ({
      notifications: state.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
    try { await axiosClient.patch(`/notifications/${encodeURIComponent(id)}/read`); }
    catch (error) { await get().fetchNotifications(); }
  },

  markRouteAsRead: async (routePath) => {
    if (!routePath) return;
    const clean = String(routePath).split('?')[0];
    set((state) => {
      let readDeduction = 0;
      const updated = state.notifications.map((n) => {
        const link = n.linkedPath || n.targetRoute || n.link || '';
        if (!n.isRead && link.includes(clean)) {
          readDeduction += 1;
          return { ...n, isRead: true };
        }
        return n;
      });
      return {
        notifications: updated,
        unreadCount: Math.max(0, state.unreadCount - readDeduction),
      };
    });
    try {
      await axiosClient.post('/notifications/read-route', { route: routePath });
    } catch {
      // ignore
    }
  },

  markAllAsRead: async () => {
    set((state) => ({ notifications: state.notifications.map((n) => ({ ...n, isRead: true })), unreadCount: 0 }));
    try { await axiosClient.post('/notifications/read-all'); }
    catch (error) { await get().fetchNotifications(); }
  },

  clearNotification: async (id) => {
    set((state) => {
      const removed = state.notifications.find((n) => n.id === id);
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: Math.max(0, state.unreadCount - (removed && !removed.isRead ? 1 : 0)),
      };
    });
    try {
      await axiosClient.delete(`/notifications/${encodeURIComponent(id)}`);
    } catch (error) {
      console.error('Failed to clear notification:', error);
      await get().fetchNotifications();
    }
  },

  clearAllNotifications: async () => {
    set({ notifications: [], unreadCount: 0 });
    try {
      await axiosClient.delete('/notifications/clear-all');
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      await get().fetchNotifications();
    }
  },
}));
