import mongoose from 'mongoose';

const nurseTaskSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedNurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', index: true },
    prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', index: true },
    consultationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', index: true },
    taskType: {
      type: String,
      enum: [
        'INJECTION',
        'IV_FLUID',
        'NEBULIZATION',
        'DRESSING',
        'CATHETER',
        'IMMEDIATE_MEDICATION',
        'BEDSIDE_MEDICATION',
        'OTHER_PROCEDURE',
      ],
      required: true,
      index: true,
    },
    medicineName: { type: String, required: true },
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
    dose: { type: String, required: true },
    route: { type: String, default: 'IV' }, // e.g. IV, IM, SC, Oral, Topical
    frequency: { type: String, default: 'ONCE' },
    scheduledTime: { type: Date, default: Date.now },
    priority: { type: String, enum: ['ROUTINE', 'URGENT', 'STAT'], default: 'ROUTINE' },
    doctorInstructions: { type: String, default: '' },
    allergyInformation: { type: String, default: 'No known allergies' },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'SCHEDULED', 'ADMINISTERED', 'SKIPPED', 'DELAYED', 'REFUSED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    administrationDetails: {
      administeredAt: { type: Date },
      administeredQty: { type: Number, default: 1 },
      nurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      nurseName: { type: String, default: '' },
      batchNumber: { type: String, default: '' },
      batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicineBatch' },
      siteOrRoute: { type: String, default: '' }, // e.g. 'Left Arm IV', 'Deltoid IM'
      patientReaction: { type: String, default: 'NORMAL' }, // 'NORMAL', 'MILD_ALLERGY', 'SEVERE_REACTION'
      notes: { type: String, default: '' },
      reasonIfSkippedOrRefused: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export const NurseTask = mongoose.model('NurseTask', nurseTaskSchema);
