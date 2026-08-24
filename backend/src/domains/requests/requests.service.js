import { PatientRequest } from '../../models/PatientRequest.js';
import { Bed } from '../../models/Bed.js';
import { Patient } from '../../models/Patient.js';
import { Admission } from '../../models/Admission.js';
import { User } from '../../models/User.js';
import { Notification } from '../../models/Notification.js';
import { socketManager } from '../../events/socketManager.js';
import { WorkflowEventService, WORKFLOW_EVENTS } from '../../events/workflowEventService.js';
import { ApiError } from '../../utils/apiError.js';
import { requireBranchContext, requireHospitalContext } from '../../utils/tenantContext.js';

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
const ALLOWED_REQUEST_TYPES = new Set([...CARETAKER_TYPES, ...NURSE_TYPES, ...DOCTOR_TYPES, 'EMERGENCY']);

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
    const resolvedHospitalId = requireHospitalContext(user);
    const resolvedBranchId = requireBranchContext(user);
    const requestType = String(data.requestType || '').trim().toUpperCase();
    if (!ALLOWED_REQUEST_TYPES.has(requestType)) {
      throw new ApiError(400, 'Invalid patient request type.', null, 'INVALID_REQUEST_TYPE');
    }
    let bed = null;
    if (data.bedId) {
      bed = await Bed.findOne({ _id: data.bedId, hospitalId: resolvedHospitalId, branchId: resolvedBranchId });
      if (!bed) throw new ApiError(404, 'Bed not found in the active hospital branch.', null, 'BED_NOT_FOUND');
    }

    // --- Resolve Patient ---
    let patient = null;
    let patientId = data.patientId || null;

    if (patientId) {
      patient = await Patient.findOne({ _id: patientId, hospitalId: resolvedHospitalId });
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

    if (!patientId) {
      throw new ApiError(400, 'No patient record found for this account. Please contact the hospital reception.', null, 'PATIENT_NOT_FOUND');
    }

    // --- Resolve Active Admission & Bed ---
    let activeAdm = null;
    activeAdm = await Admission.findOne({
      hospitalId: resolvedHospitalId,
      branchId: resolvedBranchId,
      patientId,
      status: 'ADMITTED',
    });

    if (!bed && activeAdm?.bedId) {
      bed = await Bed.findOne({ _id: activeAdm.bedId, hospitalId: resolvedHospitalId, branchId: resolvedBranchId });
    }

    // --- Build & Create Request ---
    const category = this.categorizeRequestType(requestType);
    if (['NURSE', 'CARETAKER', 'EMERGENCY'].includes(category) && !activeAdm) {
      throw new ApiError(409, 'An active admission is required for bedside or inpatient emergency requests.', null, 'ACTIVE_ADMISSION_REQUIRED');
    }
    const priority = requestType === 'EMERGENCY' ? 'CRITICAL' : data.priority || 'MEDIUM';

    // Prevent duplicate active emergency requests for the same patient
    if (requestType === 'EMERGENCY') {
      const activeEmergency = await PatientRequest.findOne({
        hospitalId: resolvedHospitalId,
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
      requestType,
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
      const targetRoles = category === 'CARETAKER'
        ? ['SUPPORT_STAFF', 'IPD_STAFF', 'NURSE_INCHARGE']
        : category === 'DOCTOR'
          ? ['DOCTOR']
        : category === 'EMERGENCY'
          ? ['EMERGENCY_STAFF', 'NURSE', 'NURSE_INCHARGE']
          : ['NURSE', 'NURSE_INCHARGE'];
      const assignedRecipientId = category === 'CARETAKER'
        ? request.assignedCaretakerId
        : category === 'DOCTOR'
          ? request.assignedDoctorId
        : request.assignedNurseId;

      const workflowEvent = category === 'DOCTOR'
        ? WORKFLOW_EVENTS.PATIENT_DOCTOR_REQUEST_RAISED
        : WORKFLOW_EVENTS.PATIENT_CARE_REQUEST_RAISED;
      const linkedPath = category === 'DOCTOR'
        ? `/doctor/dashboard?tab=DEPT_RESPONSES&requestId=${request._id}`
        : `/nurse-incharge/dashboard?tab=REQUESTS&requestId=${request._id}`;

      await WorkflowEventService.emit(workflowEvent, {
        requestId: request._id,
        relatedTaskId: String(request._id),
        patientId: request.patientId?._id || request.patientId,
        patientName,
        uhid: populated.patientId?.uhid || 'N/A',
        requestType: request.requestType,
        requestCategory: category,
        bedNumber: bed?.bedNumber || 'N/A',
        wardName: bed?.wardName || 'General Ward',
        hospitalId: request.hospitalId,
        branchId: resolvedBranchId,
        linkedPath,
        targetModule: category === 'DOCTOR' ? 'doctor' : 'nursing',
        targetRoles,
        recipientUserIds: assignedRecipientId ? [String(assignedRecipientId)] : [],
        guardianMessageType: data.guardianMessageType || null,
      }, resolvedBranchId);

      if (category === 'EMERGENCY' && socketManager?.emitToBranch && resolvedBranchId) {
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
    } catch (socketErr) {
      console.error('[RequestsService] Socket broadcast failed (non-fatal):', socketErr.message);
    }

    return populated;
  }

  /**
   * Get active requests for Nurse/Caretaker live queue.
   */
  static async getActiveRequests(user, categoryFilter = null) {
    const filter = { hospitalId: requireHospitalContext(user) };
    if (user.branchId) filter.branchId = user.branchId;
    filter.status = { $in: ['SUBMITTED', 'PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'ESCALATED'] };

    if (categoryFilter) {
      filter.requestCategory = String(categoryFilter).toUpperCase();
    }

    const roles = new Set([user.role, ...(user.additionalRoles || [])]);
    const userId = user.id || user._id;
    if (categoryFilter === 'DOCTOR' || (roles.has('DOCTOR') && !roles.has('HOSPITAL_ADMIN') && !roles.has('SUPER_ADMIN'))) {
      filter.requestCategory = 'DOCTOR';
      if (!roles.has('HOSPITAL_ADMIN') && !roles.has('SUPER_ADMIN')) {
        filter.$or = [{ assignedDoctorId: userId }, { assignedDoctorId: null }, { assignedDoctorId: { $exists: false } }];
      }
    } else if (roles.has('NURSE_INCHARGE') || roles.has('HOSPITAL_ADMIN') || roles.has('SUPER_ADMIN')) {
      if (!categoryFilter) filter.requestCategory = { $in: ['NURSE', 'CARETAKER', 'EMERGENCY', 'DOCTOR'] };
    } else if (roles.has('NURSE')) {
      if (!categoryFilter) filter.requestCategory = { $in: ['NURSE', 'EMERGENCY'] };
      filter.$or = [{ assignedNurseId: userId }, { assignedNurseId: null }, { assignedNurseId: { $exists: false } }];
    } else if (roles.has('SUPPORT_STAFF') || roles.has('IPD_STAFF')) {
      if (!categoryFilter) filter.requestCategory = 'CARETAKER';
      filter.$or = [{ assignedCaretakerId: userId }, { assignedCaretakerId: null }, { assignedCaretakerId: { $exists: false } }];
    } else if (roles.has('EMERGENCY_STAFF')) {
      if (!categoryFilter) filter.requestCategory = 'EMERGENCY';
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

    const hospitalId = requireHospitalContext(user);
    const allowedStatuses = ['ACCEPTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'ESCALATED'];
    if (!allowedStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid patient request status.', null, 'INVALID_STATUS');
    }
    const request = await PatientRequest.findOne({
      _id: requestId,
      hospitalId,
      ...(user.branchId ? { branchId: user.branchId } : {}),
    }).populate('patientId').populate('bedId');
    if (!request) {
      throw new ApiError(404, 'Patient request record not found', null, 'NOT_FOUND');
    }

    const roles = new Set([user.role, ...(user.additionalRoles || [])]);
    const userId = String(user.id || user._id || '');
    const assignedId = request.requestCategory === 'DOCTOR'
      ? request.assignedDoctorId
      : request.requestCategory === 'CARETAKER'
        ? request.assignedCaretakerId
        : request.assignedNurseId;
    const categoryAllowed = (roles.has('NURSE_INCHARGE') && request.requestCategory !== 'DOCTOR')
      || (request.requestCategory === 'DOCTOR' && roles.has('DOCTOR'))
      || (['NURSE', 'EMERGENCY'].includes(request.requestCategory) && roles.has('NURSE'))
      || (request.requestCategory === 'CARETAKER' && (roles.has('SUPPORT_STAFF') || roles.has('IPD_STAFF')))
      || (request.requestCategory === 'EMERGENCY' && roles.has('EMERGENCY_STAFF'));
    if (!categoryAllowed || (assignedId && String(assignedId) !== userId && !roles.has('NURSE_INCHARGE'))) {
      throw new ApiError(403, 'This patient request is assigned to another care-team role or user.', null, 'REQUEST_NOT_ASSIGNED');
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

    // Automatically mark associated DB notifications as read & cleared so bell count reduces for everyone
    try {
      await Notification.updateMany(
        {
          hospitalId,
          $or: [
            { relatedTaskId: String(request._id) },
            { relatedRequestId: String(request._id) },
          ],
          isCleared: { $ne: true },
        },
        { isRead: true, isCleared: true, readAt: new Date(), clearedAt: new Date() }
      );
    } catch (notifErr) {
      console.error('[RequestsService] Notification clear failed:', notifErr.message);
    }

    // Broadcast status update so real-time listeners update their UI
    socketManager.emitToBranch(user.branchId, 'patient_request:updated', {
      requestId: request._id,
      status: request.status,
      handlerName: user.name,
      acceptedAt: request.acceptedAt,
      completedAt: request.completedAt,
      escalationLevel: request.escalationLevel,
    });

    // Trigger sidebar pending-work badge refresh for ALL connected users in the branch
    socketManager.emitToBranch(user.branchId, 'workflow:pending_changed', {
      resourceId: request._id,
      status: request.status,
    });

    return populated;
  }
}
