import mongoose from 'mongoose';
import { Notification } from '../../models/Notification.js';
import { User } from '../../models/User.js';
import { socketManager } from '../../events/socketManager.js';

const normalizeNotificationRoute = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return { path: '', tab: '' };
  const relative = raw.replace(/^https?:\/\/[^/]+/i, '');
  const withoutTenant = relative.replace(/^\/[^/]+(?=\/(?:doctor|reception|nursing|nurse-incharge|admin|billing|pharmacy|laboratory|radiology|emergency|workflow))/, '');
  const [pathPart, query = ''] = withoutTenant.split('?');
  const path = (pathPart.replace(/\/+$/, '') || '/').toLowerCase();
  const tab = String(new URLSearchParams(query).get('tab') || '').toUpperCase();
  return { path, tab };
};

export const notificationBelongsToRoute = (notificationRoute, currentRoute) => {
  const notification = normalizeNotificationRoute(notificationRoute);
  const current = normalizeNotificationRoute(currentRoute);
  if (!notification.path || notification.path !== current.path) return false;
  // Opening a specific tab only reads notifications for that tab. Opening a
  // base dashboard reads only base-dashboard notifications.
  return notification.tab === current.tab;
};

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
    const validSuperAdminTypes = [
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
      'HOSPITAL_REGISTRATION',
      'HOSPITAL_APPROVED',
      'HOSPITAL_SUSPENDED',
      'HOSPITAL_CREATED',
      'SYSTEM_ALERT',
    ];

    const clinicalExclusions = [
      'WORKFLOW',
      'WORKFLOW_ALERT',
      'NEW_DATA',
      'DEPT_RESPONSE',
      'DEPARTMENT_RESPONSE',
      'NURSE_RESPONSE',
      'BILLING_UPDATE',
      'PRESCRIPTION_ISSUED',
      'PATIENT_QUEUED',
      'DIAGNOSTIC_ORDER',
      'NURSE_TASK_CREATED',
      'NURSE_TASK_COMPLETED',
      'REPORT_READY',
      'CONSULTATION_COMPLETE',
    ];

    return {
      $and: [
        {
          $or: [
            { recipientRole: 'SUPER_ADMIN' },
            { targetModule: { $in: ['super-admin', 'SUPER_ADMIN', 'saas', 'SAAS'] } },
            { type: { $in: validSuperAdminTypes } },
            { notificationType: { $in: ['PLATFORM_REVENUE', 'SECURITY_LOGIN', 'NEW_HOSPITAL_SIGNUP', 'SAAS_ALERT', 'SUBSCRIPTION_EXPIRED', 'PAYMENT_RECEIVED', 'HOSPITAL_REGISTRATION'] } },
          ],
        },
        {
          notificationType: { $nin: clinicalExclusions },
        },
        {
          type: { $nin: ['NURSE_TASKS', 'LAB_ORDER_CREATED', 'PATIENT_QUEUED', 'DOCTOR_PATIENT', 'NURSE_RESPONSE', 'DEPARTMENT_RESPONSE', 'BILLING_WORK', 'LAB_WORK', 'RADIOLOGY_WORK'] },
        },
        {
          targetModule: { $nin: ['doctor', 'nursing', 'pharmacy', 'laboratory', 'radiology', 'billing', 'reception', 'ipd', 'opd'] },
        },
        {
          recipientRole: { $nin: ['ALL', 'DOCTOR', 'NURSE', 'NURSE_INCHARGE', 'RECEPTIONIST', 'CASHIER', 'LAB_TECH', 'RADIOLOGIST', 'PHARMACIST', 'PATIENT', 'GUARDIAN', 'HOSPITAL_ADMIN'] },
        },
      ],
    };
  }

  const orConditions = [];
  if (userId) {
    orConditions.push({ recipientUserId: userId });
    if (mongoose.Types.ObjectId.isValid(String(userId))) {
      orConditions.push({ recipientUserId: new mongoose.Types.ObjectId(String(userId)) });
    }
  }
  // Compatibility only for legacy non-materialized notifications. New role
  // notifications are owned by a concrete recipientUserId.
  orConditions.push({
    recipientUserId: null,
    recipientRole: { $in: [...userRoles, 'ALL'] },
  });

  const clauses = [];
  if (orConditions.length > 0) {
    clauses.push({ $or: orConditions });
  }

  // 1. Doctor role notification isolation: doctors should only receive clinical responses, reports, and returned queries
  if (activeRole === 'DOCTOR' || userRoles.includes('DOCTOR')) {
    const doctorExclusions = [
      'New Bill Pending',
      'Pharmacy Dispensed & Billed',
      'Pharmacy Clearance (External Purchase)',
      'Pharmacy Clearance',
      'Medicines Dispensed',
      'Invoice Generated',
      'Bill Generation Requested',
      'Payment Collected',
      'Payment Received',
      'Bill Ready (Post-Injection)',
      'Bill Ready',
      'Billing Query & Return',
    ];
    clauses.push({
      $and: [
        { title: { $nin: doctorExclusions } },
        { title: { $not: /(New Bill|Medicines Dispensed|Pharmacy Dispensed|Pharmacy Clearance|Invoice Generated|Payment Collected|Payment Received|Bill Ready|Bill Generation)/i } },
        { recipientRole: { $nin: ['CASHIER', 'BILLING_STAFF', 'PHARMACIST', 'PHARMACY_STAFF', 'RECEPTIONIST'] } },
        {
          $or: [
            {
              $and: [
                { targetModule: { $nin: ['billing', 'cashier'] } },
                { targetRoute: { $not: /\/(billing|cashier)/i } },
                { link: { $not: /\/(billing|cashier)/i } },
              ],
            },
            { notificationType: 'BILLING_QUERY' },
            { type: 'BILLING_QUERY' },
            { title: { $regex: /Billing (Query|Review)/i } },
          ],
        },
        {
          $or: [
            {
              $and: [
                { targetModule: { $nin: ['pharmacy', 'stock', 'inventory'] } },
                { targetRoute: { $not: /\/(pharmacy|stock|inventory)/i } },
                { link: { $not: /\/(pharmacy|stock|inventory)/i } },
              ],
            },
            { notificationType: 'SUBSTITUTION_REQUEST' },
            { type: 'SUBSTITUTION_REQUEST' },
            { title: { $regex: /Substitution/i } },
          ],
        },
      ],
    });
  }

  // 2. Pharmacist role notification isolation
  if ((activeRole === 'PHARMACIST' || activeRole === 'PHARMACY_STAFF') && !userRoles.includes('DOCTOR') && !userRoles.includes('CASHIER')) {
    clauses.push({
      $and: [
        { recipientRole: { $nin: ['DOCTOR', 'CASHIER', 'BILLING_STAFF', 'LAB_TECH', 'RADIOLOGIST', 'NURSE', 'NURSE_INCHARGE'] } },
        { targetRoute: { $not: /\/(laboratory|radiology|doctor|nursing|nurse-incharge)/i } },
        { link: { $not: /\/(laboratory|radiology|doctor|nursing|nurse-incharge)/i } },
        { targetModule: { $nin: ['laboratory', 'radiology', 'doctor', 'nursing'] } },
        { title: { $not: /(New Lab Request|Radiology Request|Scan Ready|Doctor Reviewed|Injection|Nurse Task|Treatment Request)/i } },
      ],
    });
  }

  // 3. Cashier / Billing role notification isolation
  if ((activeRole === 'CASHIER' || activeRole === 'BILLING_STAFF') && !userRoles.includes('DOCTOR')) {
    clauses.push({
      $and: [
        { recipientRole: { $nin: ['DOCTOR', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGIST', 'NURSE', 'NURSE_INCHARGE'] } },
        { targetRoute: { $not: /\/(laboratory|radiology|doctor|nursing|nurse-incharge|pharmacy\/dashboard)/i } },
        { link: { $not: /\/(laboratory|radiology|doctor|nursing|nurse-incharge|pharmacy\/dashboard)/i } },
        { targetModule: { $nin: ['laboratory', 'radiology', 'doctor', 'nursing'] } },
        { title: { $not: /(New Lab Request|Radiology Request|Scan Ready|Doctor Reviewed|Treatment Request|New Treatment)/i } },
      ],
    });
  }

  // 4. Lab Tech role notification isolation
  if (activeRole === 'LAB_TECH' || activeRole === 'LABORATORY_STAFF') {
    clauses.push({
      $and: [
        { recipientRole: { $nin: ['DOCTOR', 'CASHIER', 'BILLING_STAFF', 'PHARMACIST', 'RADIOLOGIST', 'NURSE', 'RECEPTIONIST'] } },
        { targetRoute: { $not: /\/(radiology|pharmacy|billing|cashier|nursing|reception)/i } },
        { link: { $not: /\/(radiology|pharmacy|billing|cashier|nursing|reception)/i } },
        { targetModule: { $nin: ['radiology', 'pharmacy', 'billing', 'cashier', 'nursing', 'reception'] } },
        { title: { $not: /(Radiology|Scan|Prescription|Medicine Dispensed|Pharmacy Dispensed|Invoice|Payment|Bill|Injection)/i } },
      ],
    });
  }

  // 5. Radiologist role notification isolation
  if (activeRole === 'RADIOLOGIST' || activeRole === 'RADIOLOGY_STAFF') {
    clauses.push({
      $and: [
        { recipientRole: { $nin: ['DOCTOR', 'CASHIER', 'BILLING_STAFF', 'PHARMACIST', 'LAB_TECH', 'NURSE', 'RECEPTIONIST'] } },
        { targetRoute: { $not: /\/(laboratory|pharmacy|billing|cashier|nursing|reception)/i } },
        { link: { $not: /\/(laboratory|pharmacy|billing|cashier|nursing|reception)/i } },
        { targetModule: { $nin: ['laboratory', 'pharmacy', 'billing', 'cashier', 'nursing', 'reception'] } },
        { title: { $not: /(Lab Request|Blood|Urine|Prescription|Medicine Dispensed|Pharmacy Dispensed|Invoice|Payment|Bill|Injection)/i } },
      ],
    });
  }

  // 6. Nurse role notification isolation
  if ((activeRole === 'NURSE' || activeRole === 'NURSE_INCHARGE') && !userRoles.includes('DOCTOR')) {
    clauses.push({
      $and: [
        { recipientRole: { $nin: ['DOCTOR', 'CASHIER', 'BILLING_STAFF', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGIST'] } },
        { targetRoute: { $not: /\/(pharmacy|billing|cashier)/i } },
        { link: { $not: /\/(pharmacy|billing|cashier)/i } },
        { targetModule: { $nin: ['pharmacy', 'billing', 'cashier'] } },
        { title: { $not: /(Pharmacy Dispensed|Medicines Dispensed|Invoice Generated|Payment Collected|Bill Ready)/i } },
      ],
    });
  }

  // 7. Receptionist role notification isolation
  if ((activeRole === 'RECEPTIONIST' || activeRole === 'OPD_STAFF') && !userRoles.includes('DOCTOR') && !userRoles.includes('HOSPITAL_ADMIN')) {
    clauses.push({
      $and: [
        { recipientRole: { $nin: ['DOCTOR', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGIST'] } },
        { targetRoute: { $not: /\/(laboratory|radiology|pharmacy|nurse-incharge)/i } },
        { link: { $not: /\/(laboratory|radiology|pharmacy|nurse-incharge)/i } },
        { targetModule: { $nin: ['laboratory', 'radiology', 'pharmacy'] } },
        { title: { $not: /(New Lab Request|Radiology Request|Scan Ready|Medicines Dispensed|Pharmacy Dispensed|Injection Administered)/i } },
      ],
    });
  }

  if (tenantId) {
    const hIdStr = typeof tenantId === 'object' ? String(tenantId._id || tenantId) : String(tenantId);
    if (mongoose.Types.ObjectId.isValid(hIdStr)) {
      clauses.push({ hospitalId: new mongoose.Types.ObjectId(hIdStr) });
    } else {
      clauses.push({ hospitalId: tenantId });
    }
  }

  if (tenantBranchId) {
    const bIdStr = typeof tenantBranchId === 'object' ? String(tenantBranchId._id || tenantBranchId) : String(tenantBranchId);
    if (mongoose.Types.ObjectId.isValid(bIdStr)) {
      clauses.push({ $or: [{ branchId: new mongoose.Types.ObjectId(bIdStr) }, { branchId: null }] });
    } else {
      clauses.push({ $or: [{ branchId: tenantBranchId }, { branchId: null }] });
    }
  }

  return clauses.length > 1 ? { $and: clauses } : (clauses[0] || {});
};

export class NotificationService {
  /**
   * Create an in-app notification & log system event
   */
  static async createNotification(data) {
    const recipientRoles = Array.from(new Set([
      ...(Array.isArray(data.recipientRoles) ? data.recipientRoles : []),
      ...(data.recipientRole ? [data.recipientRole] : []),
    ].filter(Boolean).map((role) => String(role).toUpperCase())));
    if (!data.hospitalId && !recipientRoles.includes('SUPER_ADMIN') && data.targetModule !== 'saas') {
        throw new Error('Hospital context is required for tenant notifications');
    }
    const base = {
        hospitalId: data.hospitalId || null,
        branchId: data.branchId || null,
        recipientRole: recipientRoles.length === 1 ? recipientRoles[0] : null,
        recipientDepartment: data.recipientDepartment || '',
        notificationType: data.notificationType || data.type || 'SYSTEM_ALERT',
        type: data.type || 'SYSTEM_ALERT',
        title: data.title,
        message: data.message,
        relatedPatientId: data.relatedPatientId || null,
        relatedTaskId: data.relatedTaskId || data.relatedRequestId || '',
        relatedRequestId: data.relatedRequestId || '',
        sourceModule: data.sourceModule || data.metadata?.sourceModule || '',
        entityType: data.entityType || data.metadata?.entityType || '',
        entityId: String(data.entityId || data.relatedTaskId || data.relatedRequestId || data.metadata?.entityId || ''),
        actionType: data.actionType || data.metadata?.actionType || '',
        targetModule: data.targetModule || '',
        targetRoute: data.targetRoute || data.linkedPath || data.link || '',
        link: data.link || data.linkedPath || data.targetRoute || '',
        isRead: false,
        status: data.status || 'ACTIVE',
        metadata: data.metadata || {},
      };

      if (data.recipientUserId) {
        const recipient = await User.findOne({
          _id: data.recipientUserId,
          ...(data.hospitalId ? { hospitalId: data.hospitalId } : {}),
          isActive: { $ne: false },
          status: { $ne: 'INACTIVE' },
        }).select('_id').lean();
        if (!recipient) throw new Error('Notification recipient is not active in the target hospital');
        const notif = await Notification.create({ ...base, recipientUserId: data.recipientUserId });
        socketManager.emitToUser(String(data.recipientUserId), 'notification:created', notif);
        return notif;
      }

      // Role/department alerts are materialized per current recipient so read and
      // clear state belongs to one user and can never hide another user's bell.
      const userQuery = { status: { $ne: 'INACTIVE' }, isActive: { $ne: false } };
      const isPlatformRecipient = recipientRoles.includes('SUPER_ADMIN');
      if (data.hospitalId && !isPlatformRecipient) userQuery.hospitalId = data.hospitalId;
      if (data.branchId && !isPlatformRecipient) userQuery.$or = [{ branchId: data.branchId }, { branchId: null }];
      if (data.recipientDepartment) {
        userQuery.$and = [{ $or: [
          { departmentId: data.recipientDepartment },
          { additionalDepartments: data.recipientDepartment },
        ] }];
      } else if (recipientRoles.length > 0 && !recipientRoles.includes('ALL')) {
        userQuery.$and = [{ $or: [
          { role: { $in: recipientRoles } },
          { additionalRoles: { $in: recipientRoles } },
        ] }];
      } else if (recipientRoles.includes('ALL')) {
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
   * Ownership is mandatory. A user must never mutate another user's alert.
   */
  static async markAsRead(notificationId, context) {
    const ownership = await recipientQuery(context);
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, ...ownership },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    return notification;
  }

  /**
   * Mark all unread notifications matching a route path as read
   */
  static async markRouteAsRead(routePath, context) {
    if (!routePath) return { success: false };
    const query = await recipientQuery(context);
    const unread = await Notification.find({ ...query, isRead: false })
      .select('_id targetRoute link')
      .lean();
    const ids = unread
      .filter((item) => notificationBelongsToRoute(item.targetRoute || item.link, routePath))
      .map((item) => item._id);
    if (ids.length) {
      await Notification.updateMany({ _id: { $in: ids }, ...query }, { isRead: true, readAt: new Date() });
    }
    return { success: true, modifiedCount: ids.length };
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
   * Ownership is mandatory. A user must never dismiss another user's alert.
   */
  static async clear(notificationId, context) {
    const ownership = await recipientQuery(context);
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, ...ownership },
      { isCleared: true, clearedAt: new Date(), isRead: true, readAt: new Date() },
      { new: true }
    );
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
