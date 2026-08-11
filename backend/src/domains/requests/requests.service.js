import { PatientRequest } from '../../models/PatientRequest.js';
import { Bed } from '../../models/Bed.js';
import { Patient } from '../../models/Patient.js';
import { Admission } from '../../models/Admission.js';
import { User } from '../../models/User.js';
import { socketManager } from '../../events/socketManager.js';
import { ApiError } from '../../utils/apiError.js';

const CARETAKER_TYPES = ['WATER', 'FOOD', 'CLEANING', 'RESTROOM', 'BLANKET', 'PILLOW', 'CARETAKER'];
const NURSE_TYPES = [
  'MEDICINE',
  'INJECTION',
  'IV_DRIP',
  'URINE_BAG',
  'CATHETER',
  'BED_POSITION',
  'PAIN_ASSISTANCE',
  'NURSE',
  'OXYGEN',
  'WHEELCHAIR',
];
const DOCTOR_TYPES = ['DOCTOR'];

export class RequestsService {
  /**
   * Determine request category based on requestType.
   */
  static categorizeRequestType(type) {
    if (type === 'EMERGENCY') return 'EMERGENCY';
    if (CARETAKER_TYPES.includes(type)) return 'CARETAKER';
    if (NURSE_TYPES.includes(type)) return 'NURSE';
    if (DOCTOR_TYPES.includes(type)) return 'DOCTOR';
    return 'NURSE';
  }

