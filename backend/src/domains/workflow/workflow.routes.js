import { Router } from 'express';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { getPendingWork } from './workflow.controller.js';

const router = Router();
router.get('/pending', verifyJwt, getPendingWork);
export default router;
