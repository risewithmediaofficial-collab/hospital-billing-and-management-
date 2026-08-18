/**
 * WorkflowEventService — Central inter-department event bus.
 *
 * Maps every workflow lifecycle event to the target roles that should be notified.
 * All inter-department socket emissions pass through here so that adding a new
 * department only requires adding entries to WORKFLOW_EVENTS and TARGET_ROLES.
 *
 * ─── PERSISTENCE ────────────────────────────────────────────────────────────
 * Every emitted event also writes a persistent Notification record to the DB.
 * This ensures staff see missed alerts after a page refresh or reconnect.
 */
import { socketManager } from './socketManager.js';
import { Branch } from '../models/Branch.js';
import { User } from '../models/User.js';

// ─── Canonical workflow event names ──────────────────────────────────────────
export const WORKFLOW_EVENTS = {
  // Reception → Doctor
  PATIENT_QUEUED:          'PATIENT_QUEUED',
  TOKEN_REQUEUED:          'TOKEN_REQUEUED',

  // Doctor ↔ Reception
  DOCTOR_ACCEPTED_PATIENT: 'DOCTOR_ACCEPTED_PATIENT',
  CONSULTATION_COMPLETE:   'CONSULTATION_COMPLETE',

  // Doctor → Lab / Radiology
  LAB_ORDER_CREATED:       'LAB_ORDER_CREATED',
  RADIOLOGY_ORDER_CREATED: 'RADIOLOGY_ORDER_CREATED',

  // Lab → Doctor
  LAB_ACCEPTED:            'LAB_ACCEPTED',      // Processing only — no unlock
  LAB_SUBMITTED:           'LAB_SUBMITTED',     // Report ready  — unlocks doctor review

  // Radiology → Doctor
  RADIOLOGY_ACCEPTED:      'RADIOLOGY_ACCEPTED',
  RADIOLOGY_SUBMITTED:     'RADIOLOGY_SUBMITTED',

  // Doctor → Lab / Radiology (review feedback)
  DOCTOR_REVIEWED_LAB:     'DOCTOR_REVIEWED_LAB',
  DOCTOR_REVIEWED_RADIOLOGY: 'DOCTOR_REVIEWED_RADIOLOGY',

  // Doctor → Pharmacy
  PRESCRIPTION_ISSUED:     'PRESCRIPTION_ISSUED',

  // Pharmacy → Doctor
  PHARMACY_ACCEPTED:       'PHARMACY_ACCEPTED',
  PHARMACY_DISPENSED:      'PHARMACY_DISPENSED',

  // Doctor / Nurse → Billing
  BILL_REQUESTED:          'BILL_REQUESTED',
  BILL_READY:              'BILL_READY',
  PAYMENT_COLLECTED:       'PAYMENT_COLLECTED',

  // Nurse ↔ Doctor
  NURSE_REQUEST_RAISED:    'NURSE_REQUEST_RAISED',
  NURSE_REQUEST_COMPLETED: 'NURSE_REQUEST_COMPLETED',

  // Emergency (broadcast)
  EMERGENCY_RAISED:        'EMERGENCY_RAISED',
  EMERGENCY_RESOLVED:      'EMERGENCY_RESOLVED',

  // Doctor → IPD / Ward Admission
  IPD_ADMISSION_RECOMMENDED: 'IPD_ADMISSION_RECOMMENDED',

  // Staff Availability
  STAFF_WENT_OFFLINE:      'STAFF_WENT_OFFLINE',
  STAFF_CAME_ONLINE:       'STAFF_CAME_ONLINE',
};

