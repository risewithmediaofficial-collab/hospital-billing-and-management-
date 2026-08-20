import { Router } from 'express';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { getPendingWork, getHospitalDataJourney } from './workflow.controller.js';

const router = Router();
router.get('/pending', verifyJwt, getPendingWork);
router.get('/tracker', verifyJwt, getHospitalDataJourney);
export default router;
