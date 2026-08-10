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

// Multi-hospital portal routes
router.get('/hospitals', PatientPortalController.getMyHospitals);
router.get('/active-context', PatientPortalController.getActiveContext);
router.post('/share', PatientPortalController.shareRecord);
router.delete('/share/:shareId', PatientPortalController.revokeShare);
router.get('/shared-records', PatientPortalController.getSharedRecords);

export default router;
