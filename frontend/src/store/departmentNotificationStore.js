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
      resourceId: data.resourceId || null,
      linkedPath: data.linkedPath || null,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      isRead: isAlreadyRead,
      priority: data.priority || 'NORMAL',
      isPending: Boolean(data.isPending),
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

  resolvePending: (resourceId) => {
    const updated = get().notifications.map((notification) => {
      const matches = notification.id === resourceId ||
        String(notification.orderId || '') === String(resourceId || '') ||
        String(notification.resourceId || '') === String(resourceId || '');
      return matches ? { ...notification, isPending: false, isRead: true } : notification;
    });
    set({ notifications: updated, unreadCount: updated.filter((notification) => !notification.isRead).length });
  },

  markAsReadForNav: (navPath) => {
    const { notifications } = get();
    if (!navPath) return;

    const [pathname, search] = navPath.split('?');
    const readIds = getSavedReadIds();
    let countChanged = false;

    const updated = notifications.map((n) => {
      if (!n.isRead && !n.isPending && n.linkedPath) {
        const [nPathname, nSearch] = n.linkedPath.split('?');
        const match = search && nSearch ? pathname === nPathname && search === nSearch : pathname === nPathname;
        if (match) {
          countChanged = true;
          if (n.id) saveReadIdToStorage(n.id);
          if (n.orderId) saveReadIdToStorage(n.orderId);
          return { ...n, isRead: true };
        }
      }
      return n;
    });

    if (countChanged) {
      const unread = updated.filter((n) => !n.isRead).length;
      set({ notifications: updated, unreadCount: unread });
    }
  },

  getUnreadCountForNav: (navPath) => {
    const { notifications } = get();
    if (!navPath) return 0;

    const [pathname, search] = navPath.split('?');
    return notifications.filter((n) => {
      if (n.isRead && !n.isPending) return false;
      if (!n.linkedPath) return false;

      const [nPathname, nSearch] = n.linkedPath.split('?');
      if (search && nSearch) {
        return pathname === nPathname && search === nSearch;
      }
      return pathname === nPathname;
    }).length;
  },

  fetchInitialNotifications: async (rolesInput = []) => {
    try {
      const roles = Array.isArray(rolesInput) ? rolesInput : [rolesInput];
      const fetchedNotifs = [];
      const existingNotifs = get().notifications;
      const readIds = getSavedReadIds();

      const addOrders = async (category, linkedPath, event) => {
        const res = await axiosClient.get(`/diagnostics/orders?testCategory=${category}`);
        for (const ord of res.data || []) {
          if (['COMPLETED', 'REPORT_UPLOADED'].includes(ord.status)) continue;
          const id = `pending_${ord._id}`;
          fetchedNotifs.push({ id, orderId: ord._id, event, patientName: ord.patientName, uhid: ord.uhid,
            title: `Pending: ${ord.testName}`, message: `${ord.testName} is waiting for department action.`,
            timestamp: new Date(ord.createdAt), isRead: readIds.includes(id), isPending: true, linkedPath, priority: ord.priority });
        }
      };

      if (roles.some((role) => ['RADIOLOGIST', 'RADIOLOGY_STAFF'].includes(role))) {
        await addOrders('RADIOLOGY', '/radiology/dashboard', 'RADIOLOGY_ORDER_CREATED');
      }
      if (roles.some((role) => ['LAB_TECH', 'LABORATORY_STAFF'].includes(role))) {
        await addOrders('PATHOLOGY', '/laboratory/dashboard', 'LAB_ORDER_CREATED');
      }
      if (roles.some((role) => ['CASHIER', 'BILLING_STAFF'].includes(role))) {
        const res = await axiosClient.get('/billing/unpaid-invoices');
        for (const invoice of res.data || []) {
          const id = `pending_invoice_${invoice._id}`;
          fetchedNotifs.push({ id, resourceId: invoice._id, event: 'CONSULTATION_COMPLETE',
            patientName: `${invoice.patientId?.firstName || ''} ${invoice.patientId?.lastName || ''}`.trim() || 'Patient',
            uhid: invoice.patientId?.uhid || 'N/A', title: `Payment Pending: ${invoice.invoiceNo}`,
            message: `Balance payment of ${invoice.balanceAmount} is pending.`, timestamp: new Date(invoice.createdAt),
            isRead: readIds.includes(id), isPending: true, linkedPath: '/billing/dashboard', priority: 'HIGH' });
        }
      }
      if (roles.includes('DOCTOR')) {
        const res = await axiosClient.get('/diagnostics/orders');
        for (const ord of res.data || []) {
          if (!['COMPLETED', 'REPORT_UPLOADED'].includes(ord.status) || ord.chargeStatus === 'APPROVED') continue;
          const id = `report_${ord._id}_${ord.status}`;
          const isRadiology = ['XRAY', 'MRI', 'CT_SCAN', 'ULTRASOUND', 'RADIOLOGY'].includes(ord.testCategory);
          fetchedNotifs.push({ id, orderId: ord._id, event: isRadiology ? 'RADIOLOGY_SUBMITTED' : 'LAB_SUBMITTED',
            patientName: ord.patientName, uhid: ord.uhid, title: `Report Ready: ${ord.testName}`,
            message: ord.reportSummary || `${ord.testName} is ready for doctor review.`, timestamp: new Date(ord.updatedAt),
            isRead: readIds.includes(id), isPending: true, linkedPath: '/doctor/dashboard?tab=DEPT_RESPONSES', priority: 'HIGH' });
        }
      }

      const merged = [...fetchedNotifs, ...existingNotifs.filter((existing) => !fetchedNotifs.some((item) => item.id === existing.id))];

      const unread = merged.filter((n) => !n.isRead).length;
      set({ notifications: merged, unreadCount: unread });
    } catch (err) {
      console.error('Failed to fetch initial department notifications:', err);
    }
  },
}));
