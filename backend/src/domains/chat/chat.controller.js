import { ChatService } from './chat.service.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

export class ChatController {
  static async getRoster(req, res) {
    try {
      const data = await ChatService.getStaffRosterAndChannels(req.user);
      return sendSuccess(res, 200, 'Staff roster and channels retrieved', data);
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message, null, err.code || 'SERVER_ERROR');
    }
  }

  static async getMessages(req, res) {
    try {
      const messages = await ChatService.getMessages(req.query, req.user);
      return sendSuccess(res, 200, 'Messages retrieved', messages);
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message, null, err.code || 'SERVER_ERROR');
    }
  }

  static async sendMessage(req, res) {
    try {
      const msg = await ChatService.sendMessage(req.body, req.user);
      return sendSuccess(res, 201, 'Message sent successfully', msg);
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message, null, err.code || 'SERVER_ERROR');
    }
  }

  static async toggleReaction(req, res) {
    try {
      const { id } = req.params;
      const { emoji } = req.body;
      const result = await ChatService.toggleReaction(id, emoji, req.user);
      return sendSuccess(res, 200, 'Reaction updated successfully', result);
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message, null, err.code || 'SERVER_ERROR');
    }
  }

  static async markRead(req, res) {
    try {
      const result = await ChatService.markAsRead(req.body, req.user);
      return sendSuccess(res, 200, 'Messages marked as read', result);
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message, null, err.code || 'SERVER_ERROR');
    }
  }
}

