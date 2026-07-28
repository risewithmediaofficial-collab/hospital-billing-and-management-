import { Router } from 'express';
import {
  requestInvestigation,
  updateStatus,
  uploadReport,
  getOrders,
  getPatientReports,
  cancelInvestigation,
  requestCorrection,
  approveCharge,
  updateDepartmentCharge,
} from './diagnostics.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';

const router = Router();

router.use(verifyJwt);

router.post('/request', requestInvestigation);
router.get('/orders', getOrders);
router.patch('/orders/:id/status', updateStatus);
router.post('/orders/:id/report', uploadReport);
router.patch('/orders/:id/charge', updateDepartmentCharge);
router.post('/orders/:id/cancel', cancelInvestigation);
router.post('/orders/:id/request-correction', requestCorrection);
router.post('/orders/:id/approve-charge', approveCharge);
router.get('/patient/:patientId', getPatientReports);

export default router;
