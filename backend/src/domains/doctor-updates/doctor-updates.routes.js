import { Router } from 'express';
import { DoctorUpdatesController } from './doctor-updates.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';

const router = Router();

router.use(verifyJwt);

router.post('/', DoctorUpdatesController.createUpdate);
router.get('/patient/:patientId', DoctorUpdatesController.getPatientUpdates);

export default router;
