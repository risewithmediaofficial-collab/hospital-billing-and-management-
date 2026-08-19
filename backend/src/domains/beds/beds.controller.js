import { BedsService } from './beds.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

// --- BED MATRIX & METRICS ---
export const getBedMatrix = async (req, res, next) => {
  try {
    const beds = await BedsService.getBedMatrix(req.query, req.user);
    return sendSuccess(res, 200, 'Bed matrix retrieved successfully', beds);
  } catch (error) {
    next(error);
  }
};

export const getDashboardSummary = async (req, res, next) => {
  try {
    const summary = await BedsService.getDashboardSummary(req.user);
    return sendSuccess(res, 200, 'Bed dashboard metrics retrieved', summary);
  } catch (error) {
    next(error);
  }
};

export const getHierarchy = async (req, res, next) => {
  try {
    const hierarchy = await BedsService.getHierarchy(req.user);
    return sendSuccess(res, 200, 'Hospital bed hierarchy tree retrieved', hierarchy);
  } catch (error) {
    next(error);
  }
};

export const getOccupancyReports = async (req, res, next) => {
  try {
    const reports = await BedsService.getOccupancyReports(req.user);
    return sendSuccess(res, 200, 'Hospital occupancy analytics retrieved', reports);
  } catch (error) {
    next(error);
  }
};

// --- BEDS CRUD ---
export const createBed = async (req, res, next) => {
  try {
    const bed = await BedsService.createBed(req.body, req.user);
    return sendSuccess(res, 201, 'Bed created successfully', bed);
  } catch (error) {
    next(error);
  }
};

export const updateBed = async (req, res, next) => {
  try {
    const bed = await BedsService.updateBed(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, 'Bed updated successfully', bed);
  } catch (error) {
    next(error);
  }
};

export const deleteBed = async (req, res, next) => {
  try {
    const result = await BedsService.deleteBed(req.params.id, req.user);
    return sendSuccess(res, 200, result.message, null);
  } catch (error) {
    next(error);
  }
};

export const bulkGenerate = async (req, res, next) => {
  try {
    const result = await BedsService.bulkGenerate(req.body, req.user);
    return sendSuccess(res, 201, result.message, result);
  } catch (error) {
    next(error);
  }
};

// --- STATUS WORKFLOWS ---
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

export const reserveBed = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await BedsService.reserveBed(id, req.body, req.user);
    return sendSuccess(res, 200, 'Bed reserved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const releaseReservation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bed = await BedsService.releaseReservation(id, req.user);
    return sendSuccess(res, 200, 'Bed reservation released', bed);
  } catch (error) {
    next(error);
  }
};

export const markCleaningComplete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bed = await BedsService.markCleaningComplete(id, req.body, req.user);
    return sendSuccess(res, 200, 'Bed cleaning and sanitization completed', bed);
  } catch (error) {
    next(error);
  }
};

export const markMaintenance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bed = await BedsService.markMaintenance(id, req.body, req.user);
    return sendSuccess(res, 200, 'Bed placed under maintenance', bed);
  } catch (error) {
    next(error);
  }
};

export const repairCompleted = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bed = await BedsService.repairCompleted(id, req.user);
    return sendSuccess(res, 200, 'Bed maintenance repair completed and released to available', bed);
  } catch (error) {
    next(error);
  }
};

// --- TRANSFERS & AUDIT ---
export const transferPatient = async (req, res, next) => {
  try {
    const result = await BedsService.transferPatient(req.body, req.user);
    return sendSuccess(res, 200, result.message, result);
  } catch (error) {
    next(error);
  }
};

export const getBedHistory = async (req, res, next) => {
  try {
    const history = await BedsService.getBedHistory(req.params.id, req.user);
    return sendSuccess(res, 200, 'Bed history retrieved', history);
  } catch (error) {
    next(error);
  }
};

