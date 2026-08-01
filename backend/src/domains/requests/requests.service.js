import { PatientRequest } from '../../models/PatientRequest.js';
import { Bed } from '../../models/Bed.js';
import { Patient } from '../../models/Patient.js';
import { Admission } from '../../models/Admission.js';
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

    // Resolve patient
    let patientId = data.patientId;
    if (!patientId && user.role === 'PATIENT') {
      const patientDoc = await Patient.findOne({
        hospitalId: user.hospitalId,
        $or: [{ email: user.email }, { phone: user.phone }],
      });
      patientId = patientDoc?._id;
    }

    if (!patientId) {
      const firstPatient = await Patient.findOne({ hospitalId: user.hospitalId });
      patientId = firstPatient?._id;
    }

    // If bed not specified, resolve from active admission
    if (!bed && patientId) {
      const activeAdm = await Admission.findOne({ patientId, status: 'ADMITTED' });
      if (activeAdm?.bedId) {
        bed = await Bed.findById(activeAdm.bedId);
      }
    }

    // Fallback bed lookup
    if (!bed) {
      bed = await Bed.findOne({ branchId: user.branchId });
    }

    if (!bed) {
      throw new ApiError(400, 'Bed context missing for request creation', null, 'INVALID_BED');
    }

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
      hospitalId: user.hospitalId,
      branchId: user.branchId,
      patientId,
      bedId: bed._id,
      requestedBy: user.role === 'GUARDIAN' ? 'GUARDIAN' : 'PATIENT',
      requestType: data.requestType,
      requestCategory: category,
      priority,
      notes: data.notes || '',
      status: 'SUBMITTED',
      submittedAt: new Date(),
    });

    const populated = await PatientRequest.findById(request._id)
      .populate('patientId')
      .populate('bedId');

    const patientName = populated.patientId
      ? `${populated.patientId.firstName} ${populated.patientId.lastName}`
      : 'Inpatient';

    // Broadcast real-time notifications
    socketManager.emitToBranch(user.branchId, 'patient_request:created', {
      requestId: request._id,
      requestType: request.requestType,
      requestCategory: category,
      priority: request.priority,
      bedNumber: bed.bedNumber,
      roomNumber: bed.roomNumber || 'Room 101',
      wardName: bed.wardName || 'General Ward',
      patientName,
      createdAt: request.createdAt,
    });

    if (category === 'EMERGENCY') {
      socketManager.emitToBranch(user.branchId, 'emergency:broadcast', {
        requestId: request._id,
        codeType: 'CODE_BLUE',
        patientName,
        bedNumber: bed.bedNumber,
        wardName: bed.wardName || 'General Ward',
        roomNumber: bed.roomNumber || 'Room 101',
        triggeredAt: new Date(),
      });
    }

    return populated;
  }

  /**
   * Get active requests for Nurse/Caretaker live queue.
   */
  static async getActiveRequests(user, categoryFilter = null) {
    const filter = { branchId: user.branchId };
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
    const { status, notes, rejectedReason } = typeof updateData === 'string' ? { status: updateData } : updateData;

    const request = await PatientRequest.findById(requestId).populate('patientId').populate('bedId');
    if (!request) {
      throw new ApiError(404, 'Patient request record not found', null, 'NOT_FOUND');
    }

    request.status = status;
    if (notes) request.notes = notes;
    if (rejectedReason) request.rejectedReason = rejectedReason;

    if (status === 'ACCEPTED' || status === 'ACKNOWLEDGED') {
      request.acceptedAt = new Date();
      request.acceptedBy = user.id;
      if (user.role === 'NURSE' || user.role === 'NURSE_INCHARGE') {
        request.assignedNurseId = user.id;
      } else {
        request.assignedCaretakerId = user.id;
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
