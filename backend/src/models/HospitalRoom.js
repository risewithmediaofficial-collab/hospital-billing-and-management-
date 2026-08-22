import mongoose from 'mongoose';
import { tenantAwareModel } from '../config/tenantAwareModel.js';

const hospitalRoomSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    blockId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalBlock', default: null, index: true },
    floorId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalFloor', default: null, index: true },
    wardId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalWard', default: null, index: true },
    roomNumber: { type: String, required: true, trim: true },
    roomName: { type: String, trim: true, default: '' },
    roomType: {
      type: String,
      enum: [
        'SINGLE',
        'TWIN_SHARING',
        'TRIPLE_SHARING',
        'FOUR_SHARING',
        'MULTI_SHARING',
        'GENERAL_WARD_ROOM',
        'PRIVATE',
        'SEMI_PRIVATE',
        'DELUXE',
        'SUITE',
        'ICU',
        'NICU',
        'ISOLATION',
        'EMERGENCY_OBSERVATION',
        'CUSTOM',
      ],
      default: 'SINGLE',
      index: true,
    },
    maxBedCapacity: { type: Number, default: 1, min: 1 },
    dailyRoomCharge: { type: Number, default: 0, min: 0 },
    description: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

hospitalRoomSchema.index({ hospitalId: 1, wardId: 1, roomNumber: 1 }, { unique: true });
hospitalRoomSchema.index({ hospitalId: 1, status: 1 });

export const HospitalRoom = tenantAwareModel(mongoose.model('HospitalRoom', hospitalRoomSchema));