export const getTransferHistory = async (req, res, next) => {
  try {
    const history = await BedsService.getTransferHistory(req.user);
    return sendSuccess(res, 200, 'Patient transfer history retrieved', history);
  } catch (error) {
    next(error);
  }
};

// --- BLOCKS CRUD ---
export const getBlocks = async (req, res, next) => {
  try {
    const blocks = await BedsService.getBlocks(req.user);
    return sendSuccess(res, 200, 'Blocks retrieved', blocks);
  } catch (error) {
    next(error);
  }
};

export const createBlock = async (req, res, next) => {
  try {
    const block = await BedsService.createBlock(req.body, req.user);
    return sendSuccess(res, 201, 'Block created successfully', block);
  } catch (error) {
    next(error);
  }
};

export const updateBlock = async (req, res, next) => {
  try {
    const block = await BedsService.updateBlock(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, 'Block updated successfully', block);
  } catch (error) {
    next(error);
  }
};

export const deleteBlock = async (req, res, next) => {
  try {
    const result = await BedsService.deleteBlock(req.params.id, req.user);
    return sendSuccess(res, 200, result.message, null);
  } catch (error) {
    next(error);
  }
};

// --- FLOORS CRUD ---
export const getFloors = async (req, res, next) => {
  try {
    const floors = await BedsService.getFloors(req.user);
    return sendSuccess(res, 200, 'Floors retrieved', floors);
  } catch (error) {
    next(error);
  }
};

export const createFloor = async (req, res, next) => {
  try {
    const floor = await BedsService.createFloor(req.body, req.user);
    return sendSuccess(res, 201, 'Floor created successfully', floor);
  } catch (error) {
    next(error);
  }
};

export const updateFloor = async (req, res, next) => {
  try {
    const floor = await BedsService.updateFloor(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, 'Floor updated successfully', floor);
  } catch (error) {
    next(error);
  }
};

export const deleteFloor = async (req, res, next) => {
  try {
    const result = await BedsService.deleteFloor(req.params.id, req.user);
    return sendSuccess(res, 200, result.message, null);
  } catch (error) {
    next(error);
  }
};

// --- WARDS CRUD ---
export const getWards = async (req, res, next) => {
  try {
    const wards = await BedsService.getWards(req.user);
    return sendSuccess(res, 200, 'Wards retrieved', wards);
  } catch (error) {
    next(error);
  }
};

export const createWard = async (req, res, next) => {
  try {
    const ward = await BedsService.createWard(req.body, req.user);
    return sendSuccess(res, 201, 'Ward created successfully', ward);
  } catch (error) {
    next(error);
  }
};

export const updateWard = async (req, res, next) => {
  try {
    const ward = await BedsService.updateWard(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, 'Ward updated successfully', ward);
  } catch (error) {
    next(error);
  }
};

export const deleteWard = async (req, res, next) => {
  try {
    const result = await BedsService.deleteWard(req.params.id, req.user);
    return sendSuccess(res, 200, result.message, null);
  } catch (error) {
    next(error);
  }
};

// --- ROOMS CRUD ---
export const getRooms = async (req, res, next) => {
  try {
    const rooms = await BedsService.getRooms(req.user);
    return sendSuccess(res, 200, 'Rooms retrieved', rooms);
  } catch (error) {
    next(error);
  }
};

export const createRoom = async (req, res, next) => {
  try {
    const room = await BedsService.createRoom(req.body, req.user);
    return sendSuccess(res, 201, 'Room created successfully', room);
  } catch (error) {
    next(error);
  }
};

export const updateRoom = async (req, res, next) => {
  try {
    const room = await BedsService.updateRoom(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, 'Room updated successfully', room);
  } catch (error) {
    next(error);
  }
};

export const deleteRoom = async (req, res, next) => {
  try {
    const result = await BedsService.deleteRoom(req.params.id, req.user);
    return sendSuccess(res, 200, result.message, null);
  } catch (error) {
    next(error);
  }
};
