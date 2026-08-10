import mongoose from 'mongoose';

const emergencySchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    emergencyType: {
      type: String,
      enum: ['CODE_BLUE', 'CODE_RED', 'TRAUMA_CRITICAL', 'PATIENT_COLLAPSE', 'CARDIAC_ARREST', 'ANAPHYLAXIS', 'ACUTE_RESPIRATORY_DISTRESS', 'OTHER'],
      default: 'CODE_BLUE',
      required: true,
    },
    severity: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM'],
      default: 'CRITICAL',
    },
    raisedByDept: { type: String, required: true },
    raisedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    raisedByUserName: { type: String, required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    patientName: { type: String, default: 'Unknown / Unidentified' },
    uhid: { type: String, default: 'N/A' },
    // Admission context — enables targeted care-team routing
    admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null, index: true },
    // Users who received this alert (populated from CareTeamAssignment at raise time)
    routedToUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    location: { type: String, required: true }, // e.g. "Room 302", "Radiology Scanner 1", "OPD Waiting Area"
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['ACTIVE', 'RESPONDED', 'RESOLVED', 'CLOSED'],
      default: 'ACTIVE',
      index: true,
    },
    resolvedAt: { type: Date },
    resolvedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedByUserName: { type: String, default: '' },
    resolutionNotes: { type: String, default: '' },
    timeline: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        updatedBy: { type: String, required: true },
        notes: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

export const Emergency = mongoose.model('Emergency', emergencySchema);
