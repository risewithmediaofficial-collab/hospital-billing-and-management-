import mongoose from 'mongoose';
import { ChatMessage } from '../../models/ChatMessage.js';
import { User } from '../../models/User.js';
import { socketManager } from '../../events/socketManager.js';
import { ApiError } from '../../utils/apiError.js';

export const CHANNELS = [
  {
    id: 'GENERAL',
    name: 'General Hospital Desk',
    description: 'All-staff general communication and coordination channel',
    icon: 'Hospital',
    color: 'indigo',
  },
  {
    id: 'PHARMACY_BILLING',
    name: 'Pharmacy & Billing Queries',
    description: 'Price adjustments, stock queries, fee clarifications',
    icon: 'Receipt',
    color: 'amber',
  },
  {
    id: 'OPD_CLINICAL',
    name: 'OPD Clinical & Nursing',
    description: 'Doctors, Nurses, Reception triage communication',
    icon: 'Stethoscope',
    color: 'emerald',
  },
  {
    id: 'EMERGENCY',
    name: 'Emergency & Urgent Alerts',
    description: 'Rapid response team and urgent announcements',
    icon: 'AlertTriangle',
    color: 'rose',
  },
];

export const MESSAGE_EXPIRY_DAYS = 7;
export const get7DaysCutoff = () => new Date(Date.now() - MESSAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

export class ChatService {
  /**
   * Get list of hospital channels and active staff contacts with online presence and unread counts
   */
  static async getStaffRosterAndChannels(user) {
    const hospitalId = user.hospitalId;
    if (!hospitalId || user.role === 'SUPER_ADMIN') {
      return { channels: [], contacts: [], onlineCount: 0, totalStaffCount: 0 };
    }

    const filter = {
      isActive: { $ne: false },
      status: { $ne: 'INACTIVE' },
      role: { $nin: ['PATIENT', 'GUARDIAN'] },
    };
    if (hospitalId) {
      filter.hospitalId = hospitalId;
    }

    const staffUsers = await User.find(filter)
      .select('_id name email role specialization department phone status isAvailable lastActiveAt')
      .sort({ name: 1 })
      .lean();

    const currentUserIdStr = String(user.id || user._id);
    const sevenDaysAgo = get7DaysCutoff();

    // Online users set from socketManager (fallback to status)
    const onlineSet = socketManager.getOnlineUserIds ? socketManager.getOnlineUserIds() : new Set();

    // Compute unread counts and latest messages for direct contacts (within 7 days)
    const contactsWithMeta = await Promise.all(
      staffUsers.map(async (staff) => {
        const staffIdStr = String(staff._id);
        const isSelf = staffIdStr === currentUserIdStr;

        // Unread messages sent by this staff member to current user within 7 days
        const unreadCount = isSelf
          ? 0
          : await ChatMessage.countDocuments({
              hospitalId: staff.hospitalId || hospitalId,
              senderId: staff._id,
              recipientId: user.id || user._id,
              createdAt: { $gte: sevenDaysAgo },
              'readBy.userId': { $ne: user.id || user._id },
            });

        // Last message between current user and this staff within 7 days
        const lastMsg = await ChatMessage.findOne({
          hospitalId: staff.hospitalId || hospitalId,
          createdAt: { $gte: sevenDaysAgo },
          $or: [
            { senderId: user.id || user._id, recipientId: staff._id },
            { senderId: staff._id, recipientId: user.id || user._id },
          ],
        })
          .sort({ createdAt: -1 })
          .select('message senderName createdAt senderId')
          .lean();

        const isOnline = onlineSet.has(staffIdStr) || staff.status === 'AVAILABLE' || staff.isAvailable === true;

        return {
          _id: staff._id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          specialization: staff.specialization || staff.department || '',
          department: staff.department || '',
          phone: staff.phone || '',
          isOnline,
          isSelf,
          unreadCount,
          lastMessage: lastMsg
            ? {
                text: lastMsg.message,
                timestamp: lastMsg.createdAt,
                isFromMe: String(lastMsg.senderId) === currentUserIdStr,
              }
            : null,
        };
      })
    );

    // Compute unread counts and latest messages for channels (within 7 days)
    const channelsWithMeta = await Promise.all(
      CHANNELS.map(async (ch) => {
        const unreadCount = hospitalId
          ? await ChatMessage.countDocuments({
              hospitalId,
              channel: ch.id,
              senderId: { $ne: user.id || user._id },
              createdAt: { $gte: sevenDaysAgo },
              'readBy.userId': { $ne: user.id || user._id },
            })
          : 0;

        const lastMsg = hospitalId
          ? await ChatMessage.findOne({
              hospitalId,
              channel: ch.id,
              createdAt: { $gte: sevenDaysAgo },
            })
              .sort({ createdAt: -1 })
              .select('message senderName senderRole createdAt senderId')
              .lean()
          : null;

        return {
          ...ch,
          unreadCount,
          lastMessage: lastMsg
            ? {
                text: lastMsg.message,
                senderName: lastMsg.senderName,
                senderRole: lastMsg.senderRole,
                timestamp: lastMsg.createdAt,
                isFromMe: String(lastMsg.senderId) === currentUserIdStr,
              }
            : null,
        };
      })
    );

    const onlineCount = contactsWithMeta.filter((c) => c.isOnline).length;

    return {
      channels: channelsWithMeta,
      contacts: contactsWithMeta,
      onlineCount,
      totalStaffCount: contactsWithMeta.length,
    };
  }

  /**
   * Get messages for a channel or a 1-on-1 direct conversation (strictly within 7 days)
   */
  static async getMessages(query, user) {
    const { channel, contactId, limit = 100, before } = query;
    const hospitalId = user.hospitalId;
    if (!hospitalId || user.role === 'SUPER_ADMIN') {
      return [];
    }

    const sevenDaysAgo = get7DaysCutoff();
    const filter = {
      isDeleted: { $ne: true },
      hospitalId,
      createdAt: before
        ? { $lt: new Date(before), $gte: sevenDaysAgo }
        : { $gte: sevenDaysAgo },
    };

    if (contactId) {
      filter.channel = 'DIRECT';
      filter.$or = [
        { senderId: user.id || user._id, recipientId: contactId },
        { senderId: contactId, recipientId: user.id || user._id },
      ];
    } else if (channel) {
      filter.channel = channel;
    } else {
      filter.channel = 'GENERAL';
    }

    const messages = await ChatMessage.find(filter)
      .sort({ createdAt: 1 })
      .limit(Number(limit))
      .lean();

    // Mark retrieved messages as read by current user asynchronously
    const unreadMessageIds = messages
      .filter((m) => String(m.senderId) !== String(user.id || user._id) && !m.readBy?.some((r) => String(r.userId) === String(user.id || user._id)))
      .map((m) => m._id);

    if (unreadMessageIds.length > 0) {
      ChatMessage.updateMany(
        { _id: { $in: unreadMessageIds } },
        { $push: { readBy: { userId: user.id || user._id, readAt: new Date() } } }
      ).catch((err) => console.error('[ChatService] Error marking read:', err));
    }

    return messages;
  }

  /**
   * Send a new message (direct or channel) with 7-day TTL expiration
   */
  static async sendMessage(data, user) {
    const { message, recipientId, channel = 'DIRECT', patientRef, replyTo } = data;
    if (!message || !message.trim()) {
      throw new ApiError(400, 'Message content cannot be empty', null, 'EMPTY_MESSAGE');
    }

    const hospitalId = user.hospitalId;
    if (!hospitalId || user.role === 'SUPER_ADMIN') {
      throw new ApiError(403, 'Hospital staff chat is only available to registered hospital employees.');
    }

    let recipientUser = null;
    if (recipientId) {
      recipientUser = await User.findOne({ _id: recipientId, hospitalId }).select('name role hospitalId branchId').lean();
      if (!recipientUser) {
        throw new ApiError(404, 'Message recipient was not found in this hospital.', null, 'RECIPIENT_NOT_FOUND');
      }
    }

    const expiresAt = new Date(Date.now() + MESSAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const newMsg = new ChatMessage({
      hospitalId,
      branchId: user.branchId || null,
      senderId: user.id || user._id,
      senderName: user.name || 'Staff',
      senderRole: user.role || 'STAFF',
      recipientId: recipientUser ? recipientUser._id : null,
      recipientName: recipientUser ? recipientUser.name : '',
      recipientRole: recipientUser ? recipientUser.role : '',
      channel: recipientId ? 'DIRECT' : channel || 'GENERAL',
      message: message.trim(),
      expiresAt,
      patientRef: patientRef
        ? {
            patientId: patientRef.patientId || null,
            uhid: patientRef.uhid || '',
            patientName: patientRef.patientName || '',
          }
        : undefined,
      replyTo: replyTo
        ? {
            messageId: replyTo.messageId || null,
            senderName: replyTo.senderName || '',
            senderRole: replyTo.senderRole || '',
            message: replyTo.message || '',
            patientRef: replyTo.patientRef || undefined,
          }
        : undefined,
      readBy: [
        {
          userId: user.id || user._id,
          readAt: new Date(),
        },
      ],
    });

    await newMsg.save();

    const payload = newMsg.toObject();

    // Broadcast via Socket.IO
    if (recipientId) {
      // 1-on-1 direct message: send to recipient and sender
      socketManager.emitToUser(String(recipientId), 'chat:message', payload);
      socketManager.emitToUser(String(recipientId), 'chat:new_message', payload);
      socketManager.emitToUser(String(user.id || user._id), 'chat:message', payload);
    } else {
      // Channel message: send to hospital group room only — never globally
      if (socketManager.io) {
        socketManager.io.to(`hospital:${hospitalId}`).emit('chat:message', payload);
        socketManager.io.to(`hospital:${hospitalId}`).emit('chat:new_message', payload);
        socketManager.io.to(`chat:${hospitalId}:${channel}`).emit('chat:message', payload);
        socketManager.io.to(`chat:${hospitalId}:${channel}`).emit('chat:new_message', payload);
      }
    }

    return payload;
  }

  /**
   * Toggle emoji reaction on a message
   */
  static async toggleReaction(messageId, emoji, user) {
    if (!messageId || !emoji) {
      throw new ApiError(400, 'Message ID and Emoji are required');
    }

    const hospitalId = user.hospitalId;
    const filter = { _id: messageId, isDeleted: { $ne: true } };
    if (hospitalId) {
      filter.hospitalId = hospitalId;
    }

    const msg = await ChatMessage.findOne(filter);
    if (!msg) {
      throw new ApiError(404, 'Message not found');
    }

    const userId = user.id || user._id;
    const existingIndex = msg.reactions.findIndex(
      (r) => String(r.userId) === String(userId) && r.emoji === emoji
    );

    if (existingIndex > -1) {
      // Toggle off if clicking the same emoji
      msg.reactions.splice(existingIndex, 1);
    } else {
      // Replace previous emoji by this user if any (WhatsApp style)
      const otherIndex = msg.reactions.findIndex((r) => String(r.userId) === String(userId));
      if (otherIndex > -1) {
        msg.reactions.splice(otherIndex, 1);
      }
      msg.reactions.push({
        userId,
        userName: user.name || 'Staff',
        userRole: user.role || 'STAFF',
        emoji,
        createdAt: new Date(),
      });
    }

    await msg.save();

    const payload = {
      messageId: msg._id,
      channel: msg.channel,
      reactions: msg.reactions,
    };

    // Broadcast reaction update
    if (socketManager.io && msg.hospitalId) {
      socketManager.io.to(`hospital:${msg.hospitalId}`).emit('chat:reaction_updated', payload);
      socketManager.io.to(`chat:${msg.hospitalId}:${msg.channel}`).emit('chat:reaction_updated', payload);
    }

    return payload;
  }

  /**
   * Mark messages as read
   */
  static async markAsRead(data, user) {
    const { contactId, channel } = data;
    const hospitalId = user.hospitalId;

    const filter = {
      hospitalId,
      senderId: { $ne: user.id || user._id },
      'readBy.userId': { $ne: user.id || user._id },
    };

    if (contactId) {
      filter.channel = 'DIRECT';
      filter.senderId = contactId;
      filter.recipientId = user.id || user._id;
    } else if (channel) {
      filter.channel = channel;
    }

    await ChatMessage.updateMany(
      filter,
      { $push: { readBy: { userId: user.id || user._id, readAt: new Date() } } }
    );

    if (contactId) {
      socketManager.emitToUser(String(contactId), 'chat:read_receipt', {
        readBy: user.id || user._id,
        readByName: user.name,
        contactId,
      });
    }

    return { success: true };
  }
}
