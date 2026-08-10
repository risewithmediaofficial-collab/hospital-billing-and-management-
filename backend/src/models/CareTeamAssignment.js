import mongoose from 'mongoose';

/**
 * CareTeamAssignment — Full history of every staff member assigned to an admission.
 * A new record is created on each assignment. removedAt = null means currently active.
 */
const careTeamAssignmentSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    uhid: { type: String, required: true },

    role: {
      type: String,
      enum: [
        'PRIMARY_DOCTOR',
        'CONSULTING_DOCTOR',
        'NURSE',
        'DUTY_NURSE',
        'CARETAKER',
        'ICU_SPECIALIST',
        'WARD_STAFF',
        'PHYSIOTHERAPIST',
        'DIETITIAN',
      ],
      required: true,
      index: true,
    },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, required: true },
    userRole: { type: String, default: '' }, // system role (DOCTOR, NURSE, etc.)
    department: { type: String, default: '' },

    assignedAt: { type: Date, default: Date.now, required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedByName: { type: String, default: '' },

    // null = currently active; set to Date when removed/replaced
    removedAt: { type: Date, default: null },
    removedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    removedByName: { type: String, default: '' },
    removalReason: { type: String, default: '' },

    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

// Compound index for fast lookup of current active assignments per admission
careTeamAssignmentSchema.index({ admissionId: 1, removedAt: 1 });
careTeamAssignmentSchema.index({ admissionId: 1, role: 1, removedAt: 1 });
careTeamAssignmentSchema.index({ userId: 1, removedAt: 1 });

export const CareTeamAssignment = mongoose.model('CareTeamAssignment', careTeamAssignmentSchema);
