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

    socketManager.emitToBranch(admission.branchId, 'workflow:pending_changed', { resourceId: admission._id, status: admission.status });
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

    if (admission.status === 'ADMITTED') {
      throw new ApiError(400, `Patient ${admission.patientName} is already admitted to Bed ${admission.bedNumber}.`, null, 'ALREADY_ADMITTED');
    }

    const { wardName, bedNumber, dailyTariff } = data;

    let bed = null;
    if (data.bedId) {
      bed = await Bed.findById(data.bedId);
    } else if (bedNumber) {
      bed = await Bed.findOne({
        branchId: admission.branchId,
        bedNumber: bedNumber.trim()
      }).populate('currentPatientId');
    }

    // Check if bed is already occupied by a different patient
    if (bed && bed.status === BED_STATUS.OCCUPIED) {
      const currentPatId = bed.currentPatientId?._id || bed.currentPatientId;
      if (String(currentPatId) !== String(admission.patientId)) {
        const occPat = bed.currentPatientId;
        const occName = occPat ? `${occPat.firstName || ''} ${occPat.lastName || ''}`.trim() : 'another patient';
        throw new ApiError(400, `Bed '${bed.bedNumber}' in ${bed.wardName} is currently OCCUPIED by patient '${occName}'. Please select an available bed.`, null, 'BED_OCCUPIED');
      }
    }

    const selectedWard = wardName || admission.targetWardName || 'Ward 3B - Inpatient';
    const selectedBedNo = bedNumber ? bedNumber.trim() : (bed ? bed.bedNumber : `BED-30${Math.floor(Math.random() * 90 + 10)}`);
    const selectedTariff = dailyTariff ? Number(dailyTariff) : (admission.dailyTariff || 150.0);

    if (!bed) {
      // Create new bed record with wardName and bedNumber specified by Nurse
      bed = await Bed.create({
        hospitalId: admission.hospitalId,
        branchId: admission.branchId,
        bedNumber: selectedBedNo,
        wardName: selectedWard,
        wardType: admission.wardType || 'GENERAL',
        dailyTariff: selectedTariff,
        status: BED_STATUS.OCCUPIED,
        currentPatientId: admission.patientId,
      });
    } else {
      bed.status = BED_STATUS.OCCUPIED;
      bed.currentPatientId = admission.patientId;
      bed.wardName = selectedWard;
      bed.dailyTariff = selectedTariff;
      await bed.save();
    }

    admission.status = 'ADMITTED';
    admission.bedId = bed._id;
    admission.bedNumber = bed.bedNumber;
    admission.targetWardName = bed.wardName;
    admission.dailyTariff = bed.dailyTariff;
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
    socketManager.emitToBranch(admission.branchId, 'workflow:pending_changed', { resourceId: admission._id, status: admission.status });

    return admission;
  }

  static async dischargePatient(admissionId, user) {
    const admission = await Admission.findById(admissionId);
    if (!admission) {
      throw new ApiError(404, 'Admission record not found', null, 'NOT_FOUND');
    }

    admission.status = 'DISCHARGED';
    admission.dischargedAt = new Date();
    await admission.save();
    socketManager.emitToBranch(admission.branchId, 'workflow:pending_changed', { resourceId: admission._id, status: admission.status });

    if (admission.bedId) {
      const bed = await Bed.findById(admission.bedId);
      if (bed) {
        bed.status = BED_STATUS.AVAILABLE;
        bed.currentPatientId = null;
        await bed.save();
      }
    } else if (admission.bedNumber) {
      const bed = await Bed.findOne({ branchId: admission.branchId, bedNumber: admission.bedNumber });
      if (bed) {
        bed.status = BED_STATUS.AVAILABLE;
        bed.currentPatientId = null;
        await bed.save();
      }
    }

    return admission;
  }
}
