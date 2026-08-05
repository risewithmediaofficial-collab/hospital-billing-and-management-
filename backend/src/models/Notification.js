import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    recipientRole: { type: String, enum: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'ALL'], default: 'SUPER_ADMIN', index: true },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true, default: null },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        'REGISTRATION',
        'EMAIL_VERIFIED',
        'TRIAL_STARTED',
        'TRIAL_EXPIRING',
        'TRIAL_EXPIRED',
        'SUBSCRIPTION_ACTIVATED',
        'SUBSCRIPTION_RENEWED',
        'SUBSCRIPTION_SUSPENDED',
        'SUBSCRIPTION_REACTIVATED',
        'PASSWORD_RESET_REQUEST',
        'PASSWORD_CHANGED',
        'SYSTEM_ALERT',
      ],
      default: 'SYSTEM_ALERT',
      index: true,
    },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    link: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true }
);

export const Notification = mongoose.model('Notification', notificationSchema);
