import { Router } from 'express';
import { createRequest, getActiveRequests, updateRequestStatus } from './requests.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { sendError } from '../../utils/apiResponse.js';

const router = Router();

router.use(verifyJwt);

const requireExactRole = (...allowedRoles) => (req, res, next) => {
  const roles = [req.user?.role, ...(req.user?.additionalRoles || [])].filter(Boolean);
  if (!allowedRoles.some((role) => roles.includes(role))) {
    return sendError(res, 403, 'The active role cannot access patient care requests.', null, 'FORBIDDEN');
  }
  next();
};

router.post('/', requireExactRole('PATIENT'), createRequest);
router.get('/', requireExactRole('DOCTOR', 'NURSE', 'NURSE_INCHARGE', 'IPD_STAFF', 'SUPPORT_STAFF', 'EMERGENCY_STAFF', 'HOSPITAL_ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST', 'CASHIER', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGIST', 'INVENTORY_MANAGER', 'HR_MANAGER'), getActiveRequests);
router.patch('/:id/status', requireExactRole('DOCTOR', 'NURSE', 'NURSE_INCHARGE', 'IPD_STAFF', 'SUPPORT_STAFF', 'EMERGENCY_STAFF', 'HOSPITAL_ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST', 'CASHIER', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGIST', 'INVENTORY_MANAGER', 'HR_MANAGER'), updateRequestStatus);

export default router;
