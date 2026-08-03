import { Prescription } from '../../models/Prescription.js';
import { ApiError } from '../../utils/apiError.js';
import { socketManager } from '../../events/socketManager.js';

export class PharmacyService {
  static async getPrescriptions(user) {
    const filter = { hospitalId: user.hospitalId };
    if (user.branchId) filter.branchId = user.branchId;
    return Prescription.find(filter).populate('patientId').populate('doctorId', 'name').sort({ createdAt: -1 });
  }

  static async dispense(prescriptionId, user) {
    const prescription = await Prescription.findOne({ _id: prescriptionId, hospitalId: user.hospitalId });
    if (!prescription) throw new ApiError(404, 'Prescription not found', null, 'NOT_FOUND');
    prescription.dispenseStatus = 'DISPENSED';
    await prescription.save();
    socketManager.emitToBranch(prescription.branchId, 'workflow:pending_changed', { resourceId: prescription._id, status: prescription.dispenseStatus });
    return prescription;
  }
}
