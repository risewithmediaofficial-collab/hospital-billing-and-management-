import { Router } from 'express';
import { issueToken, getOpdQueue, updateTokenStatus } from './appointments.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';

const router = Router();

router.use(verifyJwt);

router.post('/tokens', issueToken);
router.get('/queue', getOpdQueue);
router.patch('/tokens/:id/status', updateTokenStatus);

export default router;
