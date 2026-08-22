import mongoose from 'mongoose';
import { tenantAwareModel } from '../config/tenantAwareModel.js';

const hospitalWardSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    blockId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalBlock', default: null, index: true },
    floorId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalFloor', default: null, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, default: '' },
    wardType: {
      type: String,
      enum: [
        'GENERAL',
        'MALE_WARD',
        'FEMALE_WARD',
        'ICU',
        'NICU',
        'PICU',
        'EMERGENCY',
        'MATERNITY',
        'POST_OPERATIVE',
        'PEDIATRIC',
        'ISOLATION',
        'PRIVATE',
        'SEMI_PRIVATE',
        'DELUXE',
        'CUSTOM',
      ],
      default: 'GENERAL',
      index: true,
    },
    department: { type: String, trim: true, default: 'Inpatient' },
    genderRestriction: {
      type: String,
      enum: ['ANY', 'MALE', 'FEMALE', 'CHILD', 'NOT_APPLICABLE'],
      default: 'ANY',
    },
    bedCapacity: { type: Number, default: 10, min: 1 },
    defaultDailyCharge: { type: Number, default: 150.0, min: 0 },
    description: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

hospitalWardSchema.index({ hospitalId: 1, name: 1 }, { unique: true });
hospitalWardSchema.index({ hospitalId: 1, wardType: 1 });
hospitalWardSchema.index({ hospitalId: 1, status: 1 });

export const HospitalWard = tenantAwareModel(mongoose.model('HospitalWard', hospitalWardSchema));
