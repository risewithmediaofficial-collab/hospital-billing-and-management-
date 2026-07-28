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

export const getReceipts = async (req, res, next) => {
  try {
    const receipts = await BillingService.getReceipts(req.user);
    return sendSuccess(res, 200, 'Receipts retrieved successfully', receipts);
  } catch (error) {
    next(error);
  }
};
