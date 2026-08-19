import mongoose from 'mongoose';

const hospitalFloorSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    blockId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalBlock', default: null, index: true },
    name: { type: String, required: true, trim: true },
    floorNumber: { type: Number, default: 0 },
    description: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

hospitalFloorSchema.index({ hospitalId: 1, blockId: 1, name: 1 }, { unique: true });
hospitalFloorSchema.index({ hospitalId: 1, status: 1 });

export const HospitalFloor = mongoose.model('HospitalFloor', hospitalFloorSchema);
