import { create } from 'zustand';
import { axiosClient } from '../api/axiosClient';
import { useAuthStore } from './authStore';

export const isUnauthorizedForRole = (notif, userRole, additionalRoles = []) => {
  if (!userRole) return false;
  const allRoles = [userRole, ...(Array.isArray(additionalRoles) ? additionalRoles : [])].filter(Boolean);
  if (allRoles.includes('HOSPITAL_ADMIN')) return false; // Hospital Admin receives executive hospital notices

  const target = (notif.linkedPath || notif.targetRoute || notif.link || '').toLowerCase();
  const mod = (notif.targetModule || '').toLowerCase();
  const type = String(notif.type || notif.notificationType || '').toUpperCase();
  const title = String(notif.title || '').toLowerCase();
  const msg = String(notif.message || '').toLowerCase();
  const role = String(notif.recipientRole || '').toUpperCase();

  // Emergency broadcasts are allowed for all staff
  if (type === 'EMERGENCY' || role === 'ALL' || title.includes('emergency')) {
    return false;
  }

  // 1. SUPER_ADMIN: Only platform SaaS & governance
  if (userRole === 'SUPER_ADMIN') {
    if (['doctor', 'nursing', 'nurse-incharge', 'pharmacy', 'laboratory', 'radiology', 'billing', 'reception', 'ipd', 'opd'].some((m) => target.includes(`/${m}`) || mod === m)) {
      return true;
    }
    if ([
      'WORKFLOW', 'WORKFLOW_ALERT', 'NEW_DATA', 'DEPT_RESPONSE', 'DEPARTMENT_RESPONSE',
      'NURSE_RESPONSE', 'BILLING_UPDATE', 'PRESCRIPTION_ISSUED', 'PATIENT_QUEUED',
      'DIAGNOSTIC_ORDER', 'NURSE_TASKS', 'NURSE_TASK_COMPLETED', 'REPORT_READY',
      'DOCTOR_PATIENT', 'BILLING_WORK', 'LAB_WORK', 'RADIOLOGY_WORK',
    ].includes(type)) {
      return true;
    }
    return false;
  }

  // 2. DOCTOR
  if (allRoles.includes('DOCTOR') && !allRoles.includes('CASHIER') && !allRoles.includes('PHARMACIST')) {
    const isDoctorBillingQuery = (
      (type === 'BILLING_QUERY' || title.includes('billing review') || title.includes('billing query')) &&
      (mod === 'doctor' || target.includes('/doctor') || !target || target === '/')
    );
    if (isDoctorBillingQuery) return false;

    const isDoctorSubstitution = (
      (type === 'SUBSTITUTION_REQUEST' || title.includes('substitution')) &&
      (mod === 'doctor' || target.includes('/doctor') || !target || target === '/')
    );
    if (isDoctorSubstitution) return false;

    if (['cashier', 'billing_staff'].includes(role.toLowerCase())) return true;
    if (['billing', 'cashier'].some((m) => target.includes(`/${m}`) || mod === m)) return true;
    if ([
      'new bill pending', 'pharmacy dispensed & billed', 'pharmacy clearance',
      'invoice generated', 'bill ready', 'payment collected', 'payment received',
      'bill generation requested', 'billing query & return', 'medicines dispensed',
    ].some((t) => title.includes(t) || msg.includes(t))) {
      return true;
    }

    if (['pharmacist', 'pharmacy_staff'].includes(role.toLowerCase())) return true;
    if (['pharmacy', 'inventory', 'stock'].some((m) => target.includes(`/${m}`) || mod === m)) return true;
    if ([
      'medicine dispensed', 'pharmacy dispensed', 'stock updated', 'low stock', 'inventory alert',
    ].some((t) => title.includes(t) || msg.includes(t))) {
      return true;
    }
  }

  // 3. PHARMACIST / PHARMACY_STAFF
  if ((allRoles.includes('PHARMACIST') || allRoles.includes('PHARMACY_STAFF')) && !allRoles.includes('DOCTOR') && !allRoles.includes('CASHIER')) {
    if (target.includes('/laboratory') || target.includes('/radiology') || target.includes('/nurse') || target.includes('/billing')) return true;
    if (['doctor', 'nursing', 'nurse-incharge', 'laboratory', 'radiology', 'billing', 'cashier'].includes(mod)) return true;
    if (['LAB_ORDER_CREATED', 'RADIOLOGY_ORDER_CREATED', 'NURSE_TASKS', 'PATIENT_QUEUED', 'DOCTOR_REVIEWED_LAB', 'DOCTOR_REVIEWED_RADIOLOGY', 'INVOICE_GENERATED', 'PAYMENT_COLLECTED'].includes(type)) return true;
    if (['new lab request', 'radiology scan', 'injection task', 'treatment request', 'invoice generated', 'payment collected', 'patient in queue'].some((t) => title.includes(t))) return true;
  }

  // 4. CASHIER / BILLING_STAFF
  if ((allRoles.includes('CASHIER') || allRoles.includes('BILLING_STAFF')) && !allRoles.includes('DOCTOR')) {
    if (target.includes('/laboratory') || target.includes('/radiology') || target.includes('/nurse') || target.includes('/doctor')) return true;
    if (['doctor', 'nursing', 'nurse-incharge', 'laboratory', 'radiology'].includes(mod)) return true;
    if (['LAB_ORDER_CREATED', 'RADIOLOGY_ORDER_CREATED', 'NURSE_TASKS', 'PATIENT_QUEUED', 'DOCTOR_REVIEWED_LAB', 'DOCTOR_REVIEWED_RADIOLOGY'].includes(type)) return true;
    if (['new lab request', 'radiology scan ready', 'injection task', 'treatment request', 'patient in queue'].some((t) => title.includes(t))) return true;
  }

  // 5. LAB_TECH / LABORATORY_STAFF
  if (allRoles.includes('LAB_TECH') || allRoles.includes('LABORATORY_STAFF')) {
    if (target.includes('/radiology') || target.includes('/pharmacy') || target.includes('/billing') || target.includes('/nurse')) return true;
    if (['radiology', 'pharmacy', 'billing', 'cashier', 'nursing'].includes(mod)) return true;
    if (['RADIOLOGY_ORDER_CREATED', 'PRESCRIPTION_ISSUED', 'BILL_REQUESTED', 'PAYMENT_COLLECTED', 'NURSE_TASKS'].includes(type)) return true;
    if (['radiology', 'prescription', 'dispensed', 'invoice', 'payment', 'injection'].some((t) => title.includes(t))) return true;
  }

  // 6. RADIOLOGIST / RADIOLOGY_STAFF
  if (allRoles.includes('RADIOLOGIST') || allRoles.includes('RADIOLOGY_STAFF')) {
    if (target.includes('/laboratory') || target.includes('/pharmacy') || target.includes('/billing') || target.includes('/nurse')) return true;
    if (['laboratory', 'pharmacy', 'billing', 'cashier', 'nursing'].includes(mod)) return true;
    if (['LAB_ORDER_CREATED', 'PRESCRIPTION_ISSUED', 'BILL_REQUESTED', 'PAYMENT_COLLECTED', 'NURSE_TASKS'].includes(type)) return true;
    if (['lab request', 'blood', 'urine', 'prescription', 'dispensed', 'invoice', 'payment', 'injection'].some((t) => title.includes(t))) return true;
  }

  // 7. NURSE / NURSE_INCHARGE
  if ((allRoles.includes('NURSE') || allRoles.includes('NURSE_INCHARGE')) && !allRoles.includes('DOCTOR')) {
    if (target.includes('/pharmacy') || target.includes('/billing')) return true;
    if (['pharmacy', 'billing', 'cashier'].includes(mod)) return true;
    if (['PRESCRIPTION_ISSUED', 'PHARMACY_DISPENSED', 'BILL_REQUESTED', 'PAYMENT_COLLECTED'].includes(type)) return true;
    if (['pharmacy dispensed', 'invoice generated', 'payment collected'].some((t) => title.includes(t))) return true;
  }

  // 8. RECEPTIONIST / OPD_STAFF
  if ((allRoles.includes('RECEPTIONIST') || allRoles.includes('OPD_STAFF')) && !allRoles.includes('DOCTOR') && !allRoles.includes('HOSPITAL_ADMIN')) {
    if (target.includes('/laboratory') || target.includes('/radiology') || target.includes('/pharmacy')) return true;
    if (['laboratory', 'radiology', 'pharmacy'].includes(mod)) return true;
    if (['LAB_ORDER_CREATED', 'RADIOLOGY_ORDER_CREATED', 'PRESCRIPTION_ISSUED', 'PHARMACY_DISPENSED'].includes(type)) return true;
    if (['lab request', 'radiology scan', 'pharmacy dispensed', 'injection administered'].some((t) => title.includes(t))) return true;
  }

  return false;
};

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
    try {
      const result = await axiosClient.get('/notifications');
      const data = result?.data || result || {};
      const user = useAuthStore.getState().user;
      const userRole = user?.role;
      const additionalRoles = user?.additionalRoles || [];
      const allItems = (data.notifications || []).map(normalize);
      const items = allItems.filter(
        (n) => !isUnauthorizedForRole(n, userRole, additionalRoles)
      );
      const unread = items.filter((n) => !n.isRead).length;

      set({
        notifications: items,
        unreadCount: unread,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load notifications:', error);
      set({ isLoading: false });
    }
  },

  fetchInitialNotifications: async () => get().fetchNotifications(),
  addNotification: (payload) => {
    if (payload && (payload.title || payload.message)) {
      const user = useAuthStore.getState().user;
      const userRole = user?.role;
      const additionalRoles = user?.additionalRoles || [];
      const normalized = normalize(payload);
      if (isUnauthorizedForRole(normalized, userRole, additionalRoles)) {
        return;
      }
      set((state) => {
        const exists = state.notifications.some((n) => n.id === normalized.id);
        if (exists) return state;
        return {
          notifications: [normalized, ...state.notifications],
          unreadCount: state.unreadCount + (normalized.isRead ? 0 : 1),
        };
      });
    }
    get().fetchNotifications();
  },

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
