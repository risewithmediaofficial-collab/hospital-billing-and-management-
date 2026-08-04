import mongoose from 'mongoose';
import { encryptedFieldsPlugin } from '../plugins/encryptedFieldsPlugin.js';

const doctorUpdateSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    updateType: {
      type: String,
      enum: [
        'GENERAL_UPDATE',
        'STABLE',
        'CRITICAL',
        'SURGERY_COMPLETED',
        'ICU_TRANSFER',
        'WARD_TRANSFER',
        'READY_FOR_DISCHARGE',
        'FOLLOW_UP',
      ],
      default: 'GENERAL_UPDATE',
    },
    visibility: {
      type: String,
      enum: ['PATIENT_ONLY', 'GUARDIAN_ONLY', 'BOTH', 'INTERNAL_ONLY'],
      default: 'BOTH',
      index: true,
    },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
      },
    ],
  },
  { timestamps: true }
);

doctorUpdateSchema.plugin(encryptedFieldsPlugin, { fields: ['content'] });

export const DoctorUpdate = mongoose.model('DoctorUpdate', doctorUpdateSchema);
