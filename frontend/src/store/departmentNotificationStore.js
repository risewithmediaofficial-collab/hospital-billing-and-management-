import { create } from 'zustand';
import { axiosClient } from '../api/axiosClient';

const pathMatches = (taskPath, navPath) => {
  if (!taskPath || !navPath) return false;
  const [taskPathname, taskSearch] = taskPath.split('?');
  const [navPathname, navSearch] = navPath.split('?');

  const isNursingTask = ['/nursing/dashboard', '/nurse-incharge/dashboard'].includes(taskPathname);
  const isNursingNav = ['/nursing/dashboard', '/nurse-incharge/dashboard'].includes(navPathname);

  if (isNursingTask && isNursingNav) {
    if (!navSearch) return true;
    return taskSearch === navSearch;
  }

  if (taskPathname !== navPathname) return false;
  if (!navSearch) return true;
  return taskSearch === navSearch;
};

/**
 * Pending work is server state, not browser read history. Socket events only
 * request a fresh snapshot; they never increment a counter by themselves.
 */
export const useDepartmentNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  byPath: {},
  navCountOverrides: {},
  isLoading: false,

  fetchPendingWork: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const response = await axiosClient.get('/workflow/pending');
      const snapshot = response?.data || response || { total: 0, byPath: {}, tasks: [] };
      const tasks = (snapshot.tasks || []).map((item) => ({
        ...item,
        patientName: item.patientName || 'Patient',
        uhid: item.uhid || 'N/A',
        timestamp: item.createdAt ? new Date(item.createdAt) : new Date(),
        isPending: true,
        isRead: false,
      }));
      set({ notifications: tasks, unreadCount: Number(snapshot.total) || 0, byPath: snapshot.byPath || {} });
    } catch (error) {
      // Quietly handle transient server or network hiccups during background polling
    } finally {
      set({ isLoading: false });
    }
  },

  fetchInitialNotifications: async () => get().fetchPendingWork(),
  refreshPendingWork: async () => get().fetchPendingWork(),
  addNotification: () => get().fetchPendingWork(),
  resolvePending: () => get().fetchPendingWork(),

  // Compatibility for workflow screens: a completed backend action triggers a recount.
  markAsRead: () => get().fetchPendingWork(),
  markAllAsRead: () => get().fetchPendingWork(),
  markAsReadForNav: () => {},

  setNavCount: (navPath, count) => set((state) => ({
    navCountOverrides: {
      ...state.navCountOverrides,
      [navPath]: Math.max(0, Number(count) || 0),
    },
  })),

  getUnreadCountForNav: (navPath) => {
    const override = get().navCountOverrides[navPath];
    if (override !== undefined) return override;
    const matchingCount = get().notifications.filter((item) => pathMatches(item.linkedPath, navPath)).length;
    if (matchingCount > 0) return matchingCount;
    if (get().byPath[navPath] !== undefined) return get().byPath[navPath];
    return 0;
  },
}));
