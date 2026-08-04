import mongoose from 'mongoose';
import { encryptedFieldsPlugin } from '../plugins/encryptedFieldsPlugin.js';

const diagnosticOrderSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    uhid: { type: String, required: true },
    patientName: { type: String, required: true },
    patientAge: { type: String, default: '30 Y' },
    patientGender: { type: String, default: 'MALE' },
    opIpNumber: { type: String, default: '' },
    tokenNumber: { type: Number, default: 1 },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorName: { type: String, required: true },
    testCategory: {
      type: String,
      enum: [
        'LABORATORY',
        'XRAY',
        'MRI',
        'CT_SCAN',
        'ULTRASOUND',
        'ECG',
        'ECHO',
        'EEG',
        'URINE_ANALYSIS',
        'URINE_TEST',
        'BLOOD_TEST',
        'CULTURE_TEST',
        'BIOPSY',
        'ENDOSCOPY',
        'COLONOSCOPY',
        'PFT',
        'PATHOLOGY',
        'RADIOLOGY',
        'CARDIOLOGY',
        'NEUROLOGY',
        'GASTROENTEROLOGY',
        'PULMONOLOGY',
        'OTHER',
      ],
      required: true,
      index: true,
    },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', index: true },
    testName: { type: String, required: true },
    clinicalNotes: { type: String, default: '' },
    priority: {
      type: String,
      enum: ['NORMAL', 'URGENT', 'EMERGENCY'],
      default: 'NORMAL',
      index: true,
    },
    price: { type: Number, required: true, default: 50.0 },
    additionalCharges: [
      {
        description: { type: String, required: true },
        amount: { type: Number, required: true, default: 0 },
      },
    ],
    totalDepartmentCharge: { type: Number, required: true, default: 50.0 },
    chargeStatus: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'UNDER_DOCTOR_REVIEW', 'CORRECTION_REQUESTED', 'APPROVED', 'INCLUDED_IN_FINAL_BILL', 'PAID', 'CANCELLED'],
      default: 'SUBMITTED',
      index: true,
    },
    cancellationReason: { type: String, default: '' },
    correctionNote: { type: String, default: '' },
    status: {
      type: String,
      enum: ['REQUESTED', 'DEPARTMENT_RECEIVED', 'ACCEPTED', 'IN_PROGRESS', 'REPORT_UPLOADED', 'COMPLETED', 'REVIEWED'],
      default: 'REQUESTED',
      index: true,
    },
    reportSummary: { type: String, default: '' },
    technicianName: { type: String, default: '' },
    timeline: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        updatedBy: { type: String, default: 'System' },
        notes: { type: String, default: '' },
      },
    ],
    attachments: [
      {
        fileName: { type: String, required: true },
        fileUrl: { type: String, required: true },
        fileType: { type: String, default: 'DICOM_IMAGE' },
        uploadedAt: { type: Date, default: Date.now },
        technicianName: { type: String, default: '' },
      },
    ],
    completedAt: { type: Date },
    acceptedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    responseSubmittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

diagnosticOrderSchema.plugin(encryptedFieldsPlugin, {
  fields: ['clinicalNotes', 'cancellationReason', 'correctionNote', 'reportSummary'],
});

export const DiagnosticOrder = mongoose.model('DiagnosticOrder', diagnosticOrderSchema);
