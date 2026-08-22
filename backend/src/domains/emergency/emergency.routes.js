import { Router } from 'express';
import { EmergencyController } from './emergency.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { requireAssignedRole } from '../../middleware/permissions.js';

const router = Router();

router.use(verifyJwt);

router.post('/raise', requireAssignedRole('DOCTOR', 'NURSE', 'NURSE_INCHARGE', 'EMERGENCY_STAFF', 'RECEPTIONIST', 'OPD_STAFF'), EmergencyController.raiseEmergency);
router.patch('/:id/resolve', requireAssignedRole('DOCTOR', 'NURSE', 'NURSE_INCHARGE', 'EMERGENCY_STAFF'), EmergencyController.resolveEmergency);
router.get('/active', EmergencyController.getActiveEmergencies);
router.get('/history', EmergencyController.getEmergencyHistory);

export default router;
