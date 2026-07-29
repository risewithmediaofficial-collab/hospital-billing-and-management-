import { create } from 'zustand';
import { axiosClient } from '../api/axiosClient';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  // Add a new notification with strict deduplication
  addNotification: (data) => {
    const { notifications } = get();
    const notifId = data.id || `${data.orderId || ''}_${data.status || ''}_${data.testName || ''}`;

    // Check if notification already exists
    const exists = notifications.some(
      (n) => n.id === notifId || (data.orderId && n.orderId === data.orderId && n.status === data.status)
    );

    if (exists) return; // Do not allow duplicate notification to increment count

    const newNotif = {
      id: notifId,
      orderId: data.orderId,
      patientId: data.patientId,
      patientName: data.patientName || 'Patient',
      uhid: data.uhid || 'N/A',
      testName: data.testName || 'Diagnostic Test',
      status: data.status || 'COMPLETED',
      title: data.title || `Report Ready: ${data.testName || 'Investigation'}`,
      message: data.message || `Diagnostic scan/report completed for ${data.patientName || 'patient'} (${data.uhid || ''}).`,
      reportSummary: data.reportSummary || '',
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      isRead: false,
      category: data.category || 'INVESTIGATION',
    };

    const updated = [newNotif, ...notifications];
    const newUnread = updated.filter((n) => !n.isRead).length;

    set({
      notifications: updated,
      unreadCount: newUnread,
    });
  },

  // Mark a single notification as read (reduces count by 1, moves to read history)
  markAsRead: (id) => {
    const { notifications } = get();
    let countChanged = false;

    const updated = notifications.map((n) => {
      if ((n.id === id || n.orderId === id) && !n.isRead) {
        countChanged = true;
        return { ...n, isRead: true };
      }
      return n;
    });

    if (countChanged) {
      const newUnread = updated.filter((n) => !n.isRead).length;
      set({
        notifications: updated,
        unreadCount: newUnread,
      });
    }
  },

  // Mark all notifications as read
  markAllAsRead: () => {
    const { notifications } = get();
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    set({
      notifications: updated,
      unreadCount: 0,
    });
  },

  // Fetch initial completed reports for doctor from server
  fetchInitialNotifications: async () => {
    try {
      const res = await axiosClient.get('/diagnostics/orders');
      const orders = res.data || [];
      const completedOrders = orders.filter((o) => o.status === 'REPORT_UPLOADED' || o.status === 'COMPLETED');

      const existingNotifs = get().notifications;

      const fetchedNotifs = completedOrders.map((ord) => {
        const notifId = `ord_${ord._id}_${ord.status}`;
        const existing = existingNotifs.find((n) => n.id === notifId || n.orderId === ord._id);
        const isRead = existing ? existing.isRead : false;

        return {
          id: notifId,
          orderId: ord._id,
          patientId: ord.patientId?._id || ord.patientId,
          patientName: ord.patientName || (ord.patientId ? `${ord.patientId.firstName || ''} ${ord.patientId.lastName || ''}`.trim() : 'Patient'),
          uhid: ord.uhid || ord.patientId?.uhid || 'N/A',
          testName: ord.testName || 'Diagnostic Scan',
          status: ord.status,
          title: `Report Ready: ${ord.testName}`,
          message: ord.reportSummary || `Diagnostic scan findings uploaded by ${ord.technicianName || 'Specialist'}.`,
          reportSummary: ord.reportSummary || '',
          timestamp: ord.updatedAt ? new Date(ord.updatedAt) : new Date(),
          isRead,
          category: ord.testCategory || 'INVESTIGATION',
        };
      });

      const unread = fetchedNotifs.filter((n) => !n.isRead).length;
      set({
        notifications: fetchedNotifs,
        unreadCount: unread,
      });
    } catch (err) {
      console.error('Failed to load initial notifications:', err);
    }
  },
}));