  /**
   * Create a new patient care request.
   */
  static async createRequest(data, user) {
    let bed = null;
    if (data.bedId) {
      bed = await Bed.findById(data.bedId);
    }

    // --- Resolve Patient ---
    let patient = null;
    let patientId = data.patientId || null;

    if (patientId) {
      patient = await Patient.findById(patientId);
    }

    if (!patient && user) {
      const { PatientPortalService } = await import('../patient-portal/patient-portal.service.js');
      patient = await PatientPortalService.resolvePatientForUser(user);
      // resolvePatientForUser may return a plain object with _id: null — only use real DB docs
      if (patient && !patient._id) {
        patient = null;
      }
      patientId = patient?._id || null;
    }

    // Absolute fallback: pick any patient from the hospital or entire DB
    if (!patient) {
      patient = await Patient.findOne(user?.hospitalId ? { hospitalId: user.hospitalId } : {});
      patientId = patient?._id || null;
    }

    if (!patientId) {
      throw new ApiError(400, 'No patient record found for this account. Please contact the hospital reception.', null, 'PATIENT_NOT_FOUND');
    }

    // --- Resolve Active Admission & Bed ---
    let activeAdm = null;
    activeAdm = await Admission.findOne({ patientId, status: 'ADMITTED' });

    if (!bed && activeAdm?.bedId) {
      bed = await Bed.findById(activeAdm.bedId);
    }

    if (!bed && (user?.branchId || patient?.branchId)) {
      bed = await Bed.findOne({ branchId: user?.branchId || patient?.branchId });
    }

    if (!bed) {
      bed = await Bed.findOne({});
    }

    // --- Resolve hospitalId & branchId with robust fallbacks ---
    const { Hospital } = await import('../../models/Hospital.js');
    const { Branch } = await import('../../models/Branch.js');

    let resolvedHospitalId =
      data.hospitalId ||
      user?.hospitalId ||
      patient?.hospitalId ||
      activeAdm?.hospitalId ||
      bed?.hospitalId ||
      null;

    let resolvedBranchId =
      data.branchId ||
      user?.branchId ||
      patient?.branchId ||
      activeAdm?.branchId ||
      bed?.branchId ||
      null;

    // If still missing, look up from DB
    if (!resolvedHospitalId || !resolvedBranchId) {
      const defaultHosp = resolvedHospitalId
        ? await Hospital.findById(resolvedHospitalId)
        : await Hospital.findOne({});
      const defaultBranch = defaultHosp
        ? await Branch.findOne({ hospitalId: defaultHosp._id })
        : null;

      resolvedHospitalId = resolvedHospitalId || defaultHosp?._id;
      resolvedBranchId = resolvedBranchId || defaultBranch?._id;
    }

    if (!resolvedHospitalId || !resolvedBranchId) {
      throw new ApiError(400, 'Hospital context could not be resolved. Please contact support.', null, 'INVALID_CONTEXT');
    }

    // --- Build & Create Request ---
    const category = this.categorizeRequestType(data.requestType);
    const priority = data.requestType === 'EMERGENCY' ? 'CRITICAL' : data.priority || 'MEDIUM';

    // Prevent duplicate active emergency requests for the same patient
    if (data.requestType === 'EMERGENCY') {
      const activeEmergency = await PatientRequest.findOne({
        patientId,
        requestType: 'EMERGENCY',
        status: { $in: ['SUBMITTED', 'PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
      });
      if (activeEmergency) {
        return await PatientRequest.findById(activeEmergency._id).populate('patientId').populate('bedId');
      }
    }

    const request = await PatientRequest.create({
      hospitalId: resolvedHospitalId,
      branchId: resolvedBranchId,
      patientId,
      admissionId: activeAdm?._id || null,
      bedId: bed?._id || null,
      requestedBy: user?.role === 'GUARDIAN' ? 'GUARDIAN' : 'PATIENT',
      requestType: data.requestType,
      requestCategory: category,
      priority,
      notes: data.notes || '',
      status: 'SUBMITTED',
      submittedAt: new Date(),
      assignedNurseId: activeAdm?.assignedNurseId || null,
      assignedCaretakerId: activeAdm?.assignedCaretakerId || null,
      assignedDoctorId: activeAdm?.doctorId || null,
    });

    const populated = await PatientRequest.findById(request._id)
      .populate('patientId')
      .populate('bedId')
      .populate('assignedNurseId', 'name role phone')
      .populate('assignedCaretakerId', 'name role phone')
      .populate('assignedDoctorId', 'name role specialization');

    const patientName = populated.patientId
      ? `${populated.patientId.firstName} ${populated.patientId.lastName}`
      : 'Patient';

    // --- Broadcast real-time notifications ---
    try {
      if (socketManager?.emitToBranch && resolvedBranchId) {
        socketManager.emitToBranch(String(resolvedBranchId), 'patient_request:created', {
          requestId: request._id,
          requestType: request.requestType,
          requestCategory: category,
          priority: request.priority,
          bedNumber: bed?.bedNumber || 'N/A',
          roomNumber: bed?.roomNumber || 'General',
          wardName: bed?.wardName || 'General Ward',
          patientName,
          createdAt: request.createdAt,
        });

        if (category === 'EMERGENCY') {
          socketManager.emitToBranch(String(resolvedBranchId), 'emergency:broadcast', {
            requestId: request._id,
            codeType: 'CODE_BLUE',
            patientName,
            bedNumber: bed?.bedNumber || 'N/A',
            wardName: bed?.wardName || 'General Ward',
            roomNumber: bed?.roomNumber || 'General',
            triggeredAt: new Date(),
          });
        }
      }
    } catch (socketErr) {
      console.error('[RequestsService] Socket broadcast failed (non-fatal):', socketErr.message);
    }

    socketManager.emitToBranch(user.branchId, 'workflow:pending_changed', { resourceId: request._id, status: request.status });
    return populated;
  }

  /**
   * Get active requests for Nurse/Caretaker live queue.
   */
  static async getActiveRequests(user, categoryFilter = null) {
    const filter = { hospitalId: user.hospitalId };
    if (user.branchId) filter.branchId = user.branchId;
    if (categoryFilter) {
      filter.requestCategory = categoryFilter;
    }

    return await PatientRequest.find(filter)
      .populate('patientId')
      .populate('bedId')
      .populate('assignedNurseId', 'name role')
      .populate('assignedCaretakerId', 'name role')
      .populate('acceptedBy', 'name role')
      .populate('completedBy', 'name role')
      .sort({ createdAt: -1 });
  }

  /**
   * Update request status (Accept, Start, Complete, Reject, Escalate).
   */
  static async updateRequestStatus(requestId, updateData, user) {
    const { status, notes, rejectedReason, assignedUserId } = typeof updateData === 'string' ? { status: updateData } : updateData;

    const request = await PatientRequest.findById(requestId).populate('patientId').populate('bedId');
    if (!request) {
      throw new ApiError(404, 'Patient request record not found', null, 'NOT_FOUND');
    }

    request.status = status;
    if (notes) request.notes = notes;
    if (rejectedReason) request.rejectedReason = rejectedReason;

    if (status === 'ACCEPTED' || status === 'ACKNOWLEDGED') {
      let handler = user;
      if (assignedUserId) {
        handler = await User.findOne({ _id: assignedUserId, hospitalId: request.hospitalId, isActive: true });
        if (!handler) {
          throw new ApiError(400, 'Selected care-team member is unavailable or belongs to another hospital.', null, 'INVALID_ASSIGNEE');
        }
      }

      request.acceptedAt = new Date();
      request.acceptedBy = handler.id || handler._id;
      if (request.requestCategory === 'DOCTOR') {
        if (handler.role !== 'DOCTOR') throw new ApiError(400, 'Doctor requests must be assigned to a doctor.', null, 'INVALID_ASSIGNEE_ROLE');
        request.assignedDoctorId = handler.id || handler._id;
      } else if (request.requestCategory === 'CARETAKER') {
        if (!['SUPPORT_STAFF', 'IPD_STAFF', 'NURSE', 'NURSE_INCHARGE'].includes(handler.role)) {
          throw new ApiError(400, 'Caretaker requests must be assigned to support or ward staff.', null, 'INVALID_ASSIGNEE_ROLE');
        }
        request.assignedCaretakerId = handler.id || handler._id;
      } else {
        if (!['NURSE', 'NURSE_INCHARGE'].includes(handler.role)) {
          throw new ApiError(400, 'Nursing requests must be assigned to a nurse.', null, 'INVALID_ASSIGNEE_ROLE');
        }
        request.assignedNurseId = handler.id || handler._id;
      }
    } else if (status === 'COMPLETED') {
      request.completedAt = new Date();
      request.completedBy = user.id;
    } else if (status === 'ESCALATED') {
      request.escalationLevel = (request.escalationLevel || 0) + 1;
      request.escalatedAt = new Date();
    }

    await request.save();

    const populated = await PatientRequest.findById(request._id)
      .populate('patientId')
      .populate('bedId')
      .populate('assignedNurseId', 'name role assignedUnit shiftDetails')
      .populate('assignedCaretakerId', 'name role assignedUnit shiftDetails')
      .populate('assignedDoctorId', 'name role specialization cabinNo')
      .populate('acceptedBy', 'name role')
      .populate('completedBy', 'name role');

    // Broadcast update
    socketManager.emitToBranch(user.branchId, 'patient_request:updated', {
      requestId: request._id,
      status: request.status,
      handlerName: user.name,
      acceptedAt: request.acceptedAt,
      completedAt: request.completedAt,
      escalationLevel: request.escalationLevel,
    });

    return populated;
  }
}
