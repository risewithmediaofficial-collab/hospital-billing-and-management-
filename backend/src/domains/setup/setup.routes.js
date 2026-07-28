import { Router } from 'express';
import { getStatus, registerHospital } from './setup.controller.js';

const router = Router();

router.get('/status', getStatus);
router.post('/register', registerHospital);

export default router;
