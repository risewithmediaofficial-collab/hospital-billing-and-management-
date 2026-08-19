import mongoose from 'mongoose';

const bedReservationSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    bedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', required: true, index: true },
    bedNumber: { type: String, required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
    patientName: { type: String, default: '' },
    uhid: { type: String, default: '' },
    reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reservedByName: { type: String, required: true },
    reservedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    reason: { type: String, default: 'Inpatient reservation' },
    status: {
      type: String,
      enum: ['ACTIVE', 'CONFIRMED_ADMISSION', 'EXPIRED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

bedReservationSchema.index({ hospitalId: 1, bedId: 1, status: 1 });

export const BedReservation = mongoose.model('BedReservation', bedReservationSchema);
