import { Router } from 'express';
import {
  registerPatient,
  checkDuplicatePatient,
  searchGlobalPatient,
  getPatients,
  getPatientByUhid
} from './patients.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';

const router = Router();

router.use(verifyJwt);

router.post('/check-duplicate', checkDuplicatePatient);
router.get('/global/search', searchGlobalPatient);
router.post('/', registerPatient);
router.get('/', getPatients);
router.get('/:uhid', getPatientByUhid);

export default router;
