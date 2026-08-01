import mongoose from 'mongoose';

const guardianLinkSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    guardianUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    relationship: {
      type: String,
      enum: ['FATHER', 'MOTHER', 'SPOUSE', 'SIBLING', 'CHILD', 'LEGAL_GUARDIAN', 'CARETAKER', 'OTHER'],
      default: 'OTHER',
    },
    accessStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'EXPIRED', 'REVOKED'],
      default: 'PENDING',
      index: true,
    },
    permissions: {
      patientOverview: { type: Boolean, default: true },
      treatmentHistory: { type: Boolean, default: true },
      doctorUpdates: { type: Boolean, default: true },
      laboratoryReports: { type: Boolean, default: true },
      radiologyReports: { type: Boolean, default: true },
      billing: { type: Boolean, default: true },
      patientRequests: { type: Boolean, default: true },
      emergencyAccess: { type: Boolean, default: true },
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

guardianLinkSchema.index({ guardianUserId: 1, patientId: 1 }, { unique: true });

export const GuardianLink = mongoose.model('GuardianLink', guardianLinkSchema);
