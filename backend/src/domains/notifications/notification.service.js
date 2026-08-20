import mongoose from 'mongoose';
import { Notification } from '../../models/Notification.js';
import { User } from '../../models/User.js';
import { socketManager } from '../../events/socketManager.js';

const recipientQuery = async (context = {}) => {
  const userId = context?.userId || context?.id;
  const role = context?.role;
  const hospitalId = context?.hospitalId;
  const branchId = context?.branchId;

  let user = null;
  if (userId) {
    user = await User.findById(userId).select('hospitalId branchId role additionalRoles').lean().catch(() => null);
  }
  const activeRole = role || user?.role;
  const userRoles = Array.from(new Set([
    activeRole,
    ...(Array.isArray(user?.additionalRoles) ? user.additionalRoles : []),
    ...(user?.role ? [user.role] : []),
  ].filter(Boolean)));
  const tenantId = hospitalId || user?.hospitalId;
  const tenantBranchId = branchId || user?.branchId;

  if (activeRole === 'SUPER_ADMIN') {
    return {
      $and: [
        {
          $or: [
            ...(userId ? [
              { recipientUserId: userId },
              ...(mongoose.Types.ObjectId.isValid(String(userId)) ? [{ recipientUserId: new mongoose.Types.ObjectId(String(userId)) }] : []),
            ] : []),
            { recipientRole: 'SUPER_ADMIN' },
            { targetModule: { $in: ['super-admin', 'SUPER_ADMIN', 'saas', 'SAAS', 'admin'] } },
            {
              type: {
                $in: [
                  'TRIAL_EXPIRED',
                  'TRIAL_EXPIRING',
                  'PLAN_EXPIRATION',
                  'PLATFORM_REVENUE',
                  'SECURITY_LOGIN',
                  'NEW_HOSPITAL_SIGNUP',
                  'SAAS_ALERT',
                  'SUBSCRIPTION_EXPIRED',
                  'SUBSCRIPTION_WARNING',
                  'PAYMENT_RECEIVED',
                ],
              },
            },
          ],
        },
        // Super Admin NEVER sees hospital tenant patient/token/clinical/pharmacy/billing notifications
        {
          notificationType: {
            $nin: ['WORKFLOW', 'WORKFLOW_ALERT', 'NEW_DATA', 'DEPT_RESPONSE'],
          },
        },
        {
          recipientRole: { $ne: 'ALL' },
        },
      ],
    };
  }

  const orConditions = [
    { recipientRole: { $in: [...userRoles, 'ALL'] } },
  ];
  if (userId) {
    orConditions.push({ recipientUserId: userId });
    if (mongoose.Types.ObjectId.isValid(String(userId))) {
      orConditions.push({ recipientUserId: new mongoose.Types.ObjectId(String(userId)) });
    }
  }

  return {
    $or: orConditions,
    ...(tenantId ? {
      $or: [
        { hospitalId: tenantId },
        ...(mongoose.Types.ObjectId.isValid(String(tenantId)) ? [{ hospitalId: new mongoose.Types.ObjectId(String(tenantId)) }] : []),
        { hospitalId: null },
      ],
    } : {}),
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
        recipientRole: data.recipientRole || null,
        recipientDepartment: data.recipientDepartment || '',
        notificationType: data.notificationType || data.type || 'SYSTEM_ALERT',
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
        const notif = await Notification.create({ ...base, recipientUserId: data.recipientUserId });
        socketManager.emitToUser(String(data.recipientUserId), 'notification:created', notif);
        return notif;
      }

      // Role/department alerts are materialized per current recipient so read and
      // clear state belongs to one user and can never hide another user's bell.
      const userQuery = { status: { $ne: 'INACTIVE' }, isActive: { $ne: false } };
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
          { role: 'HOSPITAL_ADMIN' },
        ] }];
      } else if (data.recipientRole === 'ALL') {
        // Exclude SUPER_ADMIN from hospital tenant broadcasts
        if (data.hospitalId) {
          userQuery.role = { $ne: 'SUPER_ADMIN' };
        }
      }

      const recipients = await User.find(userQuery).select('_id').lean();
      if (recipients.length === 0) return null;

      // Deduplicate recipient IDs to avoid duplicate insertions
      const seenIds = new Set();
      const uniqueRecipients = recipients.filter((r) => {
        const idStr = String(r._id);
        if (seenIds.has(idStr)) return false;
        seenIds.add(idStr);
        return true;
      });

      const notifications = await Notification.insertMany(
        uniqueRecipients.map((recipient) => ({ ...base, recipientUserId: recipient._id }))
      );

      uniqueRecipients.forEach((recipient) => {
        socketManager.emitToUser(String(recipient._id), 'notification:created', { ...base, recipientUserId: recipient._id });
      });

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
