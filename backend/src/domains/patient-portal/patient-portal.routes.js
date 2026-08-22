import { Router } from 'express';
import { PatientPortalController } from './patient-portal.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { sendError } from '../../utils/apiResponse.js';

const router = Router();

router.use(verifyJwt);

const patientOnly = (req, res, next) => {
  if (req.user?.role !== 'PATIENT') {
    return sendError(res, 403, 'This endpoint is available only to the authenticated patient portal.', null, 'FORBIDDEN');
  }
  next();
};

router.use(patientOnly);

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
