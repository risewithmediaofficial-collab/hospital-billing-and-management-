import { Bed } from '../../models/Bed.js';
import { Patient } from '../../models/Patient.js';
import { BED_STATUS } from '../../config/constants.js';
import { ApiError } from '../../utils/apiError.js';

export class BedsService {
  static async getBedMatrix(user) {
    let beds = await Bed.find({ branchId: user.branchId }).populate('currentPatientId').sort({ bedNumber: 1 });

    // Auto-seed default bed matrix if empty
    if (beds.length === 0) {
      const defaultBeds = [
        { bedNumber: 'BED-301', wardName: 'Ward 3B - Inpatient', wardType: 'GENERAL', dailyTariff: 150, status: BED_STATUS.AVAILABLE },
        { bedNumber: 'BED-302', wardName: 'Ward 3B - Inpatient', wardType: 'GENERAL', dailyTariff: 150, status: BED_STATUS.AVAILABLE },
        { bedNumber: 'BED-303', wardName: 'Ward 3B - Inpatient', wardType: 'SEMI_PRIVATE', dailyTariff: 250, status: BED_STATUS.AVAILABLE },
        { bedNumber: 'ICU-101', wardName: 'Intensive Care Unit (ICU)', wardType: 'ICU', dailyTariff: 650, status: BED_STATUS.AVAILABLE },
        { bedNumber: 'ICU-102', wardName: 'Intensive Care Unit (ICU)', wardType: 'ICU', dailyTariff: 650, status: BED_STATUS.AVAILABLE },
        { bedNumber: 'SUITE-401', wardName: 'Deluxe Suite Floor 4', wardType: 'PRIVATE', dailyTariff: 500, status: BED_STATUS.AVAILABLE },
      ];

      beds = await Bed.insertMany(
        defaultBeds.map((b) => ({
          hospitalId: user.hospitalId,
          branchId: user.branchId,
          ...b,
        }))
      );
    }

    return beds;
  }

  static async updateBedStatus(bedId, status, patientId, user) {
    const bed = await Bed.findById(bedId);
    if (!bed) {
      throw new ApiError(404, 'Bed record not found', null, 'NOT_FOUND');
    }

    bed.status = status;
    if (patientId) {
      bed.currentPatientId = patientId;
    } else if (status === BED_STATUS.AVAILABLE) {
      bed.currentPatientId = null;
    }

    await bed.save();
    return await Bed.findById(bedId).populate('currentPatientId');
  }
}
