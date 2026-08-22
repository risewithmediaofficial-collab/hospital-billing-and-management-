import { Router } from 'express';
import {
  createInvoice,
  processPayment,
  getInvoices,
  getDoctorReviewQueries,
  respondToDoctorReviewQuery,
  getReceipts,
  getDeletedReceipts,
  deleteReceipt,
  deleteInvoice,
  getUnpaidInvoices,
  calculateStayCharges,
  returnInvoiceToDepartment,
} from './billing.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { requireAssignedRole } from '../../middleware/permissions.js';

const router = Router();

router.use(verifyJwt);

router.get('/unpaid-invoices', getUnpaidInvoices);
router.get('/inpatient-stay-charges/:admissionId', calculateStayCharges);
router.post('/invoices', requireAssignedRole('CASHIER', 'BILLING_STAFF'), createInvoice);
router.get('/invoices', getInvoices);
router.get('/doctor-review-queries', getDoctorReviewQueries);
router.post('/invoices/:id/doctor-review-response', requireAssignedRole('DOCTOR'), respondToDoctorReviewQuery);
router.post('/invoices/:id/return-to-department', requireAssignedRole('CASHIER', 'BILLING_STAFF'), returnInvoiceToDepartment);
router.delete('/invoices/:id', requireAssignedRole('CASHIER', 'BILLING_STAFF'), deleteInvoice);
router.post('/invoices/:id/cancel', requireAssignedRole('CASHIER', 'BILLING_STAFF'), deleteInvoice);
router.post('/payments/receipts', requireAssignedRole('CASHIER', 'BILLING_STAFF'), processPayment);
router.get('/receipts', getReceipts);
router.get('/deleted-receipts', getDeletedReceipts);
router.delete('/receipts/:id', requireAssignedRole('CASHIER', 'BILLING_STAFF'), deleteReceipt);
router.post('/receipts/:id/cancel', requireAssignedRole('CASHIER', 'BILLING_STAFF'), deleteReceipt);

export default router;
