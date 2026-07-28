import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    userRole: { type: String },
    action: { type: String, required: true },
    module: { type: String, required: true },
    resourceId: { type: String },
    ipAddress: { type: String },
    endpoint: { type: String },
    httpMethod: { type: String },
    previousState: { type: mongoose.Schema.Types.Mixed },
    newState: { type: mongoose.Schema.Types.Mixed },
    details: { type: String },
  },
  { timestamps: true }
);

auditLogSchema.index({ hospitalId: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
