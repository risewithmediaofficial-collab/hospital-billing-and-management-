import mongoose from 'mongoose';
import { tenantAwareModel } from '../config/tenantAwareModel.js';

const pharmacySubstitutionRequestSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pharmacistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalMedicineName: { type: String, required: true },
    suggestedMedicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    suggestedMedicineName: { type: String, required: true },
    genericComposition: { type: String, required: true },
    strength: { type: String, required: true },
    availableQty: { type: Number, required: true },
    priceDifference: { type: Number, default: 0 },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    doctorResponseNotes: { type: String, default: '' },
    respondedAt: { type: Date },
    acknowledgedByPharmacist: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PharmacySubstitutionRequest = tenantAwareModel(mongoose.model(
  'PharmacySubstitutionRequest',
  pharmacySubstitutionRequestSchema
));
