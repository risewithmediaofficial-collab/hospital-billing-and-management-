import { Notification } from '../../models/Notification.js';
import { User } from '../../models/User.js';

const recipientQuery = async (context = {}) => {
  const userId = context?.userId || context?.id;
  const role = context?.role;
  const hospitalId = context?.hospitalId;
  const branchId = context?.branchId;

  const user = await User.findById(userId).select('hospitalId branchId role additionalRoles').lean();
  const activeRole = role || user?.role;
  const userRoles = [activeRole, ...(Array.isArray(user?.additionalRoles) ? user.additionalRoles : [])].filter(Boolean);
  const tenantId = hospitalId || user?.hospitalId;
  const tenantBranchId = branchId || user?.branchId;

  if (activeRole === 'SUPER_ADMIN') {
    return { $or: [{ recipientUserId: userId }, { recipientRole: 'SUPER_ADMIN' }, { recipientRole: 'ALL' }] };
  }

  return {
    $or: [
      { recipientUserId: userId },
      { recipientRole: { $in: [...userRoles, 'ALL'] } },
    ],
    ...(tenantId ? { hospitalId: tenantId } : {}),
    ...(tenantBranchId ? { $and: [{ $or: [{ branchId: tenantBranchId }, { branchId: null }] }] } : {}),
  };
};

export class NotificationService {
  /**
   * Create an in-app notification & log system event
   */
  static async createNotification(data) {
    try {
      const base = {
        hospitalId: data.hospitalId || null,
        branchId: data.branchId || null,
        recipientRole: data.recipientRole ?? (data.recipientUserId ? null : 'ALL'),
        recipientDepartment: data.recipientDepartment || '',
        notificationType: data.notificationType || data.type || 'WORKFLOW_ALERT',
        type: data.type || 'SYSTEM_ALERT',
        title: data.title,
        message: data.message,
        relatedPatientId: data.relatedPatientId || null,
        relatedTaskId: data.relatedTaskId || data.relatedRequestId || '',
        relatedRequestId: data.relatedRequestId || '',
        targetModule: data.targetModule || '',
        targetRoute: data.targetRoute || data.link || '',
        link: data.link || data.targetRoute || '',
        isRead: false,
        status: data.status || 'ACTIVE',
        metadata: data.metadata || {},
      };

      if (data.recipientUserId) {
        return Notification.create({ ...base, recipientUserId: data.recipientUserId });
      }

      // Role/department alerts are materialized per current recipient so read and
      // clear state belongs to one user and can never hide another user's bell.
      const userQuery = { status: { $ne: 'INACTIVE' }, isActive: { $ne: false } };
      if (['NEW_DATA', 'WORKFLOW'].includes(data.notificationType || data.type)) userQuery.isAvailable = { $ne: false };
      if (data.hospitalId) userQuery.hospitalId = data.hospitalId;
      if (data.branchId) userQuery.$or = [{ branchId: data.branchId }, { branchId: null }];
      if (data.recipientDepartment) {
        userQuery.$and = [{ $or: [
          { departmentId: data.recipientDepartment },
          { additionalDepartments: data.recipientDepartment },
        ] }];
      } else if (data.recipientRole && data.recipientRole !== 'ALL') {
        userQuery.$and = [{ $or: [
          { role: data.recipientRole },
          { additionalRoles: data.recipientRole },
        ] }];
      }

      const recipients = await User.find(userQuery).select('_id').lean();
      if (recipients.length === 0) return null;
      const notifications = await Notification.insertMany(
        recipients.map((recipient) => ({ ...base, recipientUserId: recipient._id }))
      );
      return notifications[0] || null;
    } catch (err) {
      console.error('Failed to create notification:', err);
      return null;
    }
  }

  /**
   * Get unread notification counts for Super Admin or Hospital Admin badges
   */
  static async getUnreadCount(context) {
    const query = await recipientQuery(context);
    return Notification.countDocuments({ ...query, isRead: false, isCleared: { $ne: true } });
  }

  /**
   * Fetch paginated notifications for current user/role
   */
  static async getNotifications({ limit = 20, ...context }) {
    const query = { ...(await recipientQuery(context)), isCleared: { $ne: true } };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const unreadCount = await Notification.countDocuments({ ...query, isRead: false });

    return { notifications, unreadCount };
  }

  /**
   * Mark a single notification as read.
   * Tries with recipientUserId first; falls back to _id-only to handle
   * ObjectId vs string mismatches or null recipientUserId edge cases.
   */
  static async markAsRead(notificationId, context) {
    const userId = context.id || context.userId;
    let notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientUserId: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) {
      notification = await Notification.findOneAndUpdate(
        { _id: notificationId },
        { isRead: true, readAt: new Date() },
        { new: true }
      );
    }
    if (!notification) {
      return { _id: notificationId, isRead: true };
    }
    return notification;
  }

  /**
   * Mark all unread notifications as read for current user context
   */
  static async markAllAsRead(context) {
    const query = { ...(await recipientQuery(context)), isRead: false, isCleared: { $ne: true } };
    await Notification.updateMany(query, { isRead: true, readAt: new Date() });
    return { success: true };
  }

  /**
   * Clear (dismiss) a single notification by ID.
   * Tries with recipientUserId match first, then falls back to _id-only
   * to handle ObjectId/string mismatches and prevent spurious 404s.
   */
  static async clear(notificationId, context) {
    const userId = context.id || context.userId;
    let notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientUserId: userId },
      { isCleared: true, clearedAt: new Date(), isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) {
      notification = await Notification.findOneAndUpdate(
        { _id: notificationId },
        { isCleared: true, clearedAt: new Date(), isRead: true, readAt: new Date() },
        { new: true }
      );
    }
    if (!notification) {
      return { _id: notificationId, isCleared: true };
    }
    return notification;
  }

  static async clearAll(context) {
    await Notification.updateMany(
      { ...(await recipientQuery(context)), isCleared: { $ne: true } },
      { isCleared: true, clearedAt: new Date(), isRead: true, readAt: new Date() }
    );
    return { success: true };
  }
}
