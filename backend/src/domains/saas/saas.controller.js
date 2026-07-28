import { SaasService } from './saas.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const registerHospital = async (req, res, next) => {
  try {
    const result = await SaasService.registerHospital(req.body);
    return sendSuccess(res, 201, 'Hospital SaaS registration application submitted successfully! Pending Super Admin Approval.', result);
  } catch (error) {
    next(error);
  }
};

export const getAllHospitals = async (req, res, next) => {
  try {
    const hospitals = await SaasService.getAllHospitals(req.user);
    return sendSuccess(res, 200, 'SaaS Hospital Tenants retrieved successfully', hospitals);
  } catch (error) {
    next(error);
  }
};

export const approveHospital = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await SaasService.approveHospital(id, req.user);
    return sendSuccess(res, 200, 'Hospital tenant approved & Hospital Admin account provisioned!', result);
  } catch (error) {
    next(error);
  }
};

export const updateHospitalStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await SaasService.updateHospitalStatus(id, status, req.user);
    return sendSuccess(res, 200, `Hospital tenant status updated to ${status}`, updated);
  } catch (error) {
    next(error);
  }
};
