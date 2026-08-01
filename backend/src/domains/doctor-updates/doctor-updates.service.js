import { DoctorUpdate } from '../../models/DoctorUpdate.js';
import { Patient } from '../../models/Patient.js';
import { socketManager } from '../../events/socketManager.js';
import { ApiError } from '../../utils/apiError.js';

export class DoctorUpdatesService {
  /**
   * Publish a new progress note or status update by Doctor.
   */
  static async createUpdate(data, doctorUser) {
    const { patientId, admissionId, title, content, updateType, visibility } = data;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new ApiError(404, 'Patient not found', null, 'PATIENT_NOT_FOUND');
    }

    const update = await DoctorUpdate.create({
      hospitalId: doctorUser.hospitalId,
      branchId: doctorUser.branchId,
      patientId: patient._id,
      admissionId: admissionId || null,
      doctorId: doctorUser.id,
      title,
      content,
      updateType: updateType || 'GENERAL_UPDATE',
      visibility: visibility || 'BOTH',
    });

    const populated = await DoctorUpdate.findById(update._id).populate('doctorId', 'name specialization');

    // Broadcast real-time event to branch room
    socketManager.emitToBranch(doctorUser.branchId, 'doctor_update:created', {
      updateId: update._id,
      patientId: patient._id,
      title: update.title,
      updateType: update.updateType,
      visibility: update.visibility,
      doctorName: doctorUser.name,
    });

    return populated;
  }

  /**
   * Get doctor updates for a specific patient.
   */
  static async getPatientUpdates(patientId, visibilityFilter = null) {
    const query = { patientId };
    if (visibilityFilter) {
      query.visibility = { $in: Array.isArray(visibilityFilter) ? visibilityFilter : [visibilityFilter] };
    }

    return await DoctorUpdate.find(query)
      .populate('doctorId', 'name specialization cabinNo')
      .sort({ createdAt: -1 });
  }
}
