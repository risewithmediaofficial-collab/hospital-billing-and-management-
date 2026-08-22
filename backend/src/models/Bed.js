import mongoose from 'mongoose';
import { tenantAwareModel } from '../config/tenantAwareModel.js';
import { BED_STATUS } from '../config/constants.js';

const bedSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    
    // Dynamic hierarchy references (optional to allow flexible depth)
    blockId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalBlock', default: null, index: true },
    floorId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalFloor', default: null, index: true },
    wardId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalWard', default: null, index: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalRoom', default: null, index: true },
    
    // Denormalized quick lookups
    blockName: { type: String, default: '' },
    floorName: { type: String, default: '' },
    roomNumber: { type: String, default: '' },
    wardName: { type: String, required: true, default: 'Ward 3B - Inpatient' },
    wardType: { type: String, default: 'GENERAL', index: true },
    
    // Bed Identity & Classification
    bedNumber: { type: String, required: true, trim: true },
    bedName: { type: String, trim: true, default: '' },
    bedType: {
      type: String,
      enum: ['NORMAL', 'ELECTRIC', 'ICU', 'VENTILATOR', 'PEDIATRIC', 'MATERNITY', 'ISOLATION', 'EMERGENCY', 'CUSTOM'],
      default: 'NORMAL',
      index: true,
    },
    
    // Charges (Composite dailyTariff kept for backward compatibility)
    dailyTariff: { type: Number, required: true, default: 150.0 },
    dailyBedCharge: { type: Number, default: 0 },
    dailyRoomCharge: { type: Number, default: 0 },
    dailyWardCharge: { type: Number, default: 0 },
    
    // Real-time Status
    status: {
      type: String,
      enum: Object.values(BED_STATUS),
      default: BED_STATUS.AVAILABLE,
      index: true,
    },
    
    // Inpatient occupancy & assignments
    currentPatientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null, index: true },
    currentAdmissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null, index: true },
    assignedNurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, default: '' },
    
    // Temporary Reservation Sub-document
    reservationDetails: {
      patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
      patientName: { type: String, default: '' },
      uhid: { type: String, default: '' },
      reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      reservedByName: { type: String, default: '' },
      reservedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
      reason: { type: String, default: '' },
    },
    
    // Maintenance Sub-document
    maintenanceDetails: {
      issue: { type: String, default: '' },
      reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      reportedByName: { type: String, default: '' },
      reportedAt: { type: Date, default: null },
      priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    },
    
    // Housekeeping / Cleaning Sub-document
    cleaningDetails: {
      requestedAt: { type: Date, default: null },
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      cleanedAt: { type: Date, default: null },
      cleanedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      cleanedByName: { type: String, default: '' },
      notes: { type: String, default: '' },
    },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

bedSchema.index({ hospitalId: 1, roomId: 1, bedNumber: 1 });
bedSchema.index({ branchId: 1, bedNumber: 1 });
bedSchema.index({ hospitalId: 1, status: 1 });

export const Bed = tenantAwareModel(mongoose.model('Bed', bedSchema));
