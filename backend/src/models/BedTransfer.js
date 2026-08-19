import mongoose from 'mongoose';

const bedTransferSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    uhid: { type: String, required: true },
    patientName: { type: String, required: true },
    
    // Origin location
    fromBedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', required: true },
    fromBedNumber: { type: String, required: true },
    fromWardName: { type: String, default: '' },
    fromRoomNumber: { type: String, default: '' },
    fromBlockName: { type: String, default: '' },
    fromFloorName: { type: String, default: '' },
    fromDailyTariff: { type: Number, default: 0 },
    
    // Target location
    toBedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', required: true },
    toBedNumber: { type: String, required: true },
    toWardName: { type: String, default: '' },
    toRoomNumber: { type: String, default: '' },
    toBlockName: { type: String, default: '' },
    toFloorName: { type: String, default: '' },
    toDailyTariff: { type: Number, default: 0 },
    
    // Operator context
    transferredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    transferredByName: { type: String, required: true },
    reason: { type: String, required: true },
    transferDate: { type: Date, default: Date.now, index: true },
    durationInPreviousBedHours: { type: Number, default: 0 },
  },
  { timestamps: true }
);

bedTransferSchema.index({ hospitalId: 1, admissionId: 1, createdAt: -1 });
bedTransferSchema.index({ hospitalId: 1, patientId: 1, createdAt: -1 });

export const BedTransfer = mongoose.model('BedTransfer', bedTransferSchema);