// ─── Which roles get notified for each event ─────────────────────────────────
const TARGET_ROLES = {
  [WORKFLOW_EVENTS.IPD_ADMISSION_RECOMMENDED]: ['RECEPTIONIST', 'NURSE_INCHARGE', 'NURSE', 'HOSPITAL_ADMIN'],
  [WORKFLOW_EVENTS.PATIENT_QUEUED]:           ['DOCTOR'],
  [WORKFLOW_EVENTS.TOKEN_REQUEUED]:           ['DOCTOR'],
  [WORKFLOW_EVENTS.DOCTOR_ACCEPTED_PATIENT]:  ['RECEPTIONIST'],
  [WORKFLOW_EVENTS.CONSULTATION_COMPLETE]:    ['CASHIER', 'BILLING_STAFF'],
  [WORKFLOW_EVENTS.LAB_ORDER_CREATED]:        ['LAB_TECH', 'LABORATORY_STAFF'],
  [WORKFLOW_EVENTS.RADIOLOGY_ORDER_CREATED]:  ['RADIOLOGIST', 'RADIOLOGY_STAFF'],
  [WORKFLOW_EVENTS.LAB_ACCEPTED]:             ['DOCTOR'],
  [WORKFLOW_EVENTS.LAB_SUBMITTED]:            ['DOCTOR'],
  [WORKFLOW_EVENTS.RADIOLOGY_ACCEPTED]:       ['DOCTOR'],
  [WORKFLOW_EVENTS.RADIOLOGY_SUBMITTED]:      ['DOCTOR'],
  [WORKFLOW_EVENTS.DOCTOR_REVIEWED_LAB]:      ['LAB_TECH', 'LABORATORY_STAFF'],
  [WORKFLOW_EVENTS.DOCTOR_REVIEWED_RADIOLOGY]:['RADIOLOGIST', 'RADIOLOGY_STAFF'],
  [WORKFLOW_EVENTS.PRESCRIPTION_ISSUED]:      ['PHARMACIST', 'PHARMACY_STAFF'],
  [WORKFLOW_EVENTS.PHARMACY_ACCEPTED]:        ['DOCTOR'],
  [WORKFLOW_EVENTS.PHARMACY_DISPENSED]:       ['DOCTOR', 'NURSE'],
  [WORKFLOW_EVENTS.BILL_REQUESTED]:           ['CASHIER', 'BILLING_STAFF'],
  [WORKFLOW_EVENTS.BILL_READY]:               ['DOCTOR', 'RECEPTIONIST'],
  [WORKFLOW_EVENTS.PAYMENT_COLLECTED]:        ['DOCTOR', 'RECEPTIONIST'],
  [WORKFLOW_EVENTS.NURSE_REQUEST_RAISED]:     ['NURSE', 'NURSE_INCHARGE'],
  [WORKFLOW_EVENTS.NURSE_REQUEST_COMPLETED]:  ['DOCTOR'],
  // Emergency is broadcast to ALL — handled separately
  [WORKFLOW_EVENTS.EMERGENCY_RAISED]:         ['ALL'],
  [WORKFLOW_EVENTS.EMERGENCY_RESOLVED]:       ['ALL'],
  [WORKFLOW_EVENTS.STAFF_WENT_OFFLINE]:       ['HOSPITAL_ADMIN', 'RECEPTIONIST'],
  [WORKFLOW_EVENTS.STAFF_CAME_ONLINE]:        ['HOSPITAL_ADMIN'],
};

// ─── Clean formatting helper to avoid "undefined" strings in notification UI ──
const safeDoc = (name) => (name && name !== 'undefined' ? (name.startsWith('Dr.') ? name : `Dr. ${name}`) : 'Doctor');
const safePat = (name, uhid) => `${name && name !== 'undefined' ? name : 'Patient'}${uhid && uhid !== 'undefined' && uhid !== 'N/A' ? ` (${uhid})` : ''}`;

