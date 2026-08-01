import { Router } from 'express';
import { GuardianPortalController } from './guardian-portal.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';

const router = Router();

router.use(verifyJwt);

router.get('/linked-patients', GuardianPortalController.getLinkedPatients);
router.get('/dashboard', GuardianPortalController.getDashboard);
router.post('/request-link', GuardianPortalController.requestLink);
router.get('/all-links', GuardianPortalController.listAllLinks);
router.put('/link/:linkId/status', GuardianPortalController.updateLinkStatus);

export default router;
