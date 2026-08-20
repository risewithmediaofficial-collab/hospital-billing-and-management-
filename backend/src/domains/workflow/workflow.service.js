import mongoose from 'mongoose';
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
import { NurseTask } from '../../models/NurseTask.js';

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
    try {
      if (!user) {
        return { total: 0, byPath: {}, tasks: [] };
      }

      const userId = user.id || user._id;
      let currentUser = null;
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        currentUser = await User.findById(userId).select('role additionalRoles hospitalId branchId').lean().catch(() => null);
      }

      const identity = currentUser || user;
      const activeRole = user.role || identity.role || 'GUEST';
      const rawHospitalId = identity.hospitalId?._id || identity.hospitalId;
      const rawBranchId = identity.branchId?._id || identity.branchId;

      const hospitalId = rawHospitalId && mongoose.Types.ObjectId.isValid(rawHospitalId) ? rawHospitalId : null;
      const branchId = rawBranchId && mongoose.Types.ObjectId.isValid(rawBranchId) ? rawBranchId : null;

      const scope = { ...(hospitalId ? { hospitalId } : {}) };
      const tasks = [];

      const userRoles = new Set([
        activeRole,
        ...(Array.isArray(user?.additionalRoles) ? user.additionalRoles : []),
        ...(Array.isArray(identity?.additionalRoles) ? identity.additionalRoles : []),
      ].filter(Boolean));

      const isSupervisorOrAdmin = userRoles.has('HOSPITAL_ADMIN') || userRoles.has('SUPER_ADMIN');

      if (userRoles.has('DOCTOR') || isSupervisorOrAdmin) {
        const docId = userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null;
        try {
          const docQuery = (!isSupervisorOrAdmin && docId) ? { doctorId: docId } : {};
          const [appointments, reports, doctorRequests, subRequests] = await Promise.all([
            Appointment.find({ ...scope, ...docQuery, status: { $in: ['WAITING', 'IN_CONSULTATION'] } }).populate('patientId').lean().catch(() => []),
            DiagnosticOrder.find({ ...scope, ...docQuery, status: { $in: ['REPORT_UPLOADED', 'COMPLETED'] }, reviewedAt: null, chargeStatus: { $ne: 'CANCELLED' } }).lean().catch(() => []),
            PatientRequest.find({ ...scope, requestCategory: 'DOCTOR', status: { $in: ACTIVE_REQUEST_STATUSES }, ...(!isSupervisorOrAdmin && docId ? { $or: [{ assignedDoctorId: docId }, { assignedDoctorId: null }] } : {}) }).populate('patientId').lean().catch(() => []),
            PharmacySubstitutionRequest.find({ ...scope, ...docQuery, status: 'PENDING' }).populate('patientId').lean().catch(() => []),
          ]);
          appointments.forEach((item) => item && tasks.push(task('DOCTOR_PATIENT', item, '/doctor/dashboard?tab=LIVE', `Patient waiting: ${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), { targetModule: 'doctor', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
          reports.forEach((item) => item && tasks.push(task('DEPARTMENT_RESPONSE', item, '/doctor/dashboard?tab=DEPT_RESPONSES', `Review response: ${item.testName || 'Report'}`, { targetModule: 'doctor' })));
          doctorRequests.forEach((item) => item && tasks.push(task('DOCTOR_REQUEST', item, '/doctor/dashboard', `Patient request: ${item.requestType || 'Request'}`, { targetModule: 'doctor', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
          subRequests.forEach((item) => item && tasks.push(task('SUBSTITUTION_REQUEST', item, '/doctor/dashboard?tab=DEPT_RESPONSES', `Substitution approval: ${item.originalMedicineName || 'Medicine'}`, { targetModule: 'doctor', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
        } catch (docErr) {
          console.warn('[WorkflowService] Doctor tasks error:', docErr.message);
        }
      }

      if (Array.from(userRoles).some((r) => ['CASHIER', 'BILLING_STAFF', 'ACCOUNTANT'].includes(r)) || isSupervisorOrAdmin) {
        try {
          const records = await Invoice.find({ ...scope, status: { $in: ['UNPAID', 'PARTIALLY_PAID'] } }).populate('patientId').lean().catch(() => []);
          records.forEach((item) => item && tasks.push(task('BILLING_WORK', item, '/billing/dashboard', `Collect payment: ${item.invoiceNo || 'Invoice'}`, { targetModule: 'billing', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid, message: `Balance: ${item.balanceAmount || 0}` })));
        } catch (billErr) {
          console.warn('[WorkflowService] Billing tasks error:', billErr.message);
        }
      }

      if (Array.from(userRoles).some((r) => ['LAB_TECH', 'LABORATORY_STAFF', 'PATHOLOGIST'].includes(r)) || isSupervisorOrAdmin) {
        try {
          const records = await DiagnosticOrder.find({ ...scope, testCategory: { $in: LAB_CATEGORIES }, status: { $in: ACTIVE_DIAGNOSTIC_STATUSES } }).lean().catch(() => []);
          records.forEach((item) => item && tasks.push(task('LAB_WORK', item, '/laboratory/dashboard', `Lab pending: ${item.testName || 'Test'}`, { targetModule: 'laboratory' })));
        } catch (labErr) {
          console.warn('[WorkflowService] Lab tasks error:', labErr.message);
        }
      }

      if (Array.from(userRoles).some((r) => ['RADIOLOGIST', 'RADIOLOGY_STAFF'].includes(r)) || isSupervisorOrAdmin) {
        try {
          const records = await DiagnosticOrder.find({ ...scope, testCategory: { $in: RADIOLOGY_CATEGORIES }, status: { $in: ACTIVE_DIAGNOSTIC_STATUSES } }).lean().catch(() => []);
          records.forEach((item) => item && tasks.push(task('RADIOLOGY_WORK', item, '/radiology/dashboard', `Radiology pending: ${item.testName || 'Scan'}`, { targetModule: 'radiology' })));
        } catch (radErr) {
          console.warn('[WorkflowService] Radiology tasks error:', radErr.message);
        }
      }

      if (Array.from(userRoles).some((r) => ['PHARMACIST', 'PHARMACY_STAFF'].includes(r)) || isSupervisorOrAdmin) {
        try {
          const prescriptions = await Prescription.find({ ...scope, dispenseStatus: { $in: ['PENDING_DISPENSE', 'PARTIALLY_DISPENSED'] } }).populate('patientId').lean().catch(() => []);
          prescriptions.forEach((item) => item && tasks.push(task('PHARMACY_WORK', item, '/pharmacy/dispense-queue', `Dispense prescription: ${item.prescriptionNo || 'Rx'}`, { targetModule: 'pharmacy', status: item.dispenseStatus, patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
        } catch (pharmaErr) {
          console.warn('[WorkflowService] Pharmacy tasks error:', pharmaErr.message);
        }
      }

      if (Array.from(userRoles).some((r) => ['NURSE', 'NURSE_INCHARGE', 'NURSING', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(r))) {
        try {
          const filter = { ...scope, requestCategory: 'NURSE', status: { $in: ACTIVE_REQUEST_STATUSES } };
          if (!userRoles.has('NURSE_INCHARGE') && !isSupervisorOrAdmin && userId && mongoose.Types.ObjectId.isValid(userId)) {
            filter.$or = [{ assignedNurseId: userId }, { assignedNurseId: null }];
          }
          const [records, admissions, emergencies, nurseTasks] = await Promise.all([
            PatientRequest.find(filter).populate('patientId').lean().catch(() => []),
            Admission.find({ ...scope, status: { $in: ['ADMISSION_REQUESTED', 'REQUISITION_RAISED'] } }).lean().catch(() => []),
            Emergency.find({ ...scope, status: { $in: ['ACTIVE', 'RESPONDED'] } }).lean().catch(() => []),
            NurseTask.find({ ...scope, status: { $in: ['PENDING', 'ACCEPTED', 'SCHEDULED', 'DELAYED'] } }).lean().catch(() => []),
          ]);
          records.forEach((item) => item && tasks.push(task('NURSING_WORK', item, '/nurse-incharge/dashboard?tab=REQUESTS', `Nursing request: ${item.requestType || 'Request'}`, { targetModule: 'nursing', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
          admissions.forEach((item) => item && tasks.push(task('IPD_WORK', item, '/nurse-incharge/dashboard?tab=REQUISITIONS', `Admission pending: ${item.patientName || 'Admission'}`, { targetModule: 'ipd' })));
          emergencies.forEach((item) => item && tasks.push(task('EMERGENCY_WORK', item, '/emergency', `Emergency: ${item.emergencyType || 'Alert'}`, { targetModule: 'emergency' })));
          nurseTasks.forEach((item) => item && tasks.push(task('NURSE_TREATMENT', item, '/nurse-incharge/dashboard?tab=TASKS', `Treatment: ${item.medicineName || 'Medication'}`, { targetModule: 'nursing' })));
        } catch (nurseErr) {
          console.warn('[WorkflowService] Nursing tasks error:', nurseErr.message);
        }
      }

      if (Array.from(userRoles).some((r) => ['RECEPTIONIST', 'OPD_STAFF', 'FRONT_DESK'].includes(r)) || isSupervisorOrAdmin) {
        try {
          const records = await Appointment.find({ ...scope, status: 'BOOKED' }).populate('patientId').lean().catch(() => []);
          records.forEach((item) => item && tasks.push(task('RECEPTION_WORK', item, '/reception/dashboard', `Appointment booked: ${item.patientId?.firstName || ''}`, { targetModule: 'reception', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
        } catch (recErr) {
          console.warn('[WorkflowService] Reception tasks error:', recErr.message);
        }
      }

      if (userRoles.has('HOSPITAL_ADMIN')) {
        try {
          const records = await GuardianLink.find({ ...(hospitalId ? { hospitalId } : {}), accessStatus: 'PENDING' }).populate('patientId').lean().catch(() => []);
          records.forEach((item) => item && tasks.push(task('ADMIN_APPROVAL', item, '/hospital-admin/dashboard?tab=notifications', 'Guardian access approval', { targetModule: 'dashboard', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid, status: item.accessStatus })));
        } catch (adminErr) {
          console.warn('[WorkflowService] Hospital Admin tasks error:', adminErr.message);
        }
      }

      if (userRoles.has('SUPER_ADMIN')) {
        try {
          const records = await Hospital.find({ status: 'PENDING_APPROVAL' }).lean().catch(() => []);
          records.forEach((item) => item && tasks.push(task('SUPER_ADMIN_APPROVAL', item, '/admin/hospitals', `Hospital approval: ${item.name || 'Hospital'}`, { targetModule: 'saas', patientName: item.name, status: item.status })));
        } catch (saErr) {
          console.warn('[WorkflowService] Super Admin tasks error:', saErr.message);
        }
      }

      const validTasks = tasks.filter((t) => t && t.id);
      const uniqueTasks = Array.from(new Map(validTasks.map((item) => [item.id, item])).values())
        .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      const byPath = uniqueTasks.reduce((counts, item) => ({ ...counts, [item.linkedPath]: (counts[item.linkedPath] || 0) + 1 }), {});
      return { total: uniqueTasks.length, byPath, tasks: uniqueTasks };
    } catch (globalErr) {
      console.error('[WorkflowService Error]', globalErr);
      return { total: 0, byPath: {}, tasks: [] };
    }
  }
}
