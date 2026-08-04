import mongoose from 'mongoose';
import { encryptedFieldsPlugin } from '../plugins/encryptedFieldsPlugin.js';

const admissionSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    uhid: { type: String, required: true },
    patientName: { type: String, required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorName: { type: String, required: true, default: 'Dr. Gregory House' },
    assignedNurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedCaretakerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    wardType: { type: String, enum: ['GENERAL', 'SEMI_PRIVATE', 'PRIVATE', 'ICU'], default: 'GENERAL' },
    targetWardName: { type: String, default: 'Ward 3B - Inpatient' },
    bedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed' },
    bedNumber: { type: String, default: 'UNASSIGNED' },
    admissionReason: { type: String, required: true },
    dailyTariff: { type: Number, default: 150.0 },
    status: {
      type: String,
      enum: ['ADMISSION_REQUESTED', 'ADMITTED', 'DISCHARGED'],
      default: 'ADMISSION_REQUESTED',
      index: true,
    },
    admittedAt: { type: Date },
    assignedAt: { type: Date },
    dischargedAt: { type: Date },
  },
  { timestamps: true }
);

admissionSchema.plugin(encryptedFieldsPlugin, { fields: ['admissionReason'] });

export const Admission = mongoose.model('Admission', admissionSchema);
