import { BillingService } from './billing.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const getUnpaidInvoices = async (req, res, next) => {
  try {
    const invoices = await BillingService.getUnpaidInvoices(req.user);
    return sendSuccess(res, 200, 'Unpaid invoices retrieved successfully', invoices);
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const invoice = await BillingService.createInvoice(req.body, req.user);
    return sendSuccess(res, 201, 'Invoice generated successfully', invoice);
  } catch (error) {
    next(error);
  }
};

export const processPayment = async (req, res, next) => {
  try {
    const result = await BillingService.processPayment(req.body, req.user);
    return sendSuccess(res, 200, 'Payment processed & receipt printed', result);
  } catch (error) {
    next(error);
  }
};

export const getInvoices = async (req, res, next) => {
  try {
    const invoices = await BillingService.getInvoices(req.user);
    return sendSuccess(res, 200, 'Invoices retrieved successfully', invoices);
  } catch (error) {
    next(error);
  }
};

export const getDoctorReviewQueries = async (req, res, next) => {
  try {
    const invoices = await BillingService.getDoctorReviewQueries(req.user);
    return sendSuccess(res, 200, 'Doctor billing review queries retrieved', invoices);
  } catch (error) {
    next(error);
  }
};

export const respondToDoctorReviewQuery = async (req, res, next) => {
  try {
    const result = await BillingService.respondToDoctorReviewQuery(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, 'Billing query resolved and returned to the billing desk', result);
  } catch (error) {
    next(error);
  }
};

export const getReceipts = async (req, res, next) => {
  try {
    const receipts = await BillingService.getReceipts(req.user, req.query);
    return sendSuccess(res, 200, 'Receipts retrieved successfully', receipts);
  } catch (error) {
    next(error);
  }
};

export const getDeletedReceipts = async (req, res, next) => {
  try {
    const deletedReceipts = await BillingService.getDeletedReceipts(req.user);
    return sendSuccess(res, 200, 'Deleted receipts archive retrieved successfully', deletedReceipts);
  } catch (error) {
    next(error);
  }
};

export const deleteReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletionReason = req.body?.deletionReason || req.body?.reason || req.query?.deletionReason || req.query?.reason || 'Cancelled by staff';
    const result = await BillingService.deleteReceipt(id, deletionReason, req.user);
    return sendSuccess(res, 200, 'Bill deleted successfully', result);
  } catch (error) {
    next(error);
  }
};

export const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletionReason = req.body?.deletionReason || req.body?.reason || req.query?.deletionReason || req.query?.reason || 'Cancelled by staff';
    const result = await BillingService.deleteInvoice(id, deletionReason, req.user);
    return sendSuccess(res, 200, 'Pending bill / invoice cancelled successfully', result);
  } catch (error) {
    next(error);
  }
};

export const calculateStayCharges = async (req, res, next) => {
  try {
    const { admissionId } = req.params;
    const result = await BillingService.calculateInpatientStayCharges(admissionId, req.user);
    return sendSuccess(res, 200, 'Inpatient stay accommodation charges calculated', result);
  } catch (error) {
    next(error);
  }
};

export const returnInvoiceToDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await BillingService.returnInvoiceToDepartment(id, req.body, req.user);
    return sendSuccess(res, 200, result.message, result);
  } catch (error) {
    next(error);
  }
};

