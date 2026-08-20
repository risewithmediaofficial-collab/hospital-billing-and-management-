import { create } from 'zustand';
import { axiosClient } from '../api/axiosClient';
import { useNotificationStore } from './notificationStore';

// Strips protocol, host, and tenant prefix (e.g. /test-hospital-1/)
const cleanPath = (raw) => {
  if (!raw) return '';
  let p = raw.trim();
  // Strip protocol and host if present
  try {
    if (p.startsWith('http://') || p.startsWith('https://')) {
      const url = new URL(p);
      p = url.pathname + url.search;
    }
  } catch {}

  // Strip tenant prefix: /tenant-name/(doctor|nursing|nurse-incharge|reception|billing|pharmacy|laboratory|radiology|admin|emergency)
  p = p.replace(/^\/[^/]+(?=\/(?:doctor|reception|nursing|nurse-incharge|admin|billing|pharmacy|laboratory|radiology|emergency))/, '');
  return p;
};

export const pathMatches = (taskPath, navPath, metadata = {}) => {
  if (!navPath) return false;

  const targetPath = cleanPath(taskPath || metadata.targetRoute || metadata.link || metadata.linkedPath || '');
  const baseNav = cleanPath(navPath);

  // If no target path exists, check targetModule
  if (!targetPath && metadata.targetModule) {
    const mod = (metadata.targetModule || '').toLowerCase();
    if (mod === 'doctor' && baseNav.startsWith('/doctor')) return true;
    if (mod === 'nursing' && (baseNav.startsWith('/nurse-incharge') || baseNav.startsWith('/nursing'))) return true;
    if (mod === 'billing' && baseNav.startsWith('/billing')) return true;
    if (mod === 'pharmacy' && baseNav.startsWith('/pharmacy')) return true;
    if (mod === 'laboratory' && baseNav.startsWith('/laboratory')) return true;
    if (mod === 'radiology' && baseNav.startsWith('/radiology')) return true;
    if (mod === 'reception' && baseNav.startsWith('/reception')) return true;
  }

  if (!targetPath) return false;

  const [tPath, tQueryStr = ''] = targetPath.split('?');
  const [nPath, nQueryStr = ''] = baseNav.split('?');

  const tParams = new URLSearchParams(tQueryStr.toLowerCase());
  const nParams = new URLSearchParams(nQueryStr.toLowerCase());

  const tTab = (tParams.get('tab') || '').toUpperCase();
  const nTab = (nParams.get('tab') || '').toUpperCase();

  // 1. Doctor Routes
  const isDoctorTask = tPath.startsWith('/doctor');
  const isDoctorNav = nPath.startsWith('/doctor');
  if (isDoctorTask && isDoctorNav) {
    if (nTab === 'DEPT_RESPONSES') {
      return (
        tTab === 'DEPT_RESPONSES' ||
        tTab === 'SENT_DEPARTMENTS' ||
        metadata.notificationType === 'DEPARTMENT_RESPONSE' ||
        metadata.notificationType === 'NURSE_RESPONSE' ||
        metadata.notificationType === 'SUBSTITUTION_REQUEST' ||
        metadata.type === 'NURSE_TASK_COMPLETED' ||
        metadata.type === 'REPORT_READY'
      );
    }
    if (nTab === 'FOLLOW_UPS') return tTab === 'FOLLOW_UPS';
    if (nTab === 'COMPLETED') return tTab === 'COMPLETED';
    if (!nTab || nTab === 'OVERVIEW' || nTab === 'LIVE') {
      return !tTab || tTab === 'OVERVIEW' || tTab === 'LIVE' || tTab === 'QUEUE';
    }
    return tTab === nTab;
  }

  // 2. Nursing Routes
  const isNursingTask = tPath.startsWith('/nurse-incharge') || tPath.startsWith('/nursing');
  const isNursingNav = nPath.startsWith('/nurse-incharge') || nPath.startsWith('/nursing');
  if (isNursingTask && isNursingNav) {
    if (nTab === 'TASKS') {
      return !tTab || tTab === 'TASKS' || metadata.targetModule === 'nursing' || metadata.type === 'NEW_NURSE_TASKS' || metadata.notificationType === 'NEW_DATA';
    }
    if (nTab === 'REQUISITIONS') return tTab === 'REQUISITIONS' || metadata.type === 'ADMISSION_REQUISITION';
    if (nTab === 'ADMITTED') return tTab === 'ADMITTED';
    if (nTab === 'REQUESTS') return tTab === 'REQUESTS';
    return tTab === nTab;
  }

  // 3. Bed Matrix
  if (nPath.includes('/admin/bed-matrix')) {
    return tPath.includes('/admin/bed-matrix') || tPath.includes('/beds');
  }

  // 4. Reception Routes
  const isReceptionTask = tPath.startsWith('/reception');
  const isReceptionNav = nPath.startsWith('/reception');
  if (isReceptionTask && isReceptionNav) {
    if (nTab === 'FOLLOW_UPS') return tTab === 'FOLLOW_UPS';
    if (nTab === 'ALL') return tTab === 'ALL';
    if (nPath.includes('/tokens')) return tPath.includes('/tokens') || tPath.includes('/queue');
    if (!nTab) return !tTab || tTab === 'DASHBOARD' || tTab === 'REGISTERED';
    return tTab === nTab;
  }

  // 5. Billing Desk
  const isBillingTask = tPath.startsWith('/billing');
  const isBillingNav = nPath.startsWith('/billing');
  if (isBillingTask && isBillingNav) {
    if (nTab === 'RECEIPTS') return tTab === 'RECEIPTS' || tPath.includes('/receipts');
    if (!nTab) return !tTab || tTab === 'DASHBOARD' || metadata.targetModule === 'billing' || metadata.notificationType === 'BILLING_UPDATE';
    return tTab === nTab;
  }

  // 6. Pharmacy
  const isPharmacyTask = tPath.startsWith('/pharmacy');
  const isPharmacyNav = nPath.startsWith('/pharmacy');
  if (isPharmacyTask && isPharmacyNav) {
    if (nPath.includes('/dispense-queue')) return tPath.includes('/dispense-queue') || tPath.includes('/prescriptions');
    if (nPath.includes('/dashboard')) return tPath.includes('/dashboard');
    return true;
  }

  // 7. Diagnostics (Lab / Radiology)
  if (nPath.startsWith('/laboratory') && tPath.startsWith('/laboratory')) return true;
  if (nPath.startsWith('/radiology') && tPath.startsWith('/radiology')) return true;
  if (nPath.startsWith('/emergency') && tPath.startsWith('/emergency')) return true;

  if (tPath !== nPath) return false;
  if (!nTab) return true;
  return tTab === nTab;
};

/**
 * Department and workflow notification store.
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
    const matchingPendingCount = get().notifications.filter((item) => pathMatches(item.linkedPath, navPath, item)).length;

    // 2. Check unread notifications from useNotificationStore (bell notifications)
    let bellUnreadCount = 0;
    try {
      const bellNotifs = useNotificationStore.getState().notifications || [];
      bellUnreadCount = bellNotifs.filter((n) => {
        if (n.isRead || n.isCleared) return false;
        return pathMatches(n.linkedPath || n.targetRoute || n.link, navPath, n);
      }).length;
    } catch {
      // ignore
    }

    const totalMatching = Math.max(matchingPendingCount, bellUnreadCount);
    if (totalMatching > 0) return totalMatching;

    if (get().byPath[navPath] !== undefined) return get().byPath[navPath];
    return 0;
  },
}));
