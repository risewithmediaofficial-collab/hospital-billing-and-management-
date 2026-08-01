import { Router } from 'express';
import { PatientPortalController } from './patient-portal.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';

const router = Router();

router.use(verifyJwt);

router.get('/dashboard', PatientPortalController.getDashboard);
router.get('/history', PatientPortalController.getTreatmentHistory);
router.get('/prescriptions', PatientPortalController.getPrescriptions);
router.get('/lab-reports', PatientPortalController.getLabReports);
router.get('/radiology-reports', PatientPortalController.getRadiologyReports);
router.get('/billing', PatientPortalController.getBilling);
router.get('/my-requests', PatientPortalController.getMyRequests);
router.post('/my-requests', PatientPortalController.createMyRequest);

export default router;
