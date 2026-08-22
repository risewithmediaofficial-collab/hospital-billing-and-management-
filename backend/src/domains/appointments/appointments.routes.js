import { Router } from 'express';
import { issueToken, getOpdQueue, updateTokenStatus } from './appointments.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { requireAssignedRole } from '../../middleware/permissions.js';

const router = Router();

router.use(verifyJwt);

router.post('/tokens', requireAssignedRole('RECEPTIONIST', 'OPD_STAFF'), issueToken);
router.get('/queue', getOpdQueue);
router.patch('/tokens/:id/status', requireAssignedRole('DOCTOR', 'RECEPTIONIST', 'OPD_STAFF'), updateTokenStatus);

export default router;
