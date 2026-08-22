import mongoose from 'mongoose';
import { tenantAwareModel } from '../config/tenantAwareModel.js';

const chatMessageSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true, required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true, default: null },

    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    senderName: { type: String, required: true, trim: true },
    senderRole: { type: String, required: true },

    // For 1-on-1 direct messages
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    recipientName: { type: String, default: '' },
    recipientRole: { type: String, default: '' },

    // Channel identifier: 'DIRECT' | 'GENERAL' | 'PHARMACY_BILLING' | 'OPD_CLINICAL' | 'EMERGENCY'
    channel: { type: String, index: true, default: 'DIRECT' },

    message: { type: String, required: true, trim: true },

    // Optional contextual reference to a patient
    patientRef: {
      patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
      uhid: { type: String, default: '' },
      patientName: { type: String, default: '' },
    },

    // Optional reply / quote reference
    replyTo: {
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage', default: null },
      senderName: { type: String, default: '' },
      senderRole: { type: String, default: '' },
      message: { type: String, default: '' },
      patientRef: {
        uhid: { type: String, default: '' },
        patientName: { type: String, default: '' },
      },
    },

    // Emoji reactions
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        userName: { type: String, default: '' },
        userRole: { type: String, default: '' },
        emoji: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Read status tracking
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
      },
    ],

    isDeleted: { type: Boolean, default: false },

    // Disappearing message expiration date (7 days from creation)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

// Indexes for fast real-time chat queries
chatMessageSchema.index({ hospitalId: 1, channel: 1, createdAt: -1 });
chatMessageSchema.index({ hospitalId: 1, senderId: 1, recipientId: 1, createdAt: -1 });
chatMessageSchema.index({ hospitalId: 1, recipientId: 1, createdAt: -1 });

// 7-day automatic MongoDB TTL expiration index (604,800 seconds = 7 days)
chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });
chatMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ChatMessage = tenantAwareModel(mongoose.model('ChatMessage', chatMessageSchema));