// ─── Human-readable notification messages for each event ─────────────────────
const MESSAGE_TEMPLATES = {
  [WORKFLOW_EVENTS.PATIENT_QUEUED]:
    (p) => ({ title: 'New Patient in Queue', message: `${safePat(p.patientName, p.uhid)} has been assigned Token #${p.tokenNumber || '1'} and is waiting for consultation.`, type: 'WORKFLOW' }),

  [WORKFLOW_EVENTS.TOKEN_REQUEUED]:
    (p) => ({ title: 'Patient Re-queued', message: `${safePat(p.patientName, p.uhid)} token has been re-queued. Please attend.`, type: 'WORKFLOW' }),

  [WORKFLOW_EVENTS.DOCTOR_ACCEPTED_PATIENT]:
    (p) => ({ title: 'Doctor Accepted Patient', message: `${safeDoc(p.doctorName)} has accepted ${safePat(p.patientName, p.uhid)} for consultation.`, type: 'WORKFLOW' }),

  [WORKFLOW_EVENTS.CONSULTATION_COMPLETE]:
    (p) => ({ title: '✅ Consultation Completed — Bill Ready', message: `${safeDoc(p.doctorName)} completed the consultation for ${safePat(p.patientName, p.uhid)}. Generate the invoice now.`, type: 'WORKFLOW' }),

  [WORKFLOW_EVENTS.LAB_ORDER_CREATED]:
    (p) => ({ title: '🔬 New Lab Request', message: `${safeDoc(p.doctorName)} has requested ${p.testName || 'Diagnostic Investigation'} for ${safePat(p.patientName, p.uhid)}. Please process and upload results.`, type: 'NEW_DATA' }),

  [WORKFLOW_EVENTS.RADIOLOGY_ORDER_CREATED]:
    (p) => ({ title: '🩻 New Radiology Request', message: `${safeDoc(p.doctorName)} has requested ${p.testName || 'Radiology Scan'} for ${safePat(p.patientName, p.uhid)}. Please process and upload scan.`, type: 'NEW_DATA' }),

  [WORKFLOW_EVENTS.LAB_ACCEPTED]:
    (p) => ({ title: '🔬 Lab Accepted Your Request', message: `Laboratory has accepted the ${p.testName || 'test'} request for ${safePat(p.patientName, p.uhid)}. Sample is being processed.`, type: 'DEPT_RESPONSE' }),

  [WORKFLOW_EVENTS.LAB_SUBMITTED]:
    (p) => ({ title: '🔬 Lab Report Ready — Review Required', message: `Lab results for ${p.testName || 'Investigation'} (${safePat(p.patientName, p.uhid)}) are ready. Please review and accept to proceed.`, type: 'DEPT_RESPONSE' }),

  [WORKFLOW_EVENTS.RADIOLOGY_ACCEPTED]:
    (p) => ({ title: '🩻 Radiology Accepted Your Request', message: `Radiology dept accepted the ${p.testName || 'scan'} request for ${safePat(p.patientName, p.uhid)}. Scan in progress.`, type: 'DEPT_RESPONSE' }),

  [WORKFLOW_EVENTS.RADIOLOGY_SUBMITTED]:
    (p) => ({ title: '🩻 Radiology Scan Ready — Review Required', message: `${p.testName || 'Radiology'} scan for ${safePat(p.patientName, p.uhid)} is ready. Please review and accept to continue treatment.`, type: 'DEPT_RESPONSE' }),

  [WORKFLOW_EVENTS.DOCTOR_REVIEWED_LAB]:
    (p) => ({ title: 'Doctor Reviewed Lab Report', message: `${safeDoc(p.doctorName)} has reviewed and accepted the ${p.testName || 'test'} report for ${safePat(p.patientName, p.uhid)}.`, type: 'DEPT_RESPONSE' }),

  [WORKFLOW_EVENTS.DOCTOR_REVIEWED_RADIOLOGY]:
    (p) => ({ title: 'Doctor Reviewed Scan', message: `${safeDoc(p.doctorName)} has reviewed and accepted the ${p.testName || 'scan'} for ${safePat(p.patientName, p.uhid)}.`, type: 'DEPT_RESPONSE' }),

  [WORKFLOW_EVENTS.PRESCRIPTION_ISSUED]:
    (p) => ({ title: '💊 New Prescription Received', message: `${safeDoc(p.doctorName)} has issued a prescription for ${safePat(p.patientName, p.uhid)}. Please dispense medicines.`, type: 'NEW_DATA' }),

  [WORKFLOW_EVENTS.PHARMACY_ACCEPTED]:
    (p) => ({ title: '💊 Pharmacy Accepted Prescription', message: `Pharmacy has accepted the prescription for ${safePat(p.patientName, p.uhid)} and is preparing medicines.`, type: 'DEPT_RESPONSE' }),

  [WORKFLOW_EVENTS.PHARMACY_DISPENSED]:
    (p) => ({ title: '💊 Medicines Dispensed', message: `Pharmacy has dispensed all medicines for ${safePat(p.patientName, p.uhid)}. Encounter can be closed.`, type: 'DEPT_RESPONSE' }),

  [WORKFLOW_EVENTS.BILL_REQUESTED]:
    (p) => ({ title: '🧾 Bill Generation Requested', message: `Bill generation requested for ${safePat(p.patientName, p.uhid)}. Please generate the invoice.`, type: 'NEW_DATA' }),

  [WORKFLOW_EVENTS.BILL_READY]:
    (p) => ({ title: '🧾 Invoice Generated', message: `Invoice #${p.invoiceNo || ''} has been created for ${safePat(p.patientName, p.uhid)}.`, type: 'DEPT_RESPONSE' }),

  [WORKFLOW_EVENTS.PAYMENT_COLLECTED]:
    (p) => ({ title: '💰 Payment Collected', message: `Payment has been collected for ${safePat(p.patientName, p.uhid)}. This encounter is now closed.`, type: 'DEPT_RESPONSE' }),

  [WORKFLOW_EVENTS.NURSE_REQUEST_RAISED]:
    (p) => ({ title: '🏥 Nurse Request', message: `Nurse raised a ${p.requestType || 'treatment'} request for patient in ${p.location || 'OPD/Ward'}. Please attend.`, type: 'NEW_DATA' }),

  [WORKFLOW_EVENTS.NURSE_REQUEST_COMPLETED]:
    (p) => ({ title: '✅ Nurse Request Completed', message: `Nurse has completed the ${p.requestType || 'treatment'} request for ${safePat(p.patientName, p.uhid)}.`, type: 'DEPT_RESPONSE' }),

  [WORKFLOW_EVENTS.EMERGENCY_RAISED]:
    (p) => ({ title: '🚨 EMERGENCY ALERT', message: `${p.emergencyType || 'Medical'} emergency raised at ${p.location || 'Facility'} by ${p.raisedBy || 'Staff'}. Patient: ${p.patientName || 'Emergency Patient'}. Report immediately!`, type: 'EMERGENCY' }),

  [WORKFLOW_EVENTS.EMERGENCY_RESOLVED]:
    (p) => ({ title: '✅ Emergency Resolved', message: `Emergency at ${p.location || 'Facility'} has been resolved by ${p.resolvedBy || 'Medical Team'}.`, type: 'SYSTEM_ALERT' }),

  [WORKFLOW_EVENTS.IPD_ADMISSION_RECOMMENDED]:
    (p) => ({ title: '🏥 IPD Admission Recommended', message: `${safeDoc(p.doctorName)} recommended IPD Inpatient Admission for ${safePat(p.patientName, p.uhid)} to ${p.wardType || 'General Ward'}. Priority: ${p.priority || 'Normal'}. Reason: ${p.reason || 'Clinical Observation'}`, type: 'WORKFLOW' }),

  [WORKFLOW_EVENTS.STAFF_WENT_OFFLINE]:
    (p) => ({ title: '⚠️ Staff Offline', message: `${p.staffName || 'Staff Member'} (${p.role || 'Staff'}) has gone offline. Patients cannot be assigned to them until they go back online.`, type: 'SYSTEM_ALERT' }),

  [WORKFLOW_EVENTS.STAFF_CAME_ONLINE]:
    (p) => ({ title: '✅ Staff Back Online', message: `${p.staffName || 'Staff Member'} (${p.role || 'Staff'}) is now online and available for assignments.`, type: 'SYSTEM_ALERT' }),
};

