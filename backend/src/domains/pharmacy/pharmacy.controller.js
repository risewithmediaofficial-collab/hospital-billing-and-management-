import { PharmacyService } from './pharmacy.service.js';
import { NurseTasksService } from './nurse-tasks.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const getMedicines = async (req, res, next) => {
  try {
    const medicines = await PharmacyService.getMedicines(req.user, req.query);
    return sendSuccess(res, 200, 'Medicines retrieved successfully', medicines);
  } catch (error) {
    next(error);
  }
};

export const createMedicine = async (req, res, next) => {
  try {
    const medicine = await PharmacyService.createMedicine(req.body, req.user);
    return sendSuccess(res, 201, 'Medicine created successfully', medicine);
  } catch (error) {
    next(error);
  }
};

export const updateMedicine = async (req, res, next) => {
  try {
    const medicine = await PharmacyService.updateMedicine(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, 'Medicine updated successfully', medicine);
  } catch (error) {
    next(error);
  }
};

export const getBatches = async (req, res, next) => {
  try {
    const batches = await PharmacyService.getBatches(req.user, req.query);
    return sendSuccess(res, 200, 'Medicine batches retrieved', batches);
  } catch (error) {
    next(error);
  }
};

export const getSubstitutions = async (req, res, next) => {
  try {
    const subs = await PharmacyService.getSubstitutions(req.user, req.query);
    return sendSuccess(res, 200, 'Substitutions retrieved', subs);
  } catch (error) {
    next(error);
  }
};

export const addBatch = async (req, res, next) => {
  try {
    const batch = await PharmacyService.addBatch(req.body, req.user);
    return sendSuccess(res, 201, 'Stock batch added successfully', batch);
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (req, res, next) => {
  try {
    const adjustment = await PharmacyService.adjustStock(req.body, req.user);
    return sendSuccess(res, 200, 'Stock adjusted successfully', adjustment);
  } catch (error) {
    next(error);
  }
};

export const transferStock = async (req, res, next) => {
  try {
    const transfer = await PharmacyService.transferStock(req.body, req.user);
    return sendSuccess(res, 200, 'Stock transferred successfully', transfer);
  } catch (error) {
    next(error);
  }
};

export const getDashboardAlerts = async (req, res, next) => {
  try {
    const alerts = await PharmacyService.getDashboardAlerts(req.user);
    return sendSuccess(res, 200, 'Dashboard alerts retrieved', alerts);
  } catch (error) {
    next(error);
  }
};

export const getStockAdjustments = async (req, res, next) => {
  try {
    const adjustments = await PharmacyService.getStockAdjustments(req.user);
    return sendSuccess(res, 200, 'Stock movements retrieved', adjustments);
  } catch (error) {
    next(error);
  }
};

export const getPrescriptions = async (req, res, next) => {
  try {
    const prescriptions = await PharmacyService.getPrescriptions(req.user, req.query);
    return sendSuccess(res, 200, 'Prescriptions retrieved', prescriptions);
  } catch (error) {
    next(error);
  }
};

export const dispensePrescription = async (req, res, next) => {
  try {
    const result = await PharmacyService.dispense(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, 'Prescription dispensed successfully', result);
  } catch (error) {
    next(error);
  }
};

export const requestSubstitution = async (req, res, next) => {
  try {
    const request = await PharmacyService.requestSubstitution(req.body, req.user);
    return sendSuccess(res, 201, 'Substitution requested', request);
  } catch (error) {
    next(error);
  }
};

export const respondSubstitution = async (req, res, next) => {
  try {
    const result = await PharmacyService.respondSubstitution(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, 'Substitution response recorded', result);
  } catch (error) {
    next(error);
  }
};

export const acknowledgeSubstitution = async (req, res, next) => {
  try {
    const result = await PharmacyService.acknowledgeSubstitution(req.params.id, req.user);
    return sendSuccess(res, 200, 'Substitution acknowledged', result);
  } catch (error) {
    next(error);
  }
};

export const getPendingSubstitutions = async (req, res, next) => {
  try {
    const pending = await PharmacyService.getPendingSubstitutions(req.user);
    return sendSuccess(res, 200, 'Pending substitutions retrieved', pending);
  } catch (error) {
    next(error);
  }
};

// --- NURSE TASKS CONTROLLERS ---

export const getNurseTasks = async (req, res, next) => {
  try {
    const tasks = await NurseTasksService.getNurseTasks(req.user, req.query);
    return sendSuccess(res, 200, 'Nurse tasks retrieved', tasks);
  } catch (error) {
    next(error);
  }
};

export const getAvailableNurses = async (req, res, next) => {
  try {
    const nurses = await NurseTasksService.getAvailableNurses(req.user);
    return sendSuccess(res, 200, 'Available nurses retrieved', nurses);
  } catch (error) {
    next(error);
  }
};

export const updateNurseTaskStatus = async (req, res, next) => {
  try {
    const task = await NurseTasksService.updateTaskStatus(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, 'Nurse task status updated', task);
  } catch (error) {
    next(error);
  }
};

export const createNurseTask = async (req, res, next) => {
  try {
    const task = await NurseTasksService.createDirectNurseTask(req.body, req.user);
    return sendSuccess(res, 201, 'Injection / Nurse task requested successfully', task);
  } catch (error) {
    next(error);
  }
};
