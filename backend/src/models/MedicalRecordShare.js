import mongoose from 'mongoose';

/**
 * MedicalRecordShare — Tracks when a patient shares a record from Hospital A to a doctor at Hospital B.
 * Patient consent is required. All access is logged for audit purposes.
 */
const medicalRecordShareSchema = new mongoose.Schema(
  {
    globalPatientId: { type: mongoose.Schema.Types.ObjectId, ref: 'GlobalPatient', required: true, index: true },
    patientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Source: the hospital where the record was created
    fromHospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    fromHospitalName: { type: String, default: '' },

    // Destination: the hospital and doctor receiving access
    toHospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    toHospitalName: { type: String, default: '' },
    toDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toDoctorName: { type: String, default: '' },

    // The specific record being shared (polymorphic reference)
    recordType: {
      type: String,
      enum: [
        'DIAGNOSTIC_REPORT',
        'PRESCRIPTION',
        'DISCHARGE_SUMMARY',
        'CONSULTATION_NOTE',
        'LAB_REPORT',
        'RADIOLOGY_REPORT',
        'DOCTOR_UPDATE',
        'INVOICE',
        'OTHER',
      ],
      required: true,
    },
    recordId: { type: mongoose.Schema.Types.ObjectId, required: true },
    recordDescription: { type: String, default: '' }, // e.g. "CBC Report - 10 Aug 2026"

    // Sharing scope
    shareType: {
      type: String,
      enum: ['ONCE', 'ADMISSION', 'UNTIL_DATE', 'PERMANENT'],
      default: 'ONCE',
    },
    linkedAdmissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null },
    expiresAt: { type: Date, default: null },

    // Consent
    patientConsentAt: { type: Date, default: Date.now },

    // Status
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'REVOKED'],
      default: 'ACTIVE',
      index: true,
    },
    revokedAt: { type: Date, default: null },
    revokedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Audit log of views
    accessLog: [
      {
        viewedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        viewedByName: { type: String, default: '' },
        viewedAt: { type: Date, default: Date.now },
        ipAddress: { type: String, default: '' },
      }
    ],
  },
  { timestamps: true }
);

medicalRecordShareSchema.index({ globalPatientId: 1, status: 1 });
medicalRecordShareSchema.index({ toDoctorId: 1, status: 1 });
medicalRecordShareSchema.index({ fromHospitalId: 1, toHospitalId: 1 });

export const MedicalRecordShare = mongoose.model('MedicalRecordShare', medicalRecordShareSchema);
