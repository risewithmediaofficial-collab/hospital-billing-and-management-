import { PatientPortalService } from './patient-portal.service.js';

export class PatientPortalController {
  static async getDashboard(req, res, next) {
    try {
      const data = await PatientPortalService.getDashboard(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getTreatmentHistory(req, res, next) {
    try {
      const timeline = await PatientPortalService.getTreatmentHistory(req.user);
      res.json({ success: true, data: timeline });
    } catch (err) {
      next(err);
    }
  }

  static async getPrescriptions(req, res, next) {
    try {
      const data = await PatientPortalService.getPrescriptions(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getLabReports(req, res, next) {
    try {
      const data = await PatientPortalService.getReports(req.user, 'LABORATORY');
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getRadiologyReports(req, res, next) {
    try {
      const data = await PatientPortalService.getReports(req.user, 'RADIOLOGY');
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getBilling(req, res, next) {
    try {
      const data = await PatientPortalService.getBilling(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getMyRequests(req, res, next) {
    try {
      const { PatientRequest } = await import('../../models/PatientRequest.js');
      const patient = await PatientPortalService.resolvePatientForUser(req.user);
      const requests = patient?._id
        ? await PatientRequest.find({ patientId: patient._id }).sort({ createdAt: -1 }).limit(50)
        : [];
      res.json({ success: true, data: requests });
    } catch (err) {
      next(err);
    }
  }

  static async createMyRequest(req, res, next) {
    try {
      const { RequestsService } = await import('../requests/requests.service.js');
      const newRequest = await RequestsService.createRequest(req.body, req.user);
      res.status(201).json({ success: true, data: newRequest });
    } catch (err) {
      next(err);
    }
  }
}
