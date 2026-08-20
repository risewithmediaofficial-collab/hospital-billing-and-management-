import { create } from 'zustand';
import { axiosClient } from '../api/axiosClient';
import { useNotificationStore } from './notificationStore';

export const pathMatches = (taskPath, navPath) => {
  if (!taskPath || !navPath) return false;
  const [taskPathname, taskSearch] = taskPath.split('?');
  const [navPathname, navSearch] = navPath.split('?');

  const isNursingTask = ['/nursing/dashboard', '/nurse-incharge/dashboard', '/nursing'].includes(taskPathname);
  const isNursingNav = ['/nursing/dashboard', '/nurse-incharge/dashboard', '/nursing'].includes(navPathname);
  if (isNursingTask && isNursingNav) {
    if (!navSearch) return true;
    return taskSearch === navSearch;
  }

  const isReceptionTask = ['/reception/registered-patients', '/reception/dashboard', '/reception/register-patient', '/reception/tokens', '/reception'].includes(taskPathname);
  const isReceptionNav = ['/reception/registered-patients', '/reception/dashboard', '/reception/register-patient', '/reception/tokens', '/reception'].includes(navPathname);
  if (isReceptionTask && isReceptionNav) {
    if (!navSearch) return true;
    return taskSearch === navSearch;
  }

  const isPharmacyTask = ['/pharmacy/dashboard', '/pharmacy/dispense-queue', '/pharmacy/prescriptions', '/pharmacy'].includes(taskPathname);
  const isPharmacyNav = ['/pharmacy/dashboard', '/pharmacy/dispense-queue', '/pharmacy/prescriptions', '/pharmacy'].includes(navPathname);
  if (isPharmacyTask && isPharmacyNav) {
    if (!navSearch) return true;
    return taskSearch === navSearch;
  }

  const isBillingTask = ['/billing/dashboard', '/billing/receipts', '/billing'].includes(taskPathname);
  const isBillingNav = ['/billing/dashboard', '/billing/receipts', '/billing'].includes(navPathname);
  if (isBillingTask && isBillingNav) {
    if (!navSearch) return true;
    return taskSearch === navSearch;
  }

  const isLabTask = ['/laboratory/dashboard', '/laboratory'].includes(taskPathname);
  const isLabNav = ['/laboratory/dashboard', '/laboratory'].includes(navPathname);
  if (isLabTask && isLabNav) {
    if (!navSearch) return true;
    return taskSearch === navSearch;
  }

  const isRadioTask = ['/radiology/dashboard', '/radiology'].includes(taskPathname);
  const isRadioNav = ['/radiology/dashboard', '/radiology'].includes(navPathname);
  if (isRadioTask && isRadioNav) {
    if (!navSearch) return true;
    return taskSearch === navSearch;
  }

  const isDoctorTask = ['/doctor/dashboard', '/doctor'].includes(taskPathname);
  const isDoctorNav = ['/doctor/dashboard', '/doctor'].includes(navPathname);
  if (isDoctorTask && isDoctorNav) {
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

    // 1. Check matching pending tasks from /workflow/pending
    const matchingPendingCount = get().notifications.filter((item) => pathMatches(item.linkedPath, navPath)).length;

    // 2. Also check unread notifications from useNotificationStore
    let bellUnreadCount = 0;
    try {
      const bellNotifs = useNotificationStore.getState().notifications || [];
      bellUnreadCount = bellNotifs.filter((n) => !n.isRead && pathMatches(n.linkedPath || n.targetRoute, navPath)).length;
    } catch {
      // ignore
    }

    const totalMatching = Math.max(matchingPendingCount, bellUnreadCount);
    if (totalMatching > 0) return totalMatching;

    if (get().byPath[navPath] !== undefined) return get().byPath[navPath];
    return 0;
  },
}));
