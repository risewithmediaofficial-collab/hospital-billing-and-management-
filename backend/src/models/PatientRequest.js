import mongoose from 'mongoose';
import { REQUEST_TYPES, REQUEST_STATUS } from '../config/constants.js';

const patientRequestSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    bedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', required: true },
    requestType: { type: String, enum: Object.values(REQUEST_TYPES), required: true },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    status: { type: String, enum: Object.values(REQUEST_STATUS), default: REQUEST_STATUS.PENDING, index: true },
    assignedNurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, default: '' },
    acknowledgedAt: { type: Date },
    completedAt: { type: Date },
    escalationLevel: { type: Number, default: 0 }, // 0: None, 1: Ward In-Charge, 2: Floor Manager, 3: Admin
  },
  { timestamps: true }
);

export const PatientRequest = mongoose.model('PatientRequest', patientRequestSchema);
