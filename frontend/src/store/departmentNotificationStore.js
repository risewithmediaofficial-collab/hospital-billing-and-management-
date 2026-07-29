import { create } from 'zustand';
import { axiosClient } from '../api/axiosClient';

const getSavedReadIds = () => {
  try {
    const saved = localStorage.getItem('hpmbs_dept_read_notifs');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

const saveReadIdToStorage = (id) => {
  try {
    const readIds = getSavedReadIds();
    const strId = String(id);
    if (!readIds.includes(strId)) {
      const updated = [...readIds, strId];
      localStorage.setItem('hpmbs_dept_read_notifs', JSON.stringify(updated));
    }
  } catch (e) {}
};

export const useDepartmentNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  // Add notification with strict deduplication
  addNotification: (data) => {
    const { notifications } = get();
    const notifId = data.id || `${data.event || 'EVT'}_${data.orderId || data.patientId || Date.now()}`;
    const readIds = getSavedReadIds();
    const isAlreadyRead = readIds.includes(String(notifId)) || (data.orderId && readIds.includes(String(data.orderId)));

    const exists = notifications.some((n) => n.id === notifId);
    if (exists) return;

    const newNotif = {
      id: notifId,
      event: data.event || 'WORKFLOW_EVENT',
      title: data.title || 'Department Notification',
      message: data.message || '',
      patientName: data.patientName || 'Patient',
      uhid: data.uhid || 'N/A',
      orderId: data.orderId || null,
      linkedPath: data.linkedPath || null,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      isRead: isAlreadyRead,
      priority: data.priority || 'NORMAL',
    };

    const updated = [newNotif, ...notifications];
    const unread = updated.filter((n) => !n.isRead).length;

    set({ notifications: updated, unreadCount: unread });
  },

  markAsRead: (id) => {
    const { notifications } = get();
    saveReadIdToStorage(id);
    let countChanged = false;

    const updated = notifications.map((n) => {
      if ((n.id === id || n.orderId === id || String(n.orderId) === String(id)) && !n.isRead) {
        countChanged = true;
        return { ...n, isRead: true };
      }
      return n;
    });

    if (countChanged) {
      const unread = updated.filter((n) => !n.isRead).length;
      set({ notifications: updated, unreadCount: unread });
    }
  },

  markAllAsRead: () => {
    const { notifications } = get();
    notifications.forEach((n) => {
      if (n.id) saveReadIdToStorage(n.id);
      if (n.orderId) saveReadIdToStorage(n.orderId);
    });
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    set({ notifications: updated, unreadCount: 0 });
  },

  getUnreadCountForNav: (navPath) => {
    const { notifications } = get();
    if (!navPath) return 0;

    const [pathname, search] = navPath.split('?');
    return notifications.filter((n) => {
      if (n.isRead) return false;
      if (!n.linkedPath) return false;

      const [nPathname, nSearch] = n.linkedPath.split('?');
      if (search && nSearch) {
        return pathname === nPathname && search === nSearch;
      }
      return pathname === nPathname;
    }).length;
  },

  fetchInitialNotifications: async () => {
    try {
      const res = await axiosClient.get('/diagnostics/orders');
      const orders = res.data || [];
      const completedOrders = orders.filter((o) => o.status === 'REPORT_UPLOADED' || o.status === 'COMPLETED');

      const existingNotifs = get().notifications;
      const readIds = getSavedReadIds();

      const fetchedNotifs = completedOrders.map((ord) => {
        const notifId = `ord_${ord._id}_${ord.status}`;
        const existing = existingNotifs.find((n) => n.id === notifId || n.orderId === ord._id);
        const isRead = existing ? existing.isRead : (readIds.includes(String(ord._id)) || readIds.includes(notifId));

        return {
          id: notifId,
          orderId: ord._id,
          event: 'LAB_SUBMITTED',
          patientName: ord.patientName || (ord.patientId ? `${ord.patientId.firstName || ''} ${ord.patientId.lastName || ''}`.trim() : 'Patient'),
          uhid: ord.uhid || ord.patientId?.uhid || 'N/A',
          title: `Report Ready: ${ord.testName}`,
          message: ord.reportSummary || `Diagnostic scan report completed for ${ord.patientName || 'Patient'}.`,
          timestamp: ord.updatedAt ? new Date(ord.updatedAt) : new Date(),
          isRead,
          linkedPath: '/doctor/dashboard?tab=DEPT_RESPONSES',
          priority: 'HIGH',
        };
      });

      const unread = fetchedNotifs.filter((n) => !n.isRead).length;
      set({ notifications: fetchedNotifs, unreadCount: unread });
    } catch (err) {
      console.error('Failed to fetch initial department notifications:', err);
    }
  },
}));
