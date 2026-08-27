import mongoose from 'mongoose';
import { encryptedFieldsPlugin } from '../plugins/encryptedFieldsPlugin.js';

/**
 * GlobalPatient — One record per real-world person across the entire SaaS platform.
 * Hospital-specific patient records (Patient model) reference this via globalPatientId.
 * Patient login User records also reference this via patientUserId.
 */
const globalPatientSchema = new mongoose.Schema(
  {
    globalPatientId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    }, // e.g. GP-2026-00001
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: '', trim: true },
    dob: { type: Date, default: null },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], default: 'MALE' },
    primaryPhone: { type: String, default: '', trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    nationalId: { type: String, default: '', trim: true },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'O_POSITIVE', 'O_NEGATIVE', 'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', '', null, 'UNKNOWN'],
      default: ''
    },
    allergies: [{ type: String }],
    emergencyContact: {
      name: { type: String, default: 'N/A' },
      phone: { type: String, default: '' },
      relation: { type: String, default: 'Family' },
    },

    // Reference to the User account used for patient login
    patientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    // All hospitals this patient has ever registered at
    hospitalMemberships: [
      {
        hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
        hospitalName: { type: String, default: '' },
        localPatientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
        localUhid: { type: String, default: '' },
        joinedAt: { type: Date, default: Date.now },
        lastVisitAt: { type: Date, default: null },
        hasActiveAdmission: { type: Boolean, default: false },
        activeAdmissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null },
      }
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

globalPatientSchema.index({ primaryPhone: 1 }, { unique: false });
globalPatientSchema.index({ email: 1 }, { sparse: true });
globalPatientSchema.index({ nationalId: 1 }, { sparse: true });
globalPatientSchema.plugin(encryptedFieldsPlugin, {
  fields: ['nationalId', 'emergencyContact.name', 'emergencyContact.phone'],
});

export const GlobalPatient = mongoose.model('GlobalPatient', globalPatientSchema);
