import { Router } from 'express';
import { DoctorUpdatesController } from './doctor-updates.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { requireAssignedRole } from '../../middleware/permissions.js';

const router = Router();

router.use(verifyJwt);

router.post('/', requireAssignedRole('DOCTOR'), DoctorUpdatesController.createUpdate);
router.get('/patient/:patientId', DoctorUpdatesController.getPatientUpdates);

export default router;
