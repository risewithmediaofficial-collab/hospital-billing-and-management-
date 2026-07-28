import { Router } from 'express';
import { login, getMe, logout, createStaffUser, getHospitalStaff, getStaffPassword, updateStaffPassword, updateDoctorAvailability } from './auth.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

router.post('/login', authRateLimiter, login);
router.get('/me', verifyJwt, getMe);
router.post('/logout', verifyJwt, logout);

// Protected Staff Management Endpoints
router.post('/staff', verifyJwt, createStaffUser);
router.get('/staff', verifyJwt, getHospitalStaff);
router.post('/staff/:id/view-password', verifyJwt, getStaffPassword);
router.patch('/staff/:id/password', verifyJwt, updateStaffPassword);
router.patch('/staff/:id/availability', verifyJwt, updateDoctorAvailability);

export default router;
