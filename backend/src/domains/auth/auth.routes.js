import { Router } from 'express';
import { login, getMe, logout, createStaffUser, updateStaffUser, getHospitalStaff, getStaffPassword, updateStaffPassword, updateDoctorAvailability, updateStaffPermissions } from './auth.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';
import { requireRole } from '../../middleware/permissions.js';
import { ROLES } from '../../config/constants.js';

const router = Router();

router.post('/login', authRateLimiter, login);
router.get('/me', verifyJwt, getMe);
router.post('/logout', verifyJwt, logout);

// Protected Staff Management Endpoints
router.post('/staff', verifyJwt, requireRole(ROLES.HOSPITAL_ADMIN), createStaffUser);
router.get('/staff', verifyJwt, getHospitalStaff);
router.patch('/staff/:id', verifyJwt, requireRole(ROLES.HOSPITAL_ADMIN), updateStaffUser);
router.post('/staff/:id/view-password', verifyJwt, requireRole(ROLES.HOSPITAL_ADMIN), getStaffPassword);
router.patch('/staff/:id/password', verifyJwt, requireRole(ROLES.HOSPITAL_ADMIN), updateStaffPassword);
router.patch('/staff/:id/permissions', verifyJwt, requireRole(ROLES.HOSPITAL_ADMIN), updateStaffPermissions);
router.patch('/staff/:id/availability', verifyJwt, updateDoctorAvailability);

export default router;
