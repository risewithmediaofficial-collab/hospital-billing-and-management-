import { BedsService } from './beds.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const getBedMatrix = async (req, res, next) => {
  try {
    const beds = await BedsService.getBedMatrix(req.user);
    return sendSuccess(res, 200, 'Bed matrix retrieved successfully', beds);
  } catch (error) {
    next(error);
  }
};

export const updateBedStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, patientId } = req.body;
    const bed = await BedsService.updateBedStatus(id, status, patientId, req.user);
    return sendSuccess(res, 200, 'Bed status updated successfully', bed);
  } catch (error) {
    next(error);
  }
};
