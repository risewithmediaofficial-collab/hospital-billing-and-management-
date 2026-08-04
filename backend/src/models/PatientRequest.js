import mongoose from 'mongoose';
import { encryptedFieldsPlugin } from '../plugins/encryptedFieldsPlugin.js';

const ALL_REQUEST_TYPES = [
  'WATER',
  'FOOD',
  'RESTROOM',
  'MEDICINE',
  'INJECTION',
  'IV_DRIP',
  'URINE_BAG',
  'CATHETER',
  'BED_POSITION',
  'CLEANING',
  'PAIN_ASSISTANCE',
  'NURSE',
  'CARETAKER',
  'DOCTOR',
  'EMERGENCY',
  'BLANKET',
  'PILLOW',
  'WHEELCHAIR',
  'OXYGEN',
  'OTHER',
];

const patientRequestSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null },
    bedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', default: null },
    requestedBy: { type: String, enum: ['PATIENT', 'GUARDIAN', 'NURSE', 'CARETAKER'], default: 'PATIENT' },
    requestType: { type: String, enum: ALL_REQUEST_TYPES, required: true },
    requestCategory: { type: String, enum: ['CARETAKER', 'NURSE', 'DOCTOR', 'EMERGENCY'], default: 'NURSE', index: true },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    status: {
      type: String,
      enum: ['SUBMITTED', 'PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'ESCALATED', 'CANCELLED'],
      default: 'SUBMITTED',
      index: true,
    },
    assignedNurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedCaretakerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, default: '' },
    rejectedReason: { type: String, default: '' },
    submittedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date, default: null },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    completedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    escalationLevel: { type: Number, default: 0 }, // 0: None, 1: Nurse In-Charge, 2: Floor Manager, 3: Admin
    escalatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

patientRequestSchema.plugin(encryptedFieldsPlugin, { fields: ['notes', 'rejectedReason'] });

export const PatientRequest = mongoose.model('PatientRequest', patientRequestSchema);
