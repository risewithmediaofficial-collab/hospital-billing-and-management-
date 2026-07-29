import { Router } from 'express';
import { EmergencyController } from './emergency.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';

const router = Router();

router.use(verifyJwt);

router.post('/raise', EmergencyController.raiseEmergency);
router.patch('/:id/resolve', EmergencyController.resolveEmergency);
router.get('/active', EmergencyController.getActiveEmergencies);
router.get('/history', EmergencyController.getEmergencyHistory);

export default router;
