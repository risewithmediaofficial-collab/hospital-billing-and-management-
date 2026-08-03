import { PharmacyService } from './pharmacy.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const getPrescriptions = async (req, res, next) => {
  try { return sendSuccess(res, 200, 'Prescriptions retrieved', await PharmacyService.getPrescriptions(req.user)); }
  catch (error) { next(error); }
};

export const dispensePrescription = async (req, res, next) => {
  try { return sendSuccess(res, 200, 'Prescription dispensed', await PharmacyService.dispense(req.params.id, req.user)); }
  catch (error) { next(error); }
};
