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
import { Bed } from '../../models/Bed.js';
import { Consultation } from '../../models/Consultation.js';

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
      const isHospitalStaff = !userRoles.has('SUPER_ADMIN') && !userRoles.has('PATIENT') && !userRoles.has('GUARDIAN');

      if (userRoles.has('DOCTOR') || isSupervisorOrAdmin) {
        const docId = userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null;
        try {
          const docQuery = docId ? { doctorId: docId } : {};
          const [appointments, reports, doctorRequests, subRequests, nurseResponses] = await Promise.all([
            Appointment.find({ ...scope, ...docQuery, status: { $in: ['WAITING', 'IN_CONSULTATION'] } }).populate('patientId').lean().catch(() => []),
            DiagnosticOrder.find({ ...scope, ...docQuery, status: { $in: ['REPORT_UPLOADED', 'COMPLETED'] }, reviewedAt: null, chargeStatus: { $ne: 'CANCELLED' } }).lean().catch(() => []),
            PatientRequest.find({ ...scope, requestCategory: 'DOCTOR', status: { $in: ACTIVE_REQUEST_STATUSES }, ...(docId ? { $or: [{ assignedDoctorId: docId }, { assignedDoctorId: null }] } : {}) }).populate('patientId').lean().catch(() => []),
            PharmacySubstitutionRequest.find({ ...scope, ...docQuery, status: 'PENDING' }).populate('patientId').lean().catch(() => []),
            NurseTask.find({ ...scope, ...docQuery, status: 'ADMINISTERED', doctorReviewedAt: null }).populate('patientId').lean().catch(() => []),
          ]);
          appointments.forEach((item) => item && tasks.push(task('DOCTOR_PATIENT', item, '/doctor/dashboard', `Patient waiting: ${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), { targetModule: 'doctor', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
          reports.forEach((item) => item && tasks.push(task('DEPARTMENT_RESPONSE', item, '/doctor/dashboard?tab=DEPT_RESPONSES', `Review report: ${item.testName || 'Report'}`, { targetModule: 'doctor' })));
          doctorRequests.forEach((item) => item && tasks.push(task('DOCTOR_REQUEST', item, '/doctor/dashboard', `Patient request: ${item.requestType || 'Request'}`, { targetModule: 'doctor', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
          subRequests.forEach((item) => item && tasks.push(task('SUBSTITUTION_REQUEST', item, '/doctor/dashboard?tab=DEPT_RESPONSES', `Substitution approval: ${item.originalMedicineName || 'Medicine'}`, { targetModule: 'doctor', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
          nurseResponses.forEach((item) => item && tasks.push(task('NURSE_RESPONSE', item, '/doctor/dashboard?tab=DEPT_RESPONSES', `Injection Administered: ${item.medicineName || 'Treatment'}`, { targetModule: 'doctor', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
        } catch (docErr) {
          console.warn('[WorkflowService] Doctor tasks error:', docErr.message);
        }
      }

      if (Array.from(userRoles).some((r) => ['CASHIER', 'BILLING_STAFF', 'ACCOUNTANT'].includes(r)) || isSupervisorOrAdmin || isHospitalStaff) {
        try {
          const records = await Invoice.find({ ...scope, status: { $in: ['UNPAID', 'PARTIALLY_PAID'] } }).populate('patientId').lean().catch(() => []);
          records.forEach((item) => item && tasks.push(task('BILLING_WORK', item, '/billing/dashboard', `Collect payment: ${item.invoiceNo || 'Invoice'}`, { targetModule: 'billing', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid, message: `Balance: ${item.balanceAmount || 0}` })));
        } catch (billErr) {
          console.warn('[WorkflowService] Billing tasks error:', billErr.message);
        }
      }

      if (Array.from(userRoles).some((r) => ['LAB_TECH', 'LABORATORY_STAFF', 'PATHOLOGIST'].includes(r)) || isSupervisorOrAdmin || isHospitalStaff) {
        try {
          const records = await DiagnosticOrder.find({ ...scope, testCategory: { $in: LAB_CATEGORIES }, status: { $in: ACTIVE_DIAGNOSTIC_STATUSES } }).lean().catch(() => []);
          records.forEach((item) => item && tasks.push(task('LAB_WORK', item, '/laboratory/dashboard', `Lab pending: ${item.testName || 'Test'}`, { targetModule: 'laboratory' })));
        } catch (labErr) {
          console.warn('[WorkflowService] Lab tasks error:', labErr.message);
        }
      }

      if (Array.from(userRoles).some((r) => ['RADIOLOGIST', 'RADIOLOGY_STAFF'].includes(r)) || isSupervisorOrAdmin || isHospitalStaff) {
        try {
          const records = await DiagnosticOrder.find({ ...scope, testCategory: { $in: RADIOLOGY_CATEGORIES }, status: { $in: ACTIVE_DIAGNOSTIC_STATUSES } }).lean().catch(() => []);
          records.forEach((item) => item && tasks.push(task('RADIOLOGY_WORK', item, '/radiology/dashboard', `Radiology pending: ${item.testName || 'Scan'}`, { targetModule: 'radiology' })));
        } catch (radErr) {
          console.warn('[WorkflowService] Radiology tasks error:', radErr.message);
        }
      }

      if (Array.from(userRoles).some((r) => ['PHARMACIST', 'PHARMACY_STAFF'].includes(r)) || isSupervisorOrAdmin || isHospitalStaff) {
        try {
          const prescriptions = await Prescription.find({ ...scope, dispenseStatus: { $in: ['PENDING_DISPENSE', 'PARTIALLY_DISPENSED'] } }).populate('patientId').lean().catch(() => []);
          prescriptions.forEach((item) => item && tasks.push(task('PHARMACY_WORK', item, '/pharmacy/dispense-queue', `Dispense prescription: ${item.prescriptionNo || 'Rx'}`, { targetModule: 'pharmacy', status: item.dispenseStatus, patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
        } catch (pharmaErr) {
          console.warn('[WorkflowService] Pharmacy tasks error:', pharmaErr.message);
        }
      }

      if (Array.from(userRoles).some((r) => ['NURSE', 'NURSE_INCHARGE', 'NURSING', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(r)) || isHospitalStaff) {
        try {
          const filter = { ...scope, requestCategory: 'NURSE', status: { $in: ACTIVE_REQUEST_STATUSES } };
          if (!userRoles.has('NURSE_INCHARGE') && !isSupervisorOrAdmin && userId && mongoose.Types.ObjectId.isValid(userId) && !isHospitalStaff) {
            filter.$or = [{ assignedNurseId: userId }, { assignedNurseId: null }];
          }
          const [records, admissions, emergencies, nurseTasks, admittedInpatients, totalBeds] = await Promise.all([
            PatientRequest.find(filter).populate('patientId').lean().catch(() => []),
            Admission.find({ ...scope, status: { $in: ['ADMISSION_REQUESTED', 'REQUISITION_RAISED'] } }).lean().catch(() => []),
            Emergency.find({ ...scope, status: { $in: ['ACTIVE', 'RESPONDED'] } }).lean().catch(() => []),
            NurseTask.find({ ...scope, status: { $in: ['PENDING', 'ACCEPTED', 'SCHEDULED', 'DELAYED'] } }).lean().catch(() => []),
            Admission.find({ ...scope, status: 'ADMITTED' }).lean().catch(() => []),
            Bed.countDocuments({ ...(hospitalId ? { hospitalId } : {}) }).catch(() => 0),
          ]);
          records.forEach((item) => item && tasks.push(task('NURSING_WORK', item, '/nurse-incharge/dashboard?tab=REQUESTS', `Nursing request: ${item.requestType || 'Request'}`, { targetModule: 'nursing', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
          admissions.forEach((item) => item && tasks.push(task('IPD_WORK', item, '/nurse-incharge/dashboard?tab=REQUISITIONS', `Admission pending: ${item.patientName || 'Admission'}`, { targetModule: 'ipd' })));
          emergencies.forEach((item) => item && tasks.push(task('EMERGENCY_WORK', item, '/emergency', `Emergency: ${item.emergencyType || 'Alert'}`, { targetModule: 'emergency' })));
          nurseTasks.forEach((item) => item && tasks.push(task('NURSE_TREATMENT', item, '/nurse-incharge/dashboard?tab=TASKS', `Treatment: ${item.medicineName || 'Medication'}`, { targetModule: 'nursing' })));
        } catch (nurseErr) {
          console.warn('[WorkflowService] Nursing tasks error:', nurseErr.message);
        }
      }

      if (Array.from(userRoles).some((r) => ['RECEPTIONIST', 'OPD_STAFF', 'FRONT_DESK'].includes(r)) || isSupervisorOrAdmin || isHospitalStaff) {
        try {
          const records = await Appointment.find({ ...scope, status: 'BOOKED' }).populate('patientId').lean().catch(() => []);
          records.forEach((item) => item && tasks.push(task('RECEPTION_WORK', item, '/reception/registered-patients', `Appointment booked: ${item.patientId?.firstName || ''}`, { targetModule: 'reception', patientName: `${item.patientId?.firstName || ''} ${item.patientId?.lastName || ''}`.trim(), uhid: item.patientId?.uhid })));
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

  static async getHospitalDataJourney(query = {}, user) {
    try {
      if (!user) return { journeys: [], stats: {} };

      const userId = user.id || user._id;
      let currentUser = null;
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        currentUser = await User.findById(userId).select('hospitalId branchId role').lean().catch(() => null);
      }
      const rawHospId = currentUser?.hospitalId || user.hospitalId;
      const rawBranchId = currentUser?.branchId || user.branchId;

      const hospitalId = rawHospId && mongoose.Types.ObjectId.isValid(rawHospId) ? rawHospId : null;
      const branchId = rawBranchId && mongoose.Types.ObjectId.isValid(rawBranchId) ? rawBranchId : null;

      const scope = {
        ...(hospitalId ? { hospitalId } : {}),
        ...(branchId && user.role !== 'SUPER_ADMIN' ? { branchId } : {}),
      };

      // Search and date filters
      const search = (query.search || '').trim();
      const stageFilter = (query.stage || 'ALL').toUpperCase();

      // Fetch today and recent appointments (up to 100)
      const appointments = await Appointment.find(scope)
        .populate('patientId', 'firstName lastName uhid gender age phone bloodGroup emergencyContact')
        .populate('doctorId', 'name specialization cabinNo departmentId')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      if (!appointments.length) {
        return {
          journeys: [],
          stats: { total: 0, atNurse: 0, inLab: 0, atPharmacy: 0, atBilling: 0, completed: 0, delayedAlerts: 0 }
        };
      }

      const apptIds = appointments.map((a) => a._id);
      const patientIds = appointments.map((a) => a.patientId?._id || a.patientId).filter(Boolean);

      const [consultations, nurseTasks, diagnosticOrders, prescriptions, invoices] = await Promise.all([
        Consultation.find({ hospitalId, appointmentId: { $in: apptIds } }).lean().catch(() => []),
        NurseTask.find({ hospitalId, appointmentId: { $in: apptIds } }).populate('assignedNurseId', 'name role').lean().catch(() => []),
        DiagnosticOrder.find({ hospitalId, $or: [{ appointmentId: { $in: apptIds } }, { patientId: { $in: patientIds } }] }).lean().catch(() => []),
        Prescription.find({ hospitalId, patientId: { $in: patientIds } }).populate('doctorId', 'name').lean().catch(() => []),
        Invoice.find({ hospitalId, $or: [{ appointmentId: { $in: apptIds } }, { patientId: { $in: patientIds } }] }).lean().catch(() => []),
      ]);

      const now = new Date();
      let stats = { total: 0, atNurse: 0, inLab: 0, atPharmacy: 0, atBilling: 0, completed: 0, delayedAlerts: 0 };

      const journeys = appointments.map((appt) => {
        const patient = appt.patientId || {};
        const doctor = appt.doctorId || {};
        const pName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient';
        const uhid = patient.uhid || 'UHID-N/A';

        const apptConsultation = consultations.find((c) => String(c.appointmentId) === String(appt._id));
        const apptNurseTasks = nurseTasks.filter((t) => String(t.appointmentId) === String(appt._id) || String(t.patientId) === String(patient._id));
        const apptDiagOrders = diagnosticOrders.filter((d) => String(d.appointmentId) === String(appt._id) || String(d.patientId) === String(patient._id));
        const apptPrescriptions = prescriptions.filter((p) => String(p.consultationId) === String(apptConsultation?._id) || String(p.patientId) === String(patient._id));
        const apptInvoice = invoices.find((inv) => String(inv.appointmentId) === String(appt._id) || (String(inv.patientId) === String(patient._id) && ['UNPAID', 'PARTIALLY_PAID'].includes(inv.status))) || invoices.find((inv) => String(inv.patientId) === String(patient._id));

        // Determine current stage & handling staff
        let currentStage = 'WAITING';
        let currentStageLabel = 'Queued at Reception / Waiting for Doctor';
        let handlingStaff = { name: doctor.name || 'Assigned Consultant', role: 'DOCTOR', department: 'Clinical OPD' };
        let nextDestination = 'Doctor Consultation';
        let isDelayed = false;
        const auditAlerts = [];

        const hasPendingNurse = apptNurseTasks.some((t) => ['PENDING', 'ACCEPTED', 'SCHEDULED'].includes(t.status));
        const hasPendingLab = apptDiagOrders.some((o) => ACTIVE_DIAGNOSTIC_STATUSES.includes(o.status));
        const hasUnreviewedReport = apptDiagOrders.some((o) => ['REPORT_UPLOADED', 'COMPLETED'].includes(o.status) && !o.reviewedAt);
        const hasPendingPharmacy = apptPrescriptions.some((p) => p.dispenseStatus === 'PENDING_DISPENSE');
        const hasUnpaidInvoice = apptInvoice && ['UNPAID', 'PARTIALLY_PAID'].includes(apptInvoice.status);

        if (apptInvoice && apptInvoice.status === 'PAID') {
          currentStage = 'COMPLETED_SETTLED';
          currentStageLabel = 'Bill Settled & Patient Discharged';
          handlingStaff = { name: apptInvoice.createdByName || 'Cashier Desk', role: 'CASHIER', department: 'Central Billing' };
          nextDestination = 'Visit Closed / Patient Discharged';
        } else if (hasUnpaidInvoice) {
          currentStage = 'AT_BILLING';
          currentStageLabel = 'At Central Billing Desk (Awaiting Payment Collection)';
          handlingStaff = { name: 'Cashier Desk', role: 'CASHIER', department: 'Central Billing' };
          nextDestination = 'Final Payment Settlement & Receipt Print';
          if (new Date(apptInvoice.createdAt).getTime() < now.getTime() - 20 * 60 * 1000) {
            isDelayed = true;
            auditAlerts.push({ type: 'UNCOLLECTED_BILL', message: `Unpaid invoice of ₹${apptInvoice.balanceAmount || apptInvoice.totalAmount} waiting for >20 mins.` });
          }
        } else if (hasPendingPharmacy) {
          currentStage = 'AT_PHARMACY';
          currentStageLabel = 'At Pharmacy Desk (Take-Home Medication Packaging)';
          handlingStaff = { name: 'Duty Pharmacist', role: 'PHARMACIST', department: 'Pharmacy' };
          nextDestination = 'Central Billing Desk for Payment';
        } else if (hasPendingNurse || appt.status === 'WAITING_NURSE') {
          currentStage = 'AT_NURSE';
          currentStageLabel = 'At Nurse Station (Injection / IV Administration)';
          const activeTask = apptNurseTasks.find((t) => ['PENDING', 'ACCEPTED'].includes(t.status));
          handlingStaff = {
            name: activeTask?.assignedNurseName || activeTask?.assignedNurseId?.name || 'Duty Nurse',
            role: 'NURSE',
            department: 'Nursing Station',
          };
          nextDestination = 'Doctor Consultation Sign-Off & Billing';
          if (new Date(activeTask?.createdAt || appt.updatedAt).getTime() < now.getTime() - 15 * 60 * 1000) {
            isDelayed = true;
            auditAlerts.push({ type: 'NURSE_DELAY', message: `Nursing procedure pending for >15 mins.` });
          }
        } else if (hasPendingLab || appt.status === 'WAITING_DEPARTMENT') {
          currentStage = 'IN_DIAGNOSTICS';
          currentStageLabel = 'In Pathology / Radiology (Sample / Scan in Progress)';
          const activeDiag = apptDiagOrders.find((o) => ACTIVE_DIAGNOSTIC_STATUSES.includes(o.status));
          handlingStaff = {
            name: activeDiag?.technicianName || 'Diagnostic Technician',
            role: activeDiag?.testCategory === 'RADIOLOGY' ? 'RADIOLOGIST' : 'LAB_TECH',
            department: activeDiag?.testCategory === 'RADIOLOGY' ? 'Radiology & Imaging' : 'Pathology & Lab',
          };
          nextDestination = 'Doctor Report Review';
        } else if (appt.departmentReturnedAt && appt.status === 'IN_CONSULTATION') {
          currentStage = 'RETURNED_TO_DOCTOR';
          currentStageLabel = 'Returned from Department (Ready for Doctor Finalization)';
          handlingStaff = { name: doctor.name || 'Doctor', role: 'DOCTOR', department: `Cabin ${doctor.cabinNo || '101'}` };
          nextDestination = 'Prescribe Take-Home Medicine / Send to Bill';
        } else if (appt.status === 'IN_CONSULTATION') {
          currentStage = 'IN_CONSULTATION';
          currentStageLabel = 'In Doctor Cabin (Active Consultation)';
          handlingStaff = { name: doctor.name || 'Doctor', role: 'DOCTOR', department: `Cabin ${doctor.cabinNo || '101'}` };
          nextDestination = 'Nurse Station / Diagnostics / Billing';
        } else if (appt.status === 'CANCELLED') {
          currentStage = 'CANCELLED';
          currentStageLabel = 'Visit Cancelled';
          handlingStaff = { name: 'Reception / Doctor', role: 'STAFF', department: 'OPD' };
          nextDestination = 'None';
        }

        // Build Chronological Journey Steps
        const journeySteps = [
          {
            stepIndex: 1,
            title: 'Registration & Token Issued',
            department: 'Reception / Front Desk',
            staff: 'Reception Desk',
            timestamp: appt.createdAt,
            status: 'COMPLETED',
            details: `Token #${appt.tokenNumber} issued. Assigned to Dr. ${doctor.name || 'Doctor'} (${doctor.specialization || 'Consultant'}).`,
          },
        ];

        if (apptConsultation || appt.status === 'IN_CONSULTATION' || appt.status === 'WAITING_NURSE' || appt.status === 'WAITING_DEPARTMENT' || appt.status === 'COMPLETED') {
          journeySteps.push({
            stepIndex: 2,
            title: 'Doctor Clinical Examination',
            department: 'Clinical EMR',
            staff: `Dr. ${doctor.name || 'Doctor'}`,
            timestamp: apptConsultation?.createdAt || appt.updatedAt,
            status: apptConsultation ? 'COMPLETED' : 'IN_PROGRESS',
            details: apptConsultation
              ? `Diagnosis: ${apptConsultation.chiefComplaints || 'Consultation done'}. Fee: ₹${apptConsultation.consultationFee || 0}.`
              : `Token #${appt.tokenNumber} called into Cabin ${doctor.cabinNo || '101'}.`,
          });
        }

        if (apptNurseTasks.length > 0) {
          apptNurseTasks.forEach((nt, idx) => {
            journeySteps.push({
              stepIndex: 3 + idx,
              title: `Nursing: ${nt.medicineName} (${nt.dose})`,
              department: 'Nursing Station',
              staff: nt.administrationDetails?.nurseName || nt.assignedNurseName || 'Duty Nurse',
              timestamp: nt.administrationDetails?.administeredAt || nt.createdAt,
              status: nt.status === 'ADMINISTERED' ? 'COMPLETED' : 'IN_PROGRESS',
              details: nt.status === 'ADMINISTERED'
                ? `Administered via ${nt.administrationDetails?.siteOrRoute || nt.route || 'IV'} by Nurse ${nt.administrationDetails?.nurseName || 'Staff'}. Notes: "${nt.administrationDetails?.notes || 'Normal'}". Doctor notified.`
                : `Pending administration in nurse station. Prescribed by Dr. ${doctor.name || 'Doctor'}.`,
            });
          });
        }

        if (apptDiagOrders.length > 0) {
          apptDiagOrders.forEach((ord, idx) => {
            journeySteps.push({
              stepIndex: 4 + idx,
              title: `Diagnostics: ${ord.testName}`,
              department: ord.testCategory === 'RADIOLOGY' ? 'Radiology' : 'Pathology Lab',
              staff: ord.technicianName || 'Lab Technician',
              timestamp: ord.reviewedAt || ord.updatedAt || ord.createdAt,
              status: ['COMPLETED', 'REPORT_UPLOADED'].includes(ord.status) ? 'COMPLETED' : 'IN_PROGRESS',
              details: ['COMPLETED', 'REPORT_UPLOADED'].includes(ord.status)
                ? `Report uploaded: "${ord.reportSummary || 'Normal'}". Verified by ${ord.technicianName || 'Technician'}.`
                : `Test ordered by Dr. ${doctor.name || 'Doctor'}. Current status: ${ord.status}.`,
            });
          });
        }

        if (apptPrescriptions.length > 0) {
          apptPrescriptions.forEach((rx, idx) => {
            journeySteps.push({
              stepIndex: 5 + idx,
              title: `Pharmacy: Prescription ${rx.prescriptionNo || ''}`,
              department: 'Pharmacy Desk',
              staff: rx.dispensedByName || 'Pharmacist Desk',
              timestamp: rx.dispensedAt || rx.createdAt,
              status: rx.dispenseStatus === 'DISPENSED' ? 'COMPLETED' : 'IN_PROGRESS',
              details: rx.dispenseStatus === 'DISPENSED'
                ? `Dispensed ${rx.medicines?.length || 0} medications. Total charge: ₹${rx.totalMedicineCharge || 0}.`
                : `Prescription received with ${rx.medicines?.length || 0} items. Packaging in progress.`,
            });
          });
        }

        if (apptInvoice) {
          journeySteps.push({
            stepIndex: 6,
            title: `Central Billing & Cashier Settlement`,
            department: 'Central Billing',
            staff: apptInvoice.createdByName || 'Cashier Desk',
            timestamp: apptInvoice.paidAt || apptInvoice.updatedAt || apptInvoice.createdAt,
            status: apptInvoice.status === 'PAID' ? 'COMPLETED' : 'PENDING',
            details: apptInvoice.status === 'PAID'
              ? `Payment settled: ₹${apptInvoice.paidAmount || apptInvoice.totalAmount} collected via ${apptInvoice.paymentMethod || 'Cash'}. Invoice #${apptInvoice.invoiceNo}.`
              : `Invoice #${apptInvoice.invoiceNo} generated. Balance pending: ₹${apptInvoice.balanceAmount || apptInvoice.totalAmount}.`,
          });
        }

        // Stats accumulation
        stats.total++;
        if (currentStage === 'AT_NURSE') stats.atNurse++;
        if (currentStage === 'IN_DIAGNOSTICS') stats.inLab++;
        if (currentStage === 'AT_PHARMACY') stats.atPharmacy++;
        if (currentStage === 'AT_BILLING') stats.atBilling++;
        if (currentStage === 'COMPLETED_SETTLED') stats.completed++;
        if (isDelayed || auditAlerts.length > 0) stats.delayedAlerts++;

        return {
          id: appt._id,
          appointmentNo: appt.appointmentNo,
          tokenNumber: appt.tokenNumber,
          createdAt: appt.createdAt,
          patient: {
            id: patient._id,
            name: pName,
            uhid,
            gender: patient.gender || 'N/A',
            age: patient.age || 'N/A',
            phone: patient.phone || 'N/A',
          },
          doctor: {
            id: doctor._id,
            name: doctor.name || 'Doctor',
            specialization: doctor.specialization || 'General',
            cabin: doctor.cabinNo || appt.cabinNo || 'Cabin 101',
          },
          origin: {
            department: 'Reception Desk',
            time: appt.createdAt,
            tokenNumber: appt.tokenNumber,
          },
          currentStage,
          currentStageLabel,
          handlingStaff,
          nextDestination,
          isDelayed,
          auditAlerts,
          journeySteps,
          financials: {
            invoiceNo: apptInvoice?.invoiceNo || 'Pending Creation',
            totalAmount: apptInvoice?.totalAmount || 0,
            paidAmount: apptInvoice?.paidAmount || 0,
            balanceAmount: apptInvoice?.balanceAmount || 0,
            paymentStatus: apptInvoice?.status || 'PENDING_GENERATION',
          },
        };
      });

      // Filter by search query
      let filteredJourneys = journeys;
      if (search) {
        const q = search.toLowerCase();
        filteredJourneys = filteredJourneys.filter((j) =>
          j.patient.name.toLowerCase().includes(q) ||
          j.patient.uhid.toLowerCase().includes(q) ||
          String(j.tokenNumber).includes(q) ||
          j.doctor.name.toLowerCase().includes(q) ||
          j.handlingStaff.name.toLowerCase().includes(q) ||
          j.currentStageLabel.toLowerCase().includes(q)
        );
      }

      // Filter by stage tab
      if (stageFilter !== 'ALL') {
        if (stageFilter === 'NURSE') filteredJourneys = filteredJourneys.filter((j) => j.currentStage === 'AT_NURSE');
        else if (stageFilter === 'DIAGNOSTICS') filteredJourneys = filteredJourneys.filter((j) => j.currentStage === 'IN_DIAGNOSTICS');
        else if (stageFilter === 'PHARMACY') filteredJourneys = filteredJourneys.filter((j) => j.currentStage === 'AT_PHARMACY');
        else if (stageFilter === 'BILLING') filteredJourneys = filteredJourneys.filter((j) => j.currentStage === 'AT_BILLING');
        else if (stageFilter === 'COMPLETED') filteredJourneys = filteredJourneys.filter((j) => j.currentStage === 'COMPLETED_SETTLED');
        else if (stageFilter === 'ALERTS') filteredJourneys = filteredJourneys.filter((j) => j.auditAlerts.length > 0 || j.isDelayed);
      }

      return {
        journeys: filteredJourneys,
        stats,
      };
    } catch (err) {
      console.error('[WorkflowService.getHospitalDataJourney Error]', err);
      return { journeys: [], stats: {} };
    }
  }
}
