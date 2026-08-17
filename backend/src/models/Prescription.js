import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    consultationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    prescriptionNo: { type: String, required: true, unique: true },
    medicines: [
      {
        medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
        medicineName: { type: String, required: true },
        genericName: { type: String, default: '' },
        dosageForm: { type: String, default: 'TABLET' },
        strength: { type: String, default: '' },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        durationDays: { type: Number, default: 1 },
        timing: { type: String, enum: ['BEFORE_FOOD', 'AFTER_FOOD', 'WITH_FOOD', 'STAT', 'AS_DIRECTED'], default: 'AFTER_FOOD' },
        startDate: { type: Date, default: Date.now },
        treatmentType: {
          type: String,
          enum: ['ORAL_TAKE_HOME', 'NURSE_ADMINISTERED'],
          default: 'ORAL_TAKE_HOME',
        },
        specialInstructions: { type: String, default: '' },
        instructions: { type: String, default: 'After meals' },
        externalPurchaseRequired: { type: Boolean, default: false },
        externalPurchaseNote: { type: String, default: '' },
        dispensedQty: { type: Number, default: 0 },
        batchNumberUsed: { type: String, default: '' },
        itemStatus: {
          type: String,
          enum: ['PENDING', 'DISPENSED', 'PARTIALLY_DISPENSED', 'UNAVAILABLE', 'PURCHASED_EXTERNALLY', 'SUBSTITUTED'],
          default: 'PENDING',
        },
      },
    ],
    dispenseStatus: {
      type: String,
      enum: ['PENDING_DISPENSE', 'PARTIALLY_DISPENSED', 'DISPENSED', 'CANCELLED'],
      default: 'PENDING_DISPENSE',
      index: true,
    },
    dispensedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dispensedAt: { type: Date },
    pharmacyNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Prescription = mongoose.model('Prescription', prescriptionSchema);
