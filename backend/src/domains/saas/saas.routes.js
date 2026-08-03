import { Router } from 'express';
import {
  registerHospital,
  getAllHospitals,
  approveHospital,
  updateHospitalStatus,
  getPlatformMetrics,
  getHospitalDetail,
  getHospitalAdminOverview,
  globalSearch,
  getAuditLogs,
  getHospitalsWithStats,
  deleteHospital,
  restoreHospital,
} from './saas.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { requireRole } from '../../middleware/permissions.js';
import { ROLES } from '../../config/constants.js';

const router = Router();
const superAdminOnly = [verifyJwt, requireRole(ROLES.SUPER_ADMIN)];

// Public Endpoint for Hospital Registration
router.post('/register-hospital', registerHospital);

// Protected Platform Super Admin Endpoints
router.get('/platform/metrics', ...superAdminOnly, getPlatformMetrics);
router.get('/hospitals/stats', ...superAdminOnly, getHospitalsWithStats);
router.get('/hospitals/overview', ...superAdminOnly, getHospitalAdminOverview);
router.get('/hospitals/:id/detail', ...superAdminOnly, getHospitalDetail);
router.patch('/hospitals/:id/configuration', ...superAdminOnly, updateHospitalConfiguration);
router.get('/search', ...superAdminOnly, globalSearch);
router.get('/audit-logs', ...superAdminOnly, getAuditLogs);

router.get('/hospitals', ...superAdminOnly, getAllHospitals);
router.patch('/hospitals/:id/approve', ...superAdminOnly, approveHospital);
router.patch('/hospitals/:id/status', ...superAdminOnly, updateHospitalStatus);
router.delete('/hospitals/:id', ...superAdminOnly, deleteHospital);
router.patch('/hospitals/:id/delete', ...superAdminOnly, deleteHospital);
router.patch('/hospitals/:id/restore', ...superAdminOnly, restoreHospital);

export default router;
