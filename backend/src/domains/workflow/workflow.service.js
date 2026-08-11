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
  title,
  message: extra.message || '',
  patientName: extra.patientName || record.patientName || 'Patient',
  uhid: extra.uhid || record.uhid || 'N/A',
  status: record.status || extra.status || 'PENDING',
  priority: record.priority || extra.priority || 'NORMAL',
  linkedPath: path,
  createdAt: record.createdAt,
});

export class WorkflowService {
  static async getPendingWork(user) {
    const currentUser = await User.findById(user.id).select('role additionalRoles hospitalId branchId').lean();
    const identity = currentUser || user;
    const roles = new Set([identity.role, ...(identity.additionalRoles || [])].filter(Boolean));
    const hospitalId = identity.hospitalId;
    const branchId = identity.branchId;
    const scope = { ...(hospitalId ? { hospitalId } : {}), ...(branchId ? { branchId } : {}) };
    const tasks = [];

    if (roles.has('DOCTOR')) {
      const [appointments, reports, doctorRequests, subRequests] = await Promise.all([
        Appointment.find({ ...scope, doctorId: user.id, status: { $in: ['WAITING', 'IN_CONSULTATION'] } }).populate('patientId').lean(),
        DiagnosticOrder.find({ ...scope, doctorId: user.id, status: { $in: ['ACCEPTED', 'IN_PROGRESS', 'REPORT_UPLOADED', 'COMPLETED'] }, reviewedAt: null, chargeStatus: { $ne: 'CANCELLED' } }).lean(),
        PatientRequest.find({ ...scope, requestCategory: 'DOCTOR', status: { $in: ACTIVE_REQUEST_STATUSES }, $or: [{ assignedDoctorId: user.id }, { assignedDoctorId: null }] }).populate('patientId').lean(),
        PharmacySubstitutionRequest.find({ ...scope, doctorId: user.id, status: 'PENDING' }).populate('patientId').lean(),
      ]);
      appointments.forEach((item) => tasks.push(task('DOCTOR_PATIENT', item, '/doctor/dashboard?tab=LIVE', `Patient waiting: ${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), { patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
      reports.forEach((item) => tasks.push(task('DEPARTMENT_RESPONSE', item, '/doctor/dashboard?tab=DEPT_RESPONSES', ['ACCEPTED', 'IN_PROGRESS'].includes(item.status) ? `Department accepted: ${item.testName}` : `Review response: ${item.testName}`)));
      doctorRequests.forEach((item) => tasks.push(task('DOCTOR_REQUEST', item, '/doctor/dashboard', `Patient request: ${item.requestType}`, { patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
      subRequests.forEach((item) => tasks.push(task('SUBSTITUTION_REQUEST', item, '/doctor/dashboard?tab=DEPT_RESPONSES', `Substitution approval: ${item.originalMedicineName}`, { patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
    }

    if ([...roles].some((role) => ['LAB_TECH', 'LABORATORY_STAFF'].includes(role))) {
      const records = await DiagnosticOrder.find({ ...scope, testCategory: { $in: LAB_CATEGORIES }, status: { $in: ACTIVE_DIAGNOSTIC_STATUSES } }).lean();
      records.forEach((item) => tasks.push(task('LAB_WORK', item, '/laboratory/dashboard', `Lab pending: ${item.testName}`)));
    }

    if ([...roles].some((role) => ['RADIOLOGIST', 'RADIOLOGY_STAFF'].includes(role))) {
      const records = await DiagnosticOrder.find({ ...scope, testCategory: { $in: RADIOLOGY_CATEGORIES }, status: { $in: ACTIVE_DIAGNOSTIC_STATUSES } }).lean();
      records.forEach((item) => tasks.push(task('RADIOLOGY_WORK', item, '/radiology/dashboard', `Radiology pending: ${item.testName}`)));
    }

    if ([...roles].some((role) => ['PHARMACIST', 'PHARMACY_STAFF'].includes(role))) {
      const records = await Prescription.find({ ...scope, dispenseStatus: { $in: ['PENDING_DISPENSE', 'PARTIALLY_DISPENSED'] } }).populate('patientId').lean();
      records.forEach((item) => tasks.push(task('PHARMACY_WORK', item, '/pharmacy/dispense-queue', `Dispense prescription: ${item.prescriptionNo}`, { status: item.dispenseStatus, patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
    }

    if ([...roles].some((role) => ['CASHIER', 'BILLING_STAFF'].includes(role))) {
      const records = await Invoice.find({ ...scope, status: { $in: ['UNPAID', 'PARTIALLY_PAID'] } }).populate('patientId').lean();
      records.forEach((item) => tasks.push(task('BILLING_WORK', item, '/billing/dashboard', `Collect payment: ${item.invoiceNo}`, { patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid, message: `Balance: ${item.balanceAmount}` })));
    }

    if ([...roles].some((role) => ['NURSE', 'NURSE_INCHARGE'].includes(role))) {
      const filter = { ...scope, requestCategory: 'NURSE', status: { $in: ACTIVE_REQUEST_STATUSES } };
      if (roles.has('NURSE') && !roles.has('NURSE_INCHARGE')) filter.$or = [{ assignedNurseId: user.id }, { assignedNurseId: null }];
      const records = await PatientRequest.find(filter).populate('patientId').lean();
      records.forEach((item) => tasks.push(task('NURSING_WORK', item, '/nursing/requests', `Nursing request: ${item.requestType}`, { patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
    }

    if ([...roles].some((role) => ['NURSE_INCHARGE', 'IPD_STAFF'].includes(role))) {
      const records = await Admission.find({ ...scope, status: 'ADMISSION_REQUESTED' }).lean();
      records.forEach((item) => tasks.push(task('IPD_WORK', item, '/nurse-incharge/dashboard?tab=REQUISITIONS', `Admission pending: ${item.patientName}`)));
    }

    if (roles.has('EMERGENCY_STAFF') || [...roles].some((role) => ['DOCTOR', 'NURSE', 'NURSE_INCHARGE', 'HOSPITAL_ADMIN'].includes(role))) {
      const records = await Emergency.find({ ...scope, status: { $in: ['ACTIVE', 'RESPONDED'] } }).lean();
      records.forEach((item) => tasks.push(task('EMERGENCY_WORK', item, '/emergency', `${item.emergencyType}: ${item.location}`)));
    }

    if (roles.has('HOSPITAL_ADMIN')) {
      const records = await GuardianLink.find({ ...(hospitalId ? { hospitalId } : {}), accessStatus: 'PENDING' }).populate('patientId').lean();
      records.forEach((item) => tasks.push(task('ADMIN_APPROVAL', item, '/hospital-admin/dashboard?tab=notifications', 'Guardian access approval', { patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid, status: item.accessStatus })));
    }

    if (roles.has('SUPER_ADMIN')) {
      const records = await Hospital.find({ status: 'PENDING_APPROVAL' }).lean();
      records.forEach((item) => tasks.push(task('SUPER_ADMIN_APPROVAL', item, '/admin/hospitals', `Hospital approval: ${item.name}`, { patientName: item.name, status: item.status })));
    }

    const uniqueTasks = Array.from(new Map(tasks.map((item) => [item.id, item])).values())
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    const byPath = uniqueTasks.reduce((counts, item) => ({ ...counts, [item.linkedPath]: (counts[item.linkedPath] || 0) + 1 }), {});
    return { total: uniqueTasks.length, byPath, tasks: uniqueTasks };
  }
}
