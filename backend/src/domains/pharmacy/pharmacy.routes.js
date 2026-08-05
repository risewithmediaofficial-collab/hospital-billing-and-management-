import { Router } from 'express';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { requireModulePermission } from '../../middleware/permissions.js';
import {
  getMedicines,
  createMedicine,
  updateMedicine,
  addBatch,
  adjustStock,
  transferStock,
  getDashboardAlerts,
  getStockAdjustments,
  getPrescriptions,
  dispensePrescription,
  requestSubstitution,
  respondSubstitution,
  getPendingSubstitutions,
  getNurseTasks,
  updateNurseTaskStatus,
} from './pharmacy.controller.js';

const router = Router();
router.use(verifyJwt);

// Inventory & Batches
router.get('/medicines', getMedicines);
router.post('/medicines', requireModulePermission('pharmacy', 'edit'), createMedicine);
router.put('/medicines/:id', requireModulePermission('pharmacy', 'edit'), updateMedicine);
router.post('/batches', requireModulePermission('pharmacy', 'edit'), addBatch);
router.post('/stock/adjust', requireModulePermission('pharmacy', 'edit'), adjustStock);
router.post('/stock/transfer', requireModulePermission('pharmacy', 'edit'), transferStock);
router.get('/alerts', getDashboardAlerts);
router.get('/stock-movements', getStockAdjustments);

// E-Prescriptions & Dispensing
router.get('/prescriptions', getPrescriptions);
router.patch('/prescriptions/:id/dispense', requireModulePermission('pharmacy', 'dispense'), dispensePrescription);

// Substitutions
router.post('/substitutions/request', requestSubstitution);
router.get('/substitutions/pending', getPendingSubstitutions);
router.patch('/substitutions/:id/respond', respondSubstitution);

// Nurse Administration Tasks
router.get('/nurse-tasks', getNurseTasks);
router.patch('/nurse-tasks/:id/status', updateNurseTaskStatus);

export default router;
