import { DoctorUpdatesService } from './doctor-updates.service.js';

export class DoctorUpdatesController {
  static async createUpdate(req, res, next) {
    try {
      const data = await DoctorUpdatesService.createUpdate(req.body, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getPatientUpdates(req, res, next) {
    try {
      const { patientId } = req.params;
      const { visibility } = req.query;
      const data = await DoctorUpdatesService.getPatientUpdates(patientId, visibility, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