// ─── Notification type → DB type mapping ─────────────────────────────────────
const DB_NOTIFICATION_TYPES = {
  WORKFLOW: 'WORKFLOW',
  NEW_DATA: 'NEW_DATA',
  DEPT_RESPONSE: 'DEPT_RESPONSE',
  EMERGENCY: 'EMERGENCY',
  SYSTEM_ALERT: 'SYSTEM_ALERT',
};

// ─── WorkflowEventService ─────────────────────────────────────────────────────
export class WorkflowEventService {
  /**
   * Emit a workflow event to all target role rooms AND persist to DB.
   * @param {string} event  - One of WORKFLOW_EVENTS constants
   * @param {object} payload - Data specific to this event
   * @param {string} branchId - Optional: scope to a specific branch room
   */
  static async emit(event, payload, branchId = null) {
    const roles = TARGET_ROLES[event] || [];
    const templateFn = MESSAGE_TEMPLATES[event];
    const notifData = templateFn ? templateFn(payload) : { title: event, message: '', type: 'SYSTEM_ALERT' };
    const { title, message, type } = notifData;
    const unavailableRoles = [];
    const effectiveBranchId = branchId || payload.branchId || null;
    let effectiveHospitalId = payload.hospitalId || null;
    if (!effectiveHospitalId && effectiveBranchId) {
      const branch = await Branch.findById(effectiveBranchId).select('hospitalId').lean();
      effectiveHospitalId = branch?.hospitalId || null;
    }

    const envelope = {
      event,
      title,
      message,
      type,
      payload,
      timestamp: new Date().toISOString(),
      isRead: false,
      linkedPath: payload.linkedPath || null,
    };

    // ── Socket.IO Emission ────────────────────────────────────────────────────
    if (roles.includes('ALL')) {
      socketManager.emitEmergency(event, envelope);
      if (branchId) socketManager.emitToBranch(branchId, 'workflow:pending_changed', { event });
    } else {
      for (const role of roles) {
        const targetedEnvelope = { ...envelope, targetRole: role };
        const targetUserId = role === 'DOCTOR' ? payload.doctorId : null;
        if (targetUserId) {
          const target = await User.findOne({ _id: targetUserId, isAvailable: { $ne: false }, isActive: { $ne: false } }).select('_id').lean();
          if (target) {
            socketManager.emitToUser(targetUserId, `workflow:${event.toLowerCase()}`, targetedEnvelope);
            socketManager.emitToUser(targetUserId, 'workflow:notification', targetedEnvelope);
          } else {
            unavailableRoles.push(role);
            if (payload.senderUserId) socketManager.emitToUser(String(payload.senderUserId), 'workflow:queue_warning', {
              event, targetRole: role, title: 'Work queued — assigned staff unavailable',
              message: 'The assigned staff member is unavailable. The work remains queued until they return.',
            });
          }
        } else {
          const availableUsers = await User.find({
            ...(effectiveHospitalId ? { hospitalId: effectiveHospitalId } : {}),
            ...(effectiveBranchId ? { $or: [{ branchId: effectiveBranchId }, { branchId: null }] } : {}),
            $and: [{ $or: [{ role }, { additionalRoles: role }] }],
            isAvailable: { $ne: false },
            isActive: { $ne: false },
            status: { $ne: 'INACTIVE' },
          }).select('_id').lean();
          for (const availableUser of availableUsers) {
            socketManager.emitToUser(String(availableUser._id), `workflow:${event.toLowerCase()}`, targetedEnvelope);
            socketManager.emitToUser(String(availableUser._id), 'workflow:notification', targetedEnvelope);
          }
          if (availableUsers.length === 0 && payload.senderUserId) {
            unavailableRoles.push(role);
            socketManager.emitToUser(String(payload.senderUserId), 'workflow:queue_warning', {
              event, targetRole: role, title: 'Work queued — no staff available',
              message: `No available ${role.replaceAll('_', ' ').toLowerCase()} is online. The work remains queued and will be shown when staff becomes available.`,
            });
          }
        }
      }

      if (branchId) {
        socketManager.emitToBranch(branchId, `workflow:${event.toLowerCase()}`, envelope);
        socketManager.emitToBranch(branchId, 'workflow:pending_changed', { event });
      }
    }

    // ── Persist to DB (non-blocking) ─────────────────────────────────────────
    try {
      const { NotificationService } = await import('../domains/notifications/notification.service.js');

      if (roles.includes('ALL')) {
        // Emergency — one broadcast notification for all
        await NotificationService.createNotification({
          recipientRole: 'ALL',
          hospitalId: effectiveHospitalId,
          branchId: effectiveBranchId,
          title,
          message,
          type: DB_NOTIFICATION_TYPES[type] || 'SYSTEM_ALERT',
          link: payload.linkedPath || '',
          targetModule: payload.targetModule || '',
          relatedPatientId: payload.patientId || null,
          relatedTaskId: payload.relatedTaskId || payload.orderId || payload.appointmentId || payload.prescriptionId || payload.invoiceId || payload.requestId || '',
          metadata: { event, patientName: payload.patientName, uhid: payload.uhid },
        });
      } else {
        // Collect all target recipient user IDs across all roles in this event to avoid duplicate rows for multi-role staff
        const { User } = await import('../models/User.js');
        const userQuery = { status: { $ne: 'INACTIVE' }, isActive: { $ne: false } };
        if (['NEW_DATA', 'WORKFLOW'].includes(DB_NOTIFICATION_TYPES[type] || type)) userQuery.isAvailable = { $ne: false };
        if (effectiveHospitalId) userQuery.hospitalId = effectiveHospitalId;
        if (effectiveBranchId) userQuery.$or = [{ branchId: effectiveBranchId }, { branchId: null }];

        const orConditions = [
          { role: { $in: roles } },
          { additionalRoles: { $in: roles } },
        ];
        if (payload.doctorId) {
          orConditions.push({ _id: payload.doctorId });
        }
        userQuery.$and = [{ $or: orConditions }];

        const recipients = await User.find(userQuery).select('_id').lean();
        const uniqueIds = Array.from(new Set(recipients.map((r) => String(r._id))));

        if (uniqueIds.length > 0) {
          const { Notification } = await import('../models/Notification.js');
          const baseNotif = {
            hospitalId: effectiveHospitalId,
            branchId: effectiveBranchId,
            title,
            message,
            notificationType: DB_NOTIFICATION_TYPES[type] || 'WORKFLOW',
            type: DB_NOTIFICATION_TYPES[type] || 'WORKFLOW',
            link: payload.linkedPath || '',
            targetRoute: payload.linkedPath || '',
            targetModule: payload.targetModule || '',
            relatedPatientId: payload.patientId || null,
            relatedTaskId: payload.relatedTaskId || payload.orderId || payload.appointmentId || payload.prescriptionId || payload.invoiceId || payload.requestId || '',
            isRead: false,
            status: 'ACTIVE',
            metadata: { event, patientName: payload.patientName, uhid: payload.uhid },
          };

          await Notification.insertMany(
            uniqueIds.map((userId) => ({ ...baseNotif, recipientUserId: userId }))
          );
        }

        if (payload.senderUserId && unavailableRoles.length > 0) {
          await NotificationService.createNotification({
            recipientUserId: payload.senderUserId,
            hospitalId: effectiveHospitalId,
            branchId: effectiveBranchId,
            title: 'Work queued — staff unavailable',
            message: `No available ${unavailableRoles.map((role) => role.replaceAll('_', ' ').toLowerCase()).join(' or ')} is online. The request remains safely queued and will be surfaced when staff becomes available.`,
            notificationType: 'SYSTEM_ALERT',
            targetModule: payload.targetModule || '',
            targetRoute: payload.linkedPath || '',
            relatedPatientId: payload.patientId || null,
            relatedTaskId: payload.orderId || payload.prescriptionId || payload.appointmentId || '',
            metadata: { event, queued: true, unavailableRoles },
          });
        }
      }
    } catch (dbErr) {
      // DB persistence failure must never block real-time socket emission
      console.error('[WorkflowEventService] Failed to persist notification to DB:', dbErr.message);
    }
  }

  /**
   * Synchronous emit — for backwards compatibility where await cannot be used.
   * Fires socket events immediately; DB persistence runs in background.
   */
  static emitSync(event, payload, branchId = null) {
    // Fire and forget — don't await
    WorkflowEventService.emit(event, payload, branchId).catch((err) =>
      console.error('[WorkflowEventService] emitSync error:', err.message)
    );
  }

  static getTargetRoles(event) {
    return TARGET_ROLES[event] || [];
  }
}
