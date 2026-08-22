import { Router } from 'express';
import {
  registerPatient,
  checkDuplicatePatient,
  searchGlobalPatient,
  getPatients,
  getPatientByUhid
} from './patients.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { requireAssignedRole } from '../../middleware/permissions.js';

const router = Router();

router.use(verifyJwt);

router.post('/check-duplicate', requireAssignedRole('RECEPTIONIST', 'OPD_STAFF'), checkDuplicatePatient);
router.get('/global/search', searchGlobalPatient);
router.post('/', requireAssignedRole('RECEPTIONIST', 'OPD_STAFF'), registerPatient);
router.get('/', getPatients);
router.get('/:uhid', getPatientByUhid);

export default router;
