import mongoose from 'mongoose';
import { tenantAwareModel } from '../config/tenantAwareModel.js';

const departmentSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    type: { type: String, enum: ['CLINICAL', 'DIAGNOSTIC', 'PHARMACY', 'ADMINISTRATIVE', 'SUPPORT'], default: 'CLINICAL' },
    headDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

departmentSchema.index({ branchId: 1, code: 1 }, { unique: true });

export const Department = tenantAwareModel(mongoose.model('Department', departmentSchema));
