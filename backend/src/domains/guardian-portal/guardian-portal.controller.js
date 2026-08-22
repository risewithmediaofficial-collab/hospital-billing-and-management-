import { GuardianPortalService } from './guardian-portal.service.js';

export class GuardianPortalController {
  static async getLinkedPatients(req, res, next) {
    try {
      const data = await GuardianPortalService.getLinkedPatients(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getDashboard(req, res, next) {
    try {
      const { patientId } = req.query;
      const data = await GuardianPortalService.getDashboard(req.user, patientId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async requestLink(req, res, next) {
    try {
      const link = await GuardianPortalService.requestLink(req.user, req.body);
      res.json({ success: true, data: link });
    } catch (err) {
      next(err);
    }
  }

  static async submitDoctorMessage(req, res, next) {
    try {
      const request = await GuardianPortalService.submitDoctorMessage(req.user, req.body);
      res.status(201).json({ success: true, data: request });
    } catch (err) {
      next(err);
    }
  }

  static async listAllLinks(req, res, next) {
    try {
      const links = await GuardianPortalService.listAllLinks(req.user);
      res.json({ success: true, data: links });
    } catch (err) {
      next(err);
    }
  }

  static async updateLinkStatus(req, res, next) {
    try {
      const { linkId } = req.params;
      const { status, permissions } = req.body;
      const updated = await GuardianPortalService.updateLinkStatus(req.user, linkId, status, permissions);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
}
