import { create } from 'zustand';
import { axiosClient } from '../api/axiosClient';

const pathMatches = (taskPath, navPath) => {
  if (!taskPath || !navPath) return false;
  const [taskPathname, taskSearch] = taskPath.split('?');
  const [navPathname, navSearch] = navPath.split('?');
  if (taskPathname !== navPathname) return false;
  if (navSearch) return taskSearch === navSearch;
  return true;
};

/**
 * Pending work is server state, not browser read history. Socket events only
 * request a fresh snapshot; they never increment a counter by themselves.
 */
export const useDepartmentNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  byPath: {},
  isLoading: false,

  fetchPendingWork: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const response = await axiosClient.get('/workflow/pending');
      const snapshot = response.data || { total: 0, byPath: {}, tasks: [] };
      const tasks = (snapshot.tasks || []).map((item) => ({
        ...item,
        patientName: item.patientName || 'Patient',
        uhid: item.uhid || 'N/A',
        timestamp: item.createdAt ? new Date(item.createdAt) : new Date(),
        isPending: true,
        isRead: false,
      }));
      set({ notifications: tasks, unreadCount: snapshot.total || tasks.length, byPath: snapshot.byPath || {} });
    } catch (error) {
      console.error('Failed to refresh pending work:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchInitialNotifications: async () => get().fetchPendingWork(),
  addNotification: () => get().fetchPendingWork(),
  resolvePending: () => get().fetchPendingWork(),

  // Viewing is intentionally not a workflow transition.
  markAsRead: () => {},
  markAllAsRead: () => {},
  markAsReadForNav: () => {},

  getUnreadCountForNav: (navPath) => get().notifications.filter((item) => pathMatches(item.linkedPath, navPath)).length,
}));
