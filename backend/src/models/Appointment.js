import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    departmentId: { type: mongoose.Schema.Types.Mixed },
    appointmentNo: { type: String, required: true },
    tokenNumber: { type: Number, required: true },
    appointmentDate: { type: String, required: true, index: true }, // YYYY-MM-DD
    type: { type: String, enum: ['OPD', 'FOLLOW_UP', 'EMERGENCY'], default: 'OPD' },
    status: { type: String, enum: ['WAITING', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED'], default: 'WAITING', index: true },
    chiefComplaints: { type: String, default: '' },
    cabinNo: { type: String, default: 'Cabin 102' },
  },
  { timestamps: true }
);

appointmentSchema.index({ branchId: 1, doctorId: 1, appointmentDate: 1, tokenNumber: 1 });

export const Appointment = mongoose.model('Appointment', appointmentSchema);
