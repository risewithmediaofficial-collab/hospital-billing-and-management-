import { Router } from 'express';
import { registerHospital, getAllHospitals, approveHospital, updateHospitalStatus } from './saas.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';

const router = Router();

// Public Endpoint for Hospital Registration
router.post('/register-hospital', registerHospital);

// Protected Platform Super Admin Endpoints
router.get('/hospitals', verifyJwt, getAllHospitals);
router.patch('/hospitals/:id/approve', verifyJwt, approveHospital);
router.patch('/hospitals/:id/status', verifyJwt, updateHospitalStatus);

export default router;
