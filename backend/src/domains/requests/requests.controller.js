import { RequestsService } from './requests.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const createRequest = async (req, res, next) => {
  try {
    const request = await RequestsService.createRequest(req.body, req.user);
    return sendSuccess(res, 201, 'Patient care request created successfully', request);
  } catch (error) {
    next(error);
  }
};

export const getActiveRequests = async (req, res, next) => {
  try {
    const requests = await RequestsService.getActiveRequests(req.user, req.query.category || null);
    return sendSuccess(res, 200, 'Active patient requests retrieved', requests);
  } catch (error) {
    next(error);
  }
};

export const updateRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await RequestsService.updateRequestStatus(id, req.body, req.user);
    return sendSuccess(res, 200, `Request status updated to ${req.body.status}`, updated);
  } catch (error) {
    next(error);
  }
};
