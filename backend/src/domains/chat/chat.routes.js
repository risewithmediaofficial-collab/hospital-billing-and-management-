import express from 'express';
import { ChatController } from './chat.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';

const router = express.Router();

router.use(verifyJwt);

router.get('/roster', ChatController.getRoster);
router.get('/messages', ChatController.getMessages);
router.post('/messages', ChatController.sendMessage);
router.post('/messages/:id/react', ChatController.toggleReaction);
router.post('/read', ChatController.markRead);

export default router;
