import { Router } from 'express';
import { getBedMatrix, updateBedStatus } from './beds.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';

const router = Router();

router.use(verifyJwt);

router.get('/', getBedMatrix);
router.patch('/:id/status', updateBedStatus);

export default router;
