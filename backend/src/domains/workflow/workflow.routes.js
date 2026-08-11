import { Router } from 'express';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { getPendingWork, dismissTask, dismissAllTasks } from './workflow.controller.js';

const router = Router();
router.get('/pending', verifyJwt, getPendingWork);
router.patch('/dismiss-all', verifyJwt, dismissAllTasks);
router.patch('/dismiss/:id', verifyJwt, dismissTask);
export default router;
