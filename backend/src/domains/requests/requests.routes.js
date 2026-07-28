import { Router } from 'express';
import { createRequest, getActiveRequests, updateRequestStatus } from './requests.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';

const router = Router();

router.use(verifyJwt);

router.post('/', createRequest);
router.get('/', getActiveRequests);
router.patch('/:id/status', updateRequestStatus);

export default router;
