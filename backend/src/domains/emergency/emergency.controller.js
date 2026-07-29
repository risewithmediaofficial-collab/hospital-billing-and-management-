import { EmergencyService } from './emergency.service.js';

export class EmergencyController {
  static async raiseEmergency(req, res, next) {
    try {
      const emergency = await EmergencyService.raiseEmergency(req.body, req.user);
      res.status(201).json(emergency);
    } catch (err) {
      next(err);
    }
  }

  static async resolveEmergency(req, res, next) {
    try {
      const emergency = await EmergencyService.resolveEmergency(req.params.id, req.body, req.user);
      res.status(200).json(emergency);
    } catch (err) {
      next(err);
    }
  }

  static async getActiveEmergencies(req, res, next) {
    try {
      const active = await EmergencyService.getActiveEmergencies(req.user);
      res.status(200).json(active);
    } catch (err) {
      next(err);
    }
  }

  static async getEmergencyHistory(req, res, next) {
    try {
      const history = await EmergencyService.getEmergencyHistory(req.user);
      res.status(200).json(history);
    } catch (err) {
      next(err);
    }
  }
}
