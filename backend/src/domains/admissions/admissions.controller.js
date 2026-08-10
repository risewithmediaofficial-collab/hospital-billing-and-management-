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

export const assignCareTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignments = req.body.assignments || req.body;
    const result = await AdmissionsService.assignCareTeam(id, Array.isArray(assignments) ? assignments : [assignments], req.user);
    return sendSuccess(res, 200, 'Care team updated successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getCareTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const careTeam = await AdmissionsService.getCareTeam(id);
    return sendSuccess(res, 200, 'Care team retrieved', careTeam);
  } catch (error) {
    next(error);
  }
};

export const getAdmissionHistory = async (req, res, next) => {
  try {
    const { Admission } = await import('../../models/Admission.js');
    const { uhid } = req.params;
    const admissions = await Admission.find({ uhid: uhid.toUpperCase() })
      .sort({ admissionNumber: 1 })
      .populate('doctorId', 'name specialization')
      .populate('assignedNurseId', 'name role')
      .select('admissionNumber admissionReference status admittedAt dischargedAt wardType bedNumber targetWardName admissionReason careTeamAssigned');
    return sendSuccess(res, 200, 'Admission history retrieved', admissions);
  } catch (error) {
    next(error);
  }
};
