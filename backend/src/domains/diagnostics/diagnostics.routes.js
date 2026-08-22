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
import { requireAssignedRole } from '../../middleware/permissions.js';

const router = Router();

router.use(verifyJwt);

router.post('/request', requireAssignedRole('DOCTOR'), requestInvestigation);
router.get('/orders', getOrders);
router.patch('/orders/:id/status', requireAssignedRole('LAB_TECH', 'LABORATORY_STAFF', 'RADIOLOGIST', 'RADIOLOGY_STAFF'), updateStatus);
router.post('/orders/:id/report', requireAssignedRole('LAB_TECH', 'LABORATORY_STAFF', 'RADIOLOGIST', 'RADIOLOGY_STAFF'), uploadReport);
router.patch('/orders/:id/charge', requireAssignedRole('LAB_TECH', 'LABORATORY_STAFF', 'RADIOLOGIST', 'RADIOLOGY_STAFF'), updateDepartmentCharge);
router.post('/orders/:id/cancel', requireAssignedRole('DOCTOR'), cancelInvestigation);
router.post('/orders/:id/request-correction', requireAssignedRole('CASHIER', 'BILLING_STAFF'), requestCorrection);
router.post('/orders/:id/approve-charge', requireAssignedRole('DOCTOR'), approveCharge);
router.get('/patient/:patientId', getPatientReports);

export default router;
