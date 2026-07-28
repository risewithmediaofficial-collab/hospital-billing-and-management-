import { Router } from 'express';
import { createInvoice, processPayment, getInvoices, getReceipts, getUnpaidInvoices } from './billing.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';

const router = Router();

router.use(verifyJwt);

router.get('/unpaid-invoices', getUnpaidInvoices);
router.post('/invoices', createInvoice);
router.get('/invoices', getInvoices);
router.post('/payments/receipts', processPayment);
router.get('/receipts', getReceipts);

export default router;
