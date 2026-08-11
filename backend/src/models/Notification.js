import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true, default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true, default: null },

    recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    recipientRole: { type: String, index: true, default: 'ALL' },
    recipientDepartment: { type: String, index: true, default: '' },

    notificationType: { type: String, index: true, default: 'WORKFLOW_ALERT' },
    type: { type: String, index: true, default: 'SYSTEM_ALERT' },

    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    relatedPatientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
    relatedRequestId: { type: String, default: '' },

    targetModule: { type: String, default: '' },
    targetRoute: { type: String, default: '' },
    link: { type: String, default: '' },

    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },

    status: { type: String, default: 'ACTIVE' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true }
);

export const Notification = mongoose.model('Notification', notificationSchema);
