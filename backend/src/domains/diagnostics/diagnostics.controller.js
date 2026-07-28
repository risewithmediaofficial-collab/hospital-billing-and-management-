import { DiagnosticsService } from './diagnostics.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const requestInvestigation = async (req, res, next) => {
  try {
    const newOrder = await DiagnosticsService.requestInvestigation(req.body, req.user);
    return sendSuccess(res, 201, `Investigation '${newOrder.testName}' requested and sent to department successfully!`, newOrder);
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const updated = await DiagnosticsService.updateStatus(id, status, notes, req.user);
    return sendSuccess(res, 200, `Investigation status updated to '${status}'`, updated);
  } catch (error) {
    next(error);
  }
};

export const uploadReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await DiagnosticsService.uploadReport(id, req.body, req.user);
    return sendSuccess(res, 200, 'Diagnostic report uploaded and sent to Doctor & Patient Portal!', updated);
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const orders = await DiagnosticsService.getOrders(req.query, req.user);
    return sendSuccess(res, 200, 'Diagnostic orders retrieved successfully', orders);
  } catch (error) {
    next(error);
  }
};

export const getPatientReports = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const reports = await DiagnosticsService.getPatientReports(patientId, req.user);
    return sendSuccess(res, 200, 'Patient diagnostic reports retrieved successfully', reports);
  } catch (error) {
    next(error);
  }
};

export const cancelInvestigation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;
    const order = await DiagnosticsService.cancelInvestigation(id, cancellationReason, req.user);
    return sendSuccess(res, 200, 'Department request cancelled successfully', order);
  } catch (error) {
    next(error);
  }
};

export const requestCorrection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { correctionNote } = req.body;
    const order = await DiagnosticsService.requestCorrection(id, correctionNote, req.user);
    return sendSuccess(res, 200, 'Correction note sent back to department', order);
  } catch (error) {
    next(error);
  }
};

export const approveCharge = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await DiagnosticsService.approveCharge(id, req.user);
    return sendSuccess(res, 200, 'Department charge approved by Doctor', order);
  } catch (error) {
    next(error);
  }
};

export const updateDepartmentCharge = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await DiagnosticsService.updateDepartmentCharge(id, req.body, req.user);
    return sendSuccess(res, 200, 'Department charge updated successfully', order);
  } catch (error) {
    next(error);
  }
};

