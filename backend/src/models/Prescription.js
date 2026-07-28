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
        medicineName: { type: String, required: true },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        durationDays: { type: Number, required: true },
        instructions: { type: String, default: 'After meals' },
      },
    ],
    dispenseStatus: { type: String, enum: ['PENDING_DISPENSE', 'DISPENSED'], default: 'PENDING_DISPENSE', index: true },
  },
  { timestamps: true }
);

export const Prescription = mongoose.model('Prescription', prescriptionSchema);
