import mongoose from 'mongoose';
import { BED_STATUS } from '../config/constants.js';

const bedSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    wardName: { type: String, required: true, default: 'Ward 3B - Inpatient' },
    bedNumber: { type: String, required: true },
    wardType: { type: String, enum: ['GENERAL', 'SEMI_PRIVATE', 'PRIVATE', 'ICU', 'NICU'], default: 'GENERAL' },
    dailyTariff: { type: Number, required: true, default: 150.0 },
    status: { type: String, enum: Object.values(BED_STATUS), default: BED_STATUS.AVAILABLE, index: true },
    currentPatientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    assignedNurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

bedSchema.index({ branchId: 1, bedNumber: 1 }, { unique: true });

export const Bed = mongoose.model('Bed', bedSchema);
