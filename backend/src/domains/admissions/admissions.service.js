import { Admission } from '../../models/Admission.js';
import { Bed } from '../../models/Bed.js';
import { Patient } from '../../models/Patient.js';
import { Hospital } from '../../models/Hospital.js';
import { Branch } from '../../models/Branch.js';
import { socketManager } from '../../events/socketManager.js';
import { BED_STATUS } from '../../config/constants.js';
import { ApiError } from '../../utils/apiError.js';

export class AdmissionsService {
  static async requestAdmission(data, user) {
    let hospitalId = user?.hospitalId;
    let branchId = user?.branchId;

    if (!hospitalId) {
      const defaultHosp = await Hospital.findOne({});
      hospitalId = defaultHosp?._id;
    }
    if (!branchId) {
      const defaultBranch = await Branch.findOne({ hospitalId });
      branchId = defaultBranch?._id;
    }

    const patient = await Patient.findById(data.patientId);
    if (!patient) {
      throw new ApiError(404, 'Patient record not found', null, 'NOT_FOUND');
    }

    const admission = await Admission.create({
      hospitalId,
      branchId,
      patientId: patient._id,
      uhid: patient.uhid,
      patientName: `${patient.firstName} ${patient.lastName}`,
      doctorId: user.id || user._id,
      doctorName: user.name || 'Dr. Gregory House',
      wardType: data.wardType || 'GENERAL',
      targetWardName: data.targetWardName || 'Ward 3B - Inpatient',
      admissionReason: data.admissionReason || 'Inpatient trauma observation & surgery',
      dailyTariff: data.wardType === 'ICU' ? 650.0 : 150.0,
      status: 'ADMISSION_REQUESTED',
    });

    // Real-time broadcast to Nurse In-Charge & Ward Nurse Desks
    socketManager.emitToBranch(branchId, 'admission:requisition_created', {
      admissionId: admission._id,
      patientName: admission.patientName,
      uhid: admission.uhid,
      doctorName: admission.doctorName,
      wardType: admission.wardType,
    });

    return admission;
  }

  static async getAdmissions(user) {
    let hospitalId = user?.hospitalId;
    if (!hospitalId) {
      const defaultHosp = await Hospital.findOne({});
      hospitalId = defaultHosp?._id;
    }
    return await Admission.find({ hospitalId }).populate('patientId').populate('bedId').sort({ createdAt: -1 });
  }

  static async allocateBed(admissionId, data, user) {
    const admission = await Admission.findById(admissionId);
    if (!admission) {
      throw new ApiError(404, 'Admission requisition record not found', null, 'NOT_FOUND');
    }

    let bed = null;
    if (data.bedId) {
      bed = await Bed.findById(data.bedId);
    } else {
      bed = await Bed.findOne({ branchId: admission.branchId, status: BED_STATUS.AVAILABLE });
    }

    if (!bed) {
      // Auto-create bed if none available
      bed = await Bed.create({
        hospitalId: admission.hospitalId,
        branchId: admission.branchId,
        bedNumber: `BED-30${Math.floor(Math.random() * 90 + 10)}`,
        wardName: admission.targetWardName,
        wardType: admission.wardType,
        dailyTariff: admission.dailyTariff,
        status: BED_STATUS.OCCUPIED,
        currentPatientId: admission.patientId,
      });
    } else {
      bed.status = BED_STATUS.OCCUPIED;
      bed.currentPatientId = admission.patientId;
      await bed.save();
    }

    admission.status = 'ADMITTED';
    admission.bedId = bed._id;
    admission.bedNumber = bed.bedNumber;
    admission.admittedAt = new Date();
    await admission.save();

    // Broadcast admission confirmation
    socketManager.emitToBranch(admission.branchId, 'admission:confirmed', {
      admissionId: admission._id,
      patientName: admission.patientName,
      uhid: admission.uhid,
      bedNumber: bed.bedNumber,
      wardName: bed.wardName,
    });

    return admission;
  }
}
