import { Router } from 'express';
import { GuardianPortalController } from './guardian-portal.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { sendError } from '../../utils/apiResponse.js';

const router = Router();

router.use(verifyJwt);

const requireExactRole = (...allowedRoles) => (req, res, next) => {
  const roles = [req.user?.role, ...(req.user?.additionalRoles || [])].filter(Boolean);
  if (!allowedRoles.some((role) => roles.includes(role))) {
    return sendError(res, 403, 'This guardian workflow is not available for the active role.', null, 'FORBIDDEN');
  }
  next();
};

const guardianOnly = requireExactRole('GUARDIAN');
const hospitalGovernanceOnly = requireExactRole('HOSPITAL_ADMIN');

router.get('/linked-patients', guardianOnly, GuardianPortalController.getLinkedPatients);
router.get('/dashboard', guardianOnly, GuardianPortalController.getDashboard);
router.post('/request-link', guardianOnly, GuardianPortalController.requestLink);
router.post('/doctor-message', guardianOnly, GuardianPortalController.submitDoctorMessage);
router.get('/all-links', hospitalGovernanceOnly, GuardianPortalController.listAllLinks);
router.patch('/links/:linkId/status', hospitalGovernanceOnly, GuardianPortalController.updateLinkStatus);

export default router;
