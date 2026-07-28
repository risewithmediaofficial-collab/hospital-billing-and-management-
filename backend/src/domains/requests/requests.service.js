import { PatientRequest } from '../../models/PatientRequest.js';
import { Bed } from '../../models/Bed.js';
import { Patient } from '../../models/Patient.js';
import { socketManager } from '../../events/socketManager.js';
import { REQUEST_STATUS } from '../../config/constants.js';
import { ApiError } from '../../utils/apiError.js';

export class RequestsService {
  static async createRequest(data, user) {
    let bed = null;
    if (data.bedId) {
      bed = await Bed.findById(data.bedId);
    } else {
      bed = await Bed.findOne({ branchId: user.branchId });
    }

    if (!bed) {
      throw new ApiError(400, 'Bed context missing for request creation', null, 'INVALID_BED');
    }

    let patientId = user.id;
    if (data.patientId) {
      patientId = data.patientId;
    }

    const request = await PatientRequest.create({
      hospitalId: user.hospitalId,
      branchId: user.branchId,
      patientId,
      bedId: bed._id,
      requestType: data.requestType,
      priority: data.requestType === 'EMERGENCY' ? 'CRITICAL' : 'MEDIUM',
      notes: data.notes || '',
      status: REQUEST_STATUS.PENDING,
    });

    const populated = await PatientRequest.findById(request._id).populate('patientId').populate('bedId');

    // Real-time broadcast to Ward Nurse display
    socketManager.emitToBranch(user.branchId, 'patient_request:created', {
      requestId: request._id,
      requestType: request.requestType,
      bedNumber: bed.bedNumber,
      patientName: `${populated.patientId?.firstName} ${populated.patientId?.lastName}`,
      createdAt: request.createdAt,
    });

    return populated;
  }

  static async getActiveRequests(user) {
    return await PatientRequest.find({ branchId: user.branchId })
      .populate('patientId')
      .populate('bedId')
      .populate('assignedNurseId')
      .sort({ createdAt: -1 });
  }

  static async updateRequestStatus(requestId, status, user) {
    const request = await PatientRequest.findById(requestId).populate('patientId').populate('bedId');
    if (!request) {
      throw new ApiError(404, 'Patient request record not found', null, 'NOT_FOUND');
    }

    request.status = status;
    if (status === REQUEST_STATUS.ACKNOWLEDGED) {
      request.acknowledgedAt = new Date();
      request.assignedNurseId = user.id;
    } else if (status === REQUEST_STATUS.COMPLETED) {
      request.completedAt = new Date();
    }

    await request.save();

    // Broadcast update
    socketManager.emitToBranch(user.branchId, 'patient_request:updated', {
      requestId: request._id,
      status: request.status,
      assignedNurseName: user.name,
    });

    return request;
  }
}
