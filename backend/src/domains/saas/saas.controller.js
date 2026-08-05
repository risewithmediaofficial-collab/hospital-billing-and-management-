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

export const updateHospitalConfiguration = async (req, res, next) => {
  try {
    const updated = await SaasService.updateHospitalConfiguration(
      req.params.id,
      req.body,
      req.user,
      req,
    );
    return sendSuccess(res, 200, 'Hospital configuration updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

export const getPlatformMetrics = async (req, res, next) => {
  try {
    const metrics = await SaasService.getPlatformMetrics();
    return sendSuccess(res, 200, 'Platform metrics retrieved', metrics);
  } catch (error) {
    next(error);
  }
};

export const getHospitalDetail = async (req, res, next) => {
  try {
    const result = await SaasService.getHospitalDetail(req.params.id);
    return sendSuccess(res, 200, 'Hospital detail retrieved', result);
  } catch (error) {
    next(error);
  }
};

export const getHospitalAdminOverview = async (req, res, next) => {
  try {
    const overview = await SaasService.getAllHospitalAdminOverview();
    return sendSuccess(res, 200, 'Hospital administrator overview retrieved', overview);
  } catch (error) {
    next(error);
  }
};

export const globalSearch = async (req, res, next) => {
  try {
    const { q, hospitalId, role, status } = req.query;
    const results = await SaasService.globalSearch(q, { hospitalId, role, status });
    return sendSuccess(res, 200, 'Search results retrieved', results);
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const { hospitalId, module, limit } = req.query;
    const logs = await SaasService.getAuditLogs({ hospitalId, module, limit: limit ? Number(limit) : 50 });
    return sendSuccess(res, 200, 'Audit logs retrieved', logs);
  } catch (error) {
    next(error);
  }
};

export const getHospitalsWithStats = async (req, res, next) => {
  try {
    const hospitals = await SaasService.getAllHospitalsWithStats();
    return sendSuccess(res, 200, 'Hospitals with stats retrieved', hospitals);
  } catch (error) {
    next(error);
  }
};

export const deleteHospital = async (req, res, next) => {
  try {
    const deleted = await SaasService.deleteHospital(req.params.id);
    return sendSuccess(res, 200, 'Hospital tenant soft-deleted successfully', deleted);
  } catch (error) {
    next(error);
  }
};

export const restoreHospital = async (req, res, next) => {
  try {
    const restored = await SaasService.restoreHospital(req.params.id);
    return sendSuccess(res, 200, 'Hospital tenant restored successfully', restored);
  } catch (error) {
    next(error);
  }
};

export const getAllSubscriptionPlans = async (req, res, next) => {
  try {
    const plans = await SaasService.getAllSubscriptionPlans();
    return sendSuccess(res, 200, 'Subscription plans retrieved', plans);
  } catch (error) { next(error); }
};

export const createSubscriptionPlan = async (req, res, next) => {
  try {
    const plan = await SaasService.createSubscriptionPlan(req.body, req.user);
    return sendSuccess(res, 201, 'Subscription plan created successfully', plan);
  } catch (error) { next(error); }
};

export const updateSubscriptionPlan = async (req, res, next) => {
  try {
    const plan = await SaasService.updateSubscriptionPlan(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, 'Subscription plan updated successfully', plan);
  } catch (error) { next(error); }
};

export const extendHospitalTrial = async (req, res, next) => {
  try {
    const { extraDays } = req.body;
    const hospital = await SaasService.extendHospitalTrial(req.params.id, extraDays || 7, req.user);
    return sendSuccess(res, 200, `Hospital free trial extended by ${extraDays || 7} days.`, hospital);
  } catch (error) { next(error); }
};

export const assignPlanToHospital = async (req, res, next) => {
  try {
    const hospital = await SaasService.assignPlanToHospital(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, 'Subscription plan assigned to hospital successfully', hospital);
  } catch (error) { next(error); }
};

