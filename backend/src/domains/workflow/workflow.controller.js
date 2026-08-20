import { WorkflowService } from './workflow.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const getPendingWork = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'Pending work retrieved', await WorkflowService.getPendingWork(req.user));
  } catch (error) {
    next(error);
  }
};

export const getHospitalDataJourney = async (req, res, next) => {
  try {
    const data = await WorkflowService.getHospitalDataJourney(req.query, req.user);
    return sendSuccess(res, 200, 'Hospital data journey retrieved', data);
  } catch (error) {
    next(error);
  }
};
