/**
 * WorkflowEventService — Central inter-department event bus.
 *
 * Maps every workflow lifecycle event to the target roles that should be notified.
 * All inter-department socket emissions pass through here so that adding a new
 * department only requires adding entries to WORKFLOW_EVENTS and TARGET_ROLES.
 */
import { socketManager } from './socketManager.js';

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
};

// ─── Which roles get notified for each event ─────────────────────────────────
const TARGET_ROLES = {
  [WORKFLOW_EVENTS.PATIENT_QUEUED]:           ['DOCTOR'],
  [WORKFLOW_EVENTS.TOKEN_REQUEUED]:           ['DOCTOR'],
  [WORKFLOW_EVENTS.DOCTOR_ACCEPTED_PATIENT]:  ['RECEPTIONIST'],
  // Consultation completion means "ready for billing". Reception must not
  // receive it in Completed & Billed until PAYMENT_COLLECTED is emitted.
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
};

// ─── Human-readable notification messages for each event ─────────────────────
const MESSAGE_TEMPLATES = {
  [WORKFLOW_EVENTS.PATIENT_QUEUED]:
    (p) => ({ title: 'New Patient in Queue', message: `${p.patientName} (${p.uhid}) has been assigned Token #${p.tokenNumber} and is waiting.` }),

  [WORKFLOW_EVENTS.TOKEN_REQUEUED]:
    (p) => ({ title: 'Patient Re-queued', message: `${p.patientName} (${p.uhid}) token has been re-queued.` }),

  [WORKFLOW_EVENTS.DOCTOR_ACCEPTED_PATIENT]:
    (p) => ({ title: 'Doctor Accepted Patient', message: `Dr. ${p.doctorName} has accepted ${p.patientName} (${p.uhid}) for consultation.` }),

  [WORKFLOW_EVENTS.CONSULTATION_COMPLETE]:
    (p) => ({ title: 'Consultation Completed', message: `Dr. ${p.doctorName} has completed the consultation for ${p.patientName} (${p.uhid}).` }),

  [WORKFLOW_EVENTS.LAB_ORDER_CREATED]:
    (p) => ({ title: 'New Lab Request', message: `Dr. ${p.doctorName} has requested ${p.testName} for ${p.patientName} (${p.uhid}).` }),

  [WORKFLOW_EVENTS.RADIOLOGY_ORDER_CREATED]:
    (p) => ({ title: 'New Radiology Request', message: `Dr. ${p.doctorName} has requested ${p.testName} for ${p.patientName} (${p.uhid}).` }),

  [WORKFLOW_EVENTS.LAB_ACCEPTED]:
    (p) => ({ title: 'Request Accepted', message: `Laboratory accepted your request for ${p.testName} (${p.patientName}).` }),

  [WORKFLOW_EVENTS.LAB_SUBMITTED]:
    (p) => ({ title: 'Laboratory Response Received', message: `Response received from Laboratory for ${p.testName} (${p.patientName}).` }),

  [WORKFLOW_EVENTS.RADIOLOGY_ACCEPTED]:
    (p) => ({ title: 'Request Accepted', message: `X-Ray department accepted your request for ${p.testName} (${p.patientName}).` }),

  [WORKFLOW_EVENTS.RADIOLOGY_SUBMITTED]:
    (p) => ({ title: 'X-Ray Response Received', message: `Response received from X-Ray Department for ${p.testName} (${p.patientName}).` }),

  [WORKFLOW_EVENTS.DOCTOR_REVIEWED_LAB]:
    (p) => ({ title: 'Doctor Reviewed Report', message: `Dr. ${p.doctorName} has reviewed and accepted the ${p.testName} report for ${p.patientName}.` }),

  [WORKFLOW_EVENTS.DOCTOR_REVIEWED_RADIOLOGY]:
    (p) => ({ title: 'Doctor Reviewed Scan', message: `Dr. ${p.doctorName} has reviewed and accepted the ${p.testName} scan for ${p.patientName}.` }),

  [WORKFLOW_EVENTS.PRESCRIPTION_ISSUED]:
    (p) => ({ title: 'New Prescription', message: `Dr. ${p.doctorName} has issued a prescription for ${p.patientName} (${p.uhid}).` }),

  [WORKFLOW_EVENTS.PHARMACY_ACCEPTED]:
    (p) => ({ title: 'Pharmacy Accepted', message: `Pharmacy has accepted the prescription for ${p.patientName} and is preparing medicines.` }),

  [WORKFLOW_EVENTS.PHARMACY_DISPENSED]:
    (p) => ({ title: 'Medicines Dispensed', message: `Pharmacy has dispensed all medicines for ${p.patientName} (${p.uhid}).` }),

  [WORKFLOW_EVENTS.BILL_REQUESTED]:
    (p) => ({ title: 'Bill Ready to Generate', message: `Bill generation requested for ${p.patientName} (${p.uhid}).` }),

  [WORKFLOW_EVENTS.BILL_READY]:
    (p) => ({ title: 'Invoice Generated', message: `Invoice #${p.invoiceNo || ''} created for ${p.patientName} (${p.uhid}).` }),

  [WORKFLOW_EVENTS.PAYMENT_COLLECTED]:
    (p) => ({ title: 'Payment Collected', message: `Payment collected for ${p.patientName} (${p.uhid}). Encounter closed.` }),

  [WORKFLOW_EVENTS.NURSE_REQUEST_RAISED]:
    (p) => ({ title: 'Nurse Request', message: `Nurse raised a ${p.requestType} request for patient in ${p.location}.` }),

  [WORKFLOW_EVENTS.NURSE_REQUEST_COMPLETED]:
    (p) => ({ title: 'Nurse Request Completed', message: `Nurse has completed the ${p.requestType} request for ${p.patientName}.` }),

  [WORKFLOW_EVENTS.EMERGENCY_RAISED]:
    (p) => ({ title: '🚨 EMERGENCY ALERT', message: `${p.emergencyType} emergency raised at ${p.location} by ${p.raisedBy}. Patient: ${p.patientName || 'Unknown'}.` }),

  [WORKFLOW_EVENTS.EMERGENCY_RESOLVED]:
    (p) => ({ title: 'Emergency Resolved', message: `Emergency at ${p.location} has been resolved by ${p.resolvedBy}.` }),
};

