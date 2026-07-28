import { Router } from 'express';
import { registerPatient, getPatients, getPatientByUhid } from './patients.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';

const router = Router();

router.use(verifyJwt);

router.post('/', registerPatient);
router.get('/', getPatients);
router.get('/:uhid', getPatientByUhid);

export default router;
