import { Router } from 'express';
import {
  createInvoice,
  processPayment,
  getInvoices,
  getReceipts,
  getDeletedReceipts,
  deleteReceipt,
  deleteInvoice,
  getUnpaidInvoices,
  calculateStayCharges,
} from './billing.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';

const router = Router();

router.use(verifyJwt);

router.get('/unpaid-invoices', getUnpaidInvoices);
router.get('/inpatient-stay-charges/:admissionId', calculateStayCharges);
router.post('/invoices', createInvoice);
router.get('/invoices', getInvoices);
router.delete('/invoices/:id', deleteInvoice);
router.post('/invoices/:id/cancel', deleteInvoice);
router.post('/payments/receipts', processPayment);
router.get('/receipts', getReceipts);
router.get('/deleted-receipts', getDeletedReceipts);
router.delete('/receipts/:id', deleteReceipt);
router.post('/receipts/:id/cancel', deleteReceipt);

export default router;
