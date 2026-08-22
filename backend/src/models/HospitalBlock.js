import mongoose from 'mongoose';
import { tenantAwareModel } from '../config/tenantAwareModel.js';

const hospitalBlockSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    numberOfFloors: { type: Number, default: 1, min: 1 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

hospitalBlockSchema.index({ hospitalId: 1, name: 1 }, { unique: true });
hospitalBlockSchema.index({ hospitalId: 1, status: 1 });

export const HospitalBlock = tenantAwareModel(mongoose.model('HospitalBlock', hospitalBlockSchema));
