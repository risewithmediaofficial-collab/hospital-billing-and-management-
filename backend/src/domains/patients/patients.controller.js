import { PatientsService } from './patients.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const registerPatient = async (req, res, next) => {
  try {
    const patient = await PatientsService.registerPatient(req.body, req.user);
    return sendSuccess(res, 201, 'Patient registered successfully', patient);
  } catch (error) {
    next(error);
  }
};

export const getPatients = async (req, res, next) => {
  try {
    const query = req.query.q || '';
    const hospitalId = req.query.hospitalId || null;
    const patients = await PatientsService.getPatients(req.user, query, hospitalId);
    return sendSuccess(res, 200, 'Patients retrieved successfully', patients);
  } catch (error) {
    next(error);
  }
};

export const getPatientByUhid = async (req, res, next) => {
  try {
    const patient = await PatientsService.getPatientByUhid(req.params.uhid, req.user);
    return sendSuccess(res, 200, 'Patient record retrieved successfully', patient);
  } catch (error) {
    next(error);
  }
};