// ─── WorkflowEventService ─────────────────────────────────────────────────────
export class WorkflowEventService {
  /**
   * Emit a workflow event to all target role rooms.
   * @param {string} event  - One of WORKFLOW_EVENTS constants
   * @param {object} payload - Data specific to this event
   * @param {string} branchId - Optional: scope to a specific branch room
   */
  static emit(event, payload, branchId = null) {
    const roles = TARGET_ROLES[event] || [];
    const templateFn = MESSAGE_TEMPLATES[event];
    const notification = templateFn ? templateFn(payload) : { title: event, message: '' };

    const envelope = {
      event,
      ...notification,
      payload,
      timestamp: new Date().toISOString(),
      isRead: false,
      linkedPath: payload.linkedPath || null,
    };

    if (roles.includes('ALL')) {
      // Emergency broadcast — goes to everyone
      socketManager.emitEmergency(event, envelope);
      if (branchId) socketManager.emitToBranch(branchId, 'workflow:pending_changed', { event });
      return;
    }

    roles.forEach((role) => {
      const targetedEnvelope = { ...envelope, targetRole: role };
      const targetUserId = role === 'DOCTOR' ? payload.doctorId : null;
      if (targetUserId) {
        socketManager.emitToUser(targetUserId, `workflow:${event.toLowerCase()}`, targetedEnvelope);
        socketManager.emitToUser(targetUserId, 'workflow:notification', targetedEnvelope);
      } else {
        socketManager.emitToRole(role, `workflow:${event.toLowerCase()}`, targetedEnvelope);
        socketManager.emitToRole(role, 'workflow:notification', targetedEnvelope);
      }
    });

    // Also emit to branch room for any display boards
    if (branchId) {
      socketManager.emitToBranch(branchId, `workflow:${event.toLowerCase()}`, envelope);
      socketManager.emitToBranch(branchId, 'workflow:pending_changed', { event });
    }
  }

  static getTargetRoles(event) {
    return TARGET_ROLES[event] || [];
  }
}
