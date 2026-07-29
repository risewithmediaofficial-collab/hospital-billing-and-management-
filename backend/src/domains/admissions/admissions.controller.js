import { AdmissionsService } from './admissions.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const requestAdmission = async (req, res, next) => {
  try {
    const admission = await AdmissionsService.requestAdmission(req.body, req.user);
    return sendSuccess(res, 201, 'IPD Admission requisition sent to Nurse station', admission);
  } catch (error) {
    next(error);
  }
};

export const getAdmissions = async (req, res, next) => {
  try {
    const admissions = await AdmissionsService.getAdmissions(req.user);
    return sendSuccess(res, 200, 'IPD Admissions retrieved successfully', admissions);
  } catch (error) {
    next(error);
  }
};

export const allocateBed = async (req, res, next) => {
  try {
    const { id } = req.params;
    const allocated = await AdmissionsService.allocateBed(id, req.body, req.user);
    return sendSuccess(res, 200, 'Bed allocated & patient admitted to IPD ward', allocated);
  } catch (error) {
    next(error);
  }
};

export const dischargePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const discharged = await AdmissionsService.dischargePatient(id, req.user);
    return sendSuccess(res, 200, 'Patient discharged & bed liberated to AVAILABLE', discharged);
  } catch (error) {
    next(error);
  }
};
