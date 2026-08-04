import mongoose from 'mongoose';
import { PATIENT_CATEGORIES } from '../config/constants.js';
import { encryptedFieldsPlugin } from '../plugins/encryptedFieldsPlugin.js';

const patientSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    uhid: { type: String, required: true, uppercase: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], default: 'MALE' },
    age: { type: Number },
    dob: { type: Date, default: () => new Date('1995-01-01') },
    chiefComplaints: { type: String, default: '' },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], default: 'O+' },
    phone: { type: String, default: '+1 (555) 000-0000', trim: true, index: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    nationalId: { type: String, default: '' },
    address: { type: String, default: 'General Registration' },
    city: { type: String, default: 'Main City' },
    allergies: [{ type: String }],
    emergencyContact: {
      name: { type: String, default: 'Self / N/A' },
      phone: { type: String, default: '+1 (555) 000-0000' },
      relation: { type: String, default: 'Family' },
    },
    category: { type: String, enum: Object.values(PATIENT_CATEGORIES), default: PATIENT_CATEGORIES.GENERAL },
    qrCodeUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

patientSchema.index({ hospitalId: 1, uhid: 1 }, { unique: true });
patientSchema.plugin(encryptedFieldsPlugin, {
  fields: ['chiefComplaints', 'nationalId', 'address', 'emergencyContact.name', 'emergencyContact.phone'],
});

export const Patient = mongoose.model('Patient', patientSchema);
