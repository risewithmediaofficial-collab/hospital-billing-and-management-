import { Router } from 'express';
import {
  requestAdmission,
  getAdmissions,
  allocateBed,
  dischargePatient,
  assignCareTeam,
  getCareTeam,
  getAdmissionHistory
} from './admissions.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { requireAssignedRole } from '../../middleware/permissions.js';

const router = Router();

router.use(verifyJwt);

router.post('/request', requireAssignedRole('DOCTOR'), requestAdmission);
router.get('/', getAdmissions);
router.patch('/:id/allocate-bed', requireAssignedRole('NURSE_INCHARGE', 'IPD_STAFF'), allocateBed);
router.patch('/:id/discharge', requireAssignedRole('DOCTOR', 'NURSE_INCHARGE', 'IPD_STAFF'), dischargePatient);
// Care team management
router.post('/:id/care-team', requireAssignedRole('NURSE_INCHARGE', 'IPD_STAFF'), assignCareTeam);
router.get('/:id/care-team', getCareTeam);
// Admission history for a patient
router.get('/history/:uhid', getAdmissionHistory);

export default router;
