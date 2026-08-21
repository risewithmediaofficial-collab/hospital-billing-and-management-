import { Router } from 'express';
import {
  createInvoice,
  processPayment,
  getInvoices,
  getDoctorReviewQueries,
  getReceipts,
  getDeletedReceipts,
  deleteReceipt,
  deleteInvoice,
  getUnpaidInvoices,
  calculateStayCharges,
  returnInvoiceToDepartment,
} from './billing.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';

const router = Router();

router.use(verifyJwt);

router.get('/unpaid-invoices', getUnpaidInvoices);
router.get('/inpatient-stay-charges/:admissionId', calculateStayCharges);
router.post('/invoices', createInvoice);
router.get('/invoices', getInvoices);
router.get('/doctor-review-queries', getDoctorReviewQueries);
router.post('/invoices/:id/return-to-department', returnInvoiceToDepartment);
router.delete('/invoices/:id', deleteInvoice);
router.post('/invoices/:id/cancel', deleteInvoice);
router.post('/payments/receipts', processPayment);
router.get('/receipts', getReceipts);
router.get('/deleted-receipts', getDeletedReceipts);
router.delete('/receipts/:id', deleteReceipt);
router.post('/receipts/:id/cancel', deleteReceipt);

export default router;
