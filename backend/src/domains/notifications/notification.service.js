import { Notification } from '../../models/Notification.js';

export class NotificationService {
  /**
   * Create an in-app notification & log system event
   */
  static async createNotification(data) {
    try {
      const notification = await Notification.create({
        recipientUserId: data.recipientUserId || null,
        recipientRole: data.recipientRole || 'SUPER_ADMIN',
        hospitalId: data.hospitalId || null,
        title: data.title,
        message: data.message,
        type: data.type || 'SYSTEM_ALERT',
        link: data.link || '',
        metadata: data.metadata || {},
      });
      return notification;
    } catch (err) {
      console.error('Failed to create notification:', err);
      return null;
    }
  }

  /**
   * Get unread notification counts for Super Admin or Hospital Admin badges
   */
  static async getUnreadCount({ userId, role, hospitalId }) {
    const query = { isRead: false };
    if (role === 'SUPER_ADMIN') {
      query.$or = [{ recipientRole: 'SUPER_ADMIN' }, { recipientRole: 'ALL' }];
    } else if (hospitalId) {
      query.$or = [
        { recipientUserId: userId },
        { hospitalId, recipientRole: role },
        { hospitalId, recipientRole: 'ALL' },
      ];
      query.recipientRole = { $ne: 'SUPER_ADMIN' };
    } else {
      query.recipientUserId = userId;
      query.recipientRole = { $ne: 'SUPER_ADMIN' };
    }
    return await Notification.countDocuments(query);
  }

  /**
   * Fetch paginated notifications for current user/role
   */
  static async getNotifications({ userId, role, hospitalId, limit = 20 }) {
    const query = {};
    if (role === 'SUPER_ADMIN') {
      query.$or = [{ recipientRole: 'SUPER_ADMIN' }, { recipientRole: 'ALL' }];
    } else if (hospitalId) {
      query.$or = [
        { recipientUserId: userId },
        { hospitalId, recipientRole: role },
        { hospitalId, recipientRole: 'ALL' },
      ];
      query.recipientRole = { $ne: 'SUPER_ADMIN' };
    } else {
      query.recipientUserId = userId;
      query.recipientRole = { $ne: 'SUPER_ADMIN' };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const unreadCount = await Notification.countDocuments({ ...query, isRead: false });

    return { notifications, unreadCount };
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(notificationId) {
    return await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
  }

  /**
   * Mark all unread notifications as read for current user context
   */
  static async markAllAsRead({ userId, role, hospitalId }) {
    const query = { isRead: false };
    if (role === 'SUPER_ADMIN') {
      query.$or = [{ recipientRole: 'SUPER_ADMIN' }, { recipientRole: 'ALL' }];
    } else if (hospitalId) {
      query.$or = [
        { recipientUserId: userId },
        { hospitalId, recipientRole: role },
        { hospitalId, recipientRole: 'ALL' },
      ];
      query.recipientRole = { $ne: 'SUPER_ADMIN' };
    } else {
      query.recipientUserId = userId;
      query.recipientRole = { $ne: 'SUPER_ADMIN' };
    }

    await Notification.updateMany(query, { isRead: true, readAt: new Date() });
    return { success: true };
  }
}

