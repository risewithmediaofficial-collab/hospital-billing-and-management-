import { WorkflowService } from './workflow.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const getPendingWork = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'Pending work retrieved', await WorkflowService.getPendingWork(req.user));
  } catch (error) {
    next(error);
  }
};

export const dismissTask = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'Task dismissed', await WorkflowService.dismissTask(req.params.id, req.user));
  } catch (error) {
    next(error);
  }
};

export const dismissAllTasks = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'All tasks dismissed', await WorkflowService.dismissAllTasks(req.user));
  } catch (error) {
    next(error);
  }
};
