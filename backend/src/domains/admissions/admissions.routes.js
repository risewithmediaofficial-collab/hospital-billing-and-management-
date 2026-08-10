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

const router = Router();

router.use(verifyJwt);

router.post('/request', requestAdmission);
router.get('/', getAdmissions);
router.patch('/:id/allocate-bed', allocateBed);
router.patch('/:id/discharge', dischargePatient);
// Care team management
router.post('/:id/care-team', assignCareTeam);
router.get('/:id/care-team', getCareTeam);
// Admission history for a patient
router.get('/history/:uhid', getAdmissionHistory);

export default router;
