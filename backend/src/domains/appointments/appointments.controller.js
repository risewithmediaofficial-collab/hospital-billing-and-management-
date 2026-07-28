import { AppointmentsService } from './appointments.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const issueToken = async (req, res, next) => {
  try {
    const token = await AppointmentsService.issueToken(req.body, req.user);
    return sendSuccess(res, 201, 'OPD token issued successfully', token);
  } catch (error) {
    next(error);
  }
};

export const getOpdQueue = async (req, res, next) => {
  try {
    const queue = await AppointmentsService.getOpdQueue(req.user, req.query.doctorId);
    return sendSuccess(res, 200, 'OPD queue retrieved successfully', queue);
  } catch (error) {
    next(error);
  }
};

export const updateTokenStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await AppointmentsService.updateTokenStatus(id, status, req.user);
    return sendSuccess(res, 200, `Token status updated to ${status}`, updated);
  } catch (error) {
    next(error);
  }
};
