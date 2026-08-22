import { Router } from 'express';
import { createConsultation, getPatientEhr, getFollowUps } from './emr.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { requireAssignedRole } from '../../middleware/permissions.js';

const router = Router();

router.use(verifyJwt);

router.post('/consultations', requireAssignedRole('DOCTOR'), createConsultation);
router.get('/follow-ups', getFollowUps);
router.get('/patient/:patientId', getPatientEhr);
router.get('/patient-history/:patientId', getPatientEhr);

export default router;
