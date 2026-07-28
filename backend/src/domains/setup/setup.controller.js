import { SetupService } from './setup.service.js';
import { hospitalSetupSchema } from './setup.validator.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

export const getStatus = async (req, res, next) => {
  try {
    const status = await SetupService.checkSetupStatus();
    return sendSuccess(res, 200, 'System setup status retrieved', status);
  } catch (error) {
    next(error);
  }
};

export const registerHospital = async (req, res, next) => {
  try {
    const validation = hospitalSetupSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 422, 'Validation Error', validation.error.errors, 'VALIDATION_ERROR');
    }

    const result = await SetupService.registerHospitalTenant(validation.data);
    return sendSuccess(res, 201, 'Hospital tenant and initial branch created successfully', result);
  } catch (error) {
    next(error);
  }
};
