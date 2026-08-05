import mongoose from 'mongoose';

const pharmacyStockAdjustmentSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicineBatch', index: true },
    batchNumber: { type: String, default: '' },
    type: {
      type: String,
      enum: ['ADD_STOCK', 'DISPENSE', 'ADMINISTERED', 'DAMAGE', 'EXPIRED_DISPOSAL', 'TRANSFER', 'ADJUSTMENT', 'RETURN'],
      required: true,
      index: true,
    },
    sourceLocation: { type: String, default: 'MAIN_PHARMACY' },
    destinationLocation: { type: String, default: '' },
    previousQuantity: { type: Number, required: true },
    quantityChanged: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    performedByName: { type: String, default: '' },
  },
  { timestamps: true }
);

export const PharmacyStockAdjustment = mongoose.model('PharmacyStockAdjustment', pharmacyStockAdjustmentSchema);
