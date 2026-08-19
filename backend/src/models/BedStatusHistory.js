import mongoose from 'mongoose';

const bedStatusHistorySchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    bedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', required: true, index: true },
    bedNumber: { type: String, required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null, index: true },
    admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null, index: true },
    fromStatus: { type: String, default: '' },
    toStatus: { type: String, required: true, index: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    changedByName: { type: String, default: 'System' },
    reason: { type: String, default: '' },
    notes: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

bedStatusHistorySchema.index({ hospitalId: 1, bedId: 1, timestamp: -1 });

export const BedStatusHistory = mongoose.model('BedStatusHistory', bedStatusHistorySchema);
