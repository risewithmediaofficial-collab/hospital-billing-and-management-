import { Router } from 'express';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { NotificationService } from './notification.service.js';

const router = Router();
router.use(verifyJwt);

// Get notifications & unread badge count
router.get('/', async (req, res, next) => {
  try {
    const { id: userId, role, hospitalId } = req.user;
    const result = await NotificationService.getNotifications({ userId, role, hospitalId });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get unread badge count only
router.get('/unread-count', async (req, res, next) => {
  try {
    const { id: userId, role, hospitalId } = req.user;
    const count = await NotificationService.getUnreadCount({ userId, role, hospitalId });
    res.json({ unreadCount: count });
  } catch (err) {
    next(err);
  }
});

// Mark single notification as read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const notification = await NotificationService.markAsRead(req.params.id);
    res.json(notification);
  } catch (err) {
    next(err);
  }
});

// Mark all as read
router.post('/read-all', async (req, res, next) => {
  try {
    const { id: userId, role, hospitalId } = req.user;
    const result = await NotificationService.markAllAsRead({ userId, role, hospitalId });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
