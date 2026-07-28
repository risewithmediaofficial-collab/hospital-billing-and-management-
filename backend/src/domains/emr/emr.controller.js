import { EmrService } from './emr.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const createConsultation = async (req, res, next) => {
  try {
    const result = await EmrService.createConsultation(req.body, req.user);
    return sendSuccess(res, 201, 'Consultation and E-Prescription recorded successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getPatientEhr = async (req, res, next) => {
  try {
    const ehr = await EmrService.getPatientEhr(req.params.patientId, req.user);
    return sendSuccess(res, 200, 'Patient EHR history retrieved', ehr);
  } catch (error) {
    next(error);
  }
};
