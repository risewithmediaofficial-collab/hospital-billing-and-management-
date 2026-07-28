import { Router } from 'express';
import { requestAdmission, getAdmissions, allocateBed } from './admissions.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';

const router = Router();

router.use(verifyJwt);

router.post('/request', requestAdmission);
router.get('/', getAdmissions);
router.patch('/:id/allocate-bed', allocateBed);

export default router;
