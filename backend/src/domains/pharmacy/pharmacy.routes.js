import { Router } from 'express';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { requireModulePermission } from '../../middleware/permissions.js';
import { getPrescriptions, dispensePrescription } from './pharmacy.controller.js';

const router = Router();
router.use(verifyJwt);
router.get('/prescriptions', requireModulePermission('pharmacy', 'view'), getPrescriptions);
router.patch('/prescriptions/:id/dispense', requireModulePermission('pharmacy', 'dispense'), dispensePrescription);
export default router;
