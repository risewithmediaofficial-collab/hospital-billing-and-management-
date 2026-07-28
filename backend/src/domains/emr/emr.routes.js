import { Router } from 'express';
import { createConsultation, getPatientEhr } from './emr.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';

const router = Router();

router.use(verifyJwt);

router.post('/consultations', createConsultation);
router.get('/patient/:patientId', getPatientEhr);

export default router;
