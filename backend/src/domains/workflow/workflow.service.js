import { Appointment } from '../../models/Appointment.js';
import { DiagnosticOrder } from '../../models/DiagnosticOrder.js';
import { Prescription } from '../../models/Prescription.js';
import { Invoice } from '../../models/Invoice.js';
import { PatientRequest } from '../../models/PatientRequest.js';
import { Admission } from '../../models/Admission.js';
import { Emergency } from '../../models/Emergency.js';
import { GuardianLink } from '../../models/GuardianLink.js';
import { Hospital } from '../../models/Hospital.js';
import { User } from '../../models/User.js';
import { PharmacySubstitutionRequest } from '../../models/PharmacySubstitutionRequest.js';

export const RADIOLOGY_CATEGORIES = ['XRAY', 'MRI', 'CT_SCAN', 'ULTRASOUND', 'RADIOLOGY'];
export const LAB_CATEGORIES = ['LABORATORY', 'BLOOD_TEST', 'URINE_ANALYSIS', 'URINE_TEST', 'CULTURE_TEST', 'BIOPSY', 'PATHOLOGY'];
export const ACTIVE_DIAGNOSTIC_STATUSES = ['REQUESTED', 'DEPARTMENT_RECEIVED', 'ACCEPTED', 'IN_PROGRESS'];
export const ACTIVE_REQUEST_STATUSES = ['SUBMITTED', 'PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'ESCALATED'];

const idOf = (value) => String(value?._id || value || '');
const task = (type, record, path, title, extra = {}) => ({
  id: `${type}:${record._id}`,
  resourceId: idOf(record._id),
  type,
  notificationType: type,
  title,
  message: extra.message || '',
  patientName: extra.patientName || record.patientName || 'Patient',
  uhid: extra.uhid || record.uhid || 'N/A',
  status: record.status || extra.status || 'PENDING',
  priority: record.priority || extra.priority || 'NORMAL',
  targetModule: extra.targetModule || 'dashboard',
  linkedPath: path,
  targetRoute: path,
  createdAt: record.createdAt,
});

export class WorkflowService {
  static async getPendingWork(user) {
    const currentUser = await User.findById(user.id).select('role additionalRoles hospitalId branchId').lean();
    const identity = currentUser || user;
    const activeRole = user.role || identity.role || 'GUEST';
    const hospitalId = identity.hospitalId;
    const branchId = identity.branchId;
    const scope = { ...(hospitalId ? { hospitalId } : {}), ...(branchId ? { branchId } : {}) };
    const tasks = [];

    // STRICT ROLE ISOLATION — Each role gets ONLY its own department notifications
    if (activeRole === 'DOCTOR') {
      const [appointments, reports, doctorRequests, subRequests] = await Promise.all([
        Appointment.find({ ...scope, doctorId: user.id, status: { $in: ['WAITING', 'IN_CONSULTATION'] } }).populate('patientId').lean(),
        DiagnosticOrder.find({ ...scope, doctorId: user.id, status: { $in: ['ACCEPTED', 'IN_PROGRESS', 'REPORT_UPLOADED', 'COMPLETED'] }, reviewedAt: null, chargeStatus: { $ne: 'CANCELLED' } }).lean(),
        PatientRequest.find({ ...scope, requestCategory: 'DOCTOR', status: { $in: ACTIVE_REQUEST_STATUSES }, $or: [{ assignedDoctorId: user.id }, { assignedDoctorId: null }] }).populate('patientId').lean(),
        PharmacySubstitutionRequest.find({ ...scope, doctorId: user.id, status: 'PENDING' }).populate('patientId').lean(),
      ]);
      appointments.forEach((item) => tasks.push(task('DOCTOR_PATIENT', item, '/doctor/dashboard?tab=LIVE', `Patient waiting: ${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), { targetModule: 'doctor', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
      reports.forEach((item) => tasks.push(task('DEPARTMENT_RESPONSE', item, '/doctor/dashboard?tab=DEPT_RESPONSES', ['ACCEPTED', 'IN_PROGRESS'].includes(item.status) ? `Department accepted: ${item.testName}` : `Review response: ${item.testName}`, { targetModule: 'doctor' })));
      doctorRequests.forEach((item) => tasks.push(task('DOCTOR_REQUEST', item, '/doctor/dashboard', `Patient request: ${item.requestType}`, { targetModule: 'doctor', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
      subRequests.forEach((item) => tasks.push(task('SUBSTITUTION_REQUEST', item, '/doctor/dashboard?tab=DEPT_RESPONSES', `Substitution approval: ${item.originalMedicineName}`, { targetModule: 'doctor', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
    }
    else if (['LAB_TECH', 'LABORATORY_STAFF'].includes(activeRole)) {
      const records = await DiagnosticOrder.find({ ...scope, testCategory: { $in: LAB_CATEGORIES }, status: { $in: ACTIVE_DIAGNOSTIC_STATUSES } }).lean();
      records.forEach((item) => tasks.push(task('LAB_WORK', item, '/laboratory/dashboard', `Lab pending: ${item.testName}`, { targetModule: 'laboratory' })));
    }
    else if (['RADIOLOGIST', 'RADIOLOGY_STAFF'].includes(activeRole)) {
      const records = await DiagnosticOrder.find({ ...scope, testCategory: { $in: RADIOLOGY_CATEGORIES }, status: { $in: ACTIVE_DIAGNOSTIC_STATUSES } }).lean();
      records.forEach((item) => tasks.push(task('RADIOLOGY_WORK', item, '/radiology/dashboard', `Radiology pending: ${item.testName}`, { targetModule: 'radiology' })));
    }
    else if (['PHARMACIST', 'PHARMACY_STAFF'].includes(activeRole)) {
      const [prescriptions, respondedSubs] = await Promise.all([
        Prescription.find({ ...scope, dispenseStatus: { $in: ['PENDING_DISPENSE', 'PARTIALLY_DISPENSED'] } }).populate('patientId').lean(),
        PharmacySubstitutionRequest.find({ ...scope, pharmacistId: user.id, status: { $in: ['APPROVED', 'REJECTED'] } }).populate('patientId').lean(),
      ]);
      prescriptions.forEach((item) => tasks.push(task('PHARMACY_WORK', item, '/pharmacy/dispense-queue', `Dispense prescription: ${item.prescriptionNo}`, { targetModule: 'pharmacy', status: item.dispenseStatus, patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
      respondedSubs.forEach((item) => tasks.push(task('SUBSTITUTION_RESPONSE', item, '/pharmacy/dispense-queue', `Doctor ${item.status.toLowerCase()} substitution: ${item.originalMedicineName}`, { targetModule: 'pharmacy', status: item.status, patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
    }
    else if (['CASHIER', 'BILLING_STAFF'].includes(activeRole)) {
      const records = await Invoice.find({ ...scope, status: { $in: ['UNPAID', 'PARTIALLY_PAID'] } }).populate('patientId').lean();
      records.forEach((item) => tasks.push(task('BILLING_WORK', item, '/billing/dashboard', `Collect payment: ${item.invoiceNo}`, { targetModule: 'billing', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid, message: `Balance: ${item.balanceAmount}` })));
    }
    else if (['NURSE', 'NURSE_INCHARGE'].includes(activeRole)) {
      const filter = { ...scope, requestCategory: 'NURSE', status: { $in: ACTIVE_REQUEST_STATUSES } };
      if (activeRole === 'NURSE') filter.$or = [{ assignedNurseId: user.id }, { assignedNurseId: null }];
      const [records, admissions, emergencies] = await Promise.all([
        PatientRequest.find(filter).populate('patientId').lean(),
        activeRole === 'NURSE_INCHARGE' ? Admission.find({ ...scope, status: 'ADMISSION_REQUESTED' }).lean() : Promise.resolve([]),
        Emergency.find({ ...scope, status: { $in: ['ACTIVE', 'RESPONDED'] } }).lean(),
      ]);
      records.forEach((item) => tasks.push(task('NURSING_WORK', item, '/nursing/requests', `Nursing request: ${item.requestType}`, { targetModule: 'nursing', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
      admissions.forEach((item) => tasks.push(task('IPD_WORK', item, '/nurse-incharge/dashboard?tab=REQUISITIONS', `Admission pending: ${item.patientName}`, { targetModule: 'ipd' })));
      emergencies.forEach((item) => tasks.push(task('EMERGENCY_WORK', item, '/emergency', `Emergency: ${item.emergencyType}`, { targetModule: 'emergency' })));
    }
    else if (['RECEPTIONIST', 'OPD_STAFF'].includes(activeRole)) {
      const records = await Appointment.find({ ...scope, status: 'BOOKED' }).populate('patientId').lean();
      records.forEach((item) => tasks.push(task('RECEPTION_WORK', item, '/reception/tokens', `Appointment booked: ${item.patientId?.firstName || ''}`, { targetModule: 'reception', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
    }
    else if (activeRole === 'HOSPITAL_ADMIN') {
      const records = await GuardianLink.find({ ...(hospitalId ? { hospitalId } : {}), accessStatus: 'PENDING' }).populate('patientId').lean();
      records.forEach((item) => tasks.push(task('ADMIN_APPROVAL', item, '/hospital-admin/dashboard?tab=notifications', 'Guardian access approval', { targetModule: 'dashboard', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid, status: item.accessStatus })));
    }
    else if (activeRole === 'SUPER_ADMIN') {
      const records = await Hospital.find({ status: 'PENDING_APPROVAL' }).lean();
      records.forEach((item) => tasks.push(task('SUPER_ADMIN_APPROVAL', item, '/admin/hospitals', `Hospital approval: ${item.name}`, { targetModule: 'saas', patientName: item.name, status: item.status })));
    }

    const uniqueTasks = Array.from(new Map(tasks.map((item) => [item.id, item])).values())
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    const byPath = uniqueTasks.reduce((counts, item) => ({ ...counts, [item.linkedPath]: (counts[item.linkedPath] || 0) + 1 }), {});
    return { total: uniqueTasks.length, byPath, tasks: uniqueTasks };
  }

  static async dismissTask(taskId, user) {
    if (!taskId) return { success: false };
    const [type, resourceId] = taskId.split(':');
    if (!type || !resourceId) return { success: false };

    if (['SUBSTITUTION_RESPONSE', 'SUBSTITUTION_REQUEST'].includes(type)) {
      await PharmacySubstitutionRequest.updateOne(
        { _id: resourceId },
        { acknowledgedByPharmacist: true }
      );
    } else if (type === 'DEPARTMENT_RESPONSE') {
      await DiagnosticOrder.updateOne(
        { _id: resourceId },
        { reviewedAt: new Date() }
      );
    }

    socketManager.emitToBranch(user.branchId || user.hospitalId, 'workflow:pending_changed', {
      resourceId,
      taskId,
    });
    return { success: true };
  }

  static async dismissAllTasks(user) {
    await PharmacySubstitutionRequest.updateMany(
      { hospitalId: user.hospitalId, pharmacistId: user.id },
      { acknowledgedByPharmacist: true }
    );
    await DiagnosticOrder.updateMany(
      { hospitalId: user.hospitalId, doctorId: user.id, reviewedAt: null },
      { reviewedAt: new Date() }
    );
    socketManager.emitToBranch(user.branchId || user.hospitalId, 'workflow:pending_changed', {
      cleared: true,
    });
    return { success: true };
  }
}
