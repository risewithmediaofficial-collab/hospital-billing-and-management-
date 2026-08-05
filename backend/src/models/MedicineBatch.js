import mongoose from 'mongoose';

const medicineBatchSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
    batchNumber: { type: String, required: true, trim: true, index: true },
    location: {
      type: String,
      enum: ['MAIN_PHARMACY', 'EMERGENCY_PHARMACY', 'ICU_STOCK', 'WARD_STOCK', 'OT_STOCK'],
      default: 'MAIN_PHARMACY',
      index: true,
    },
    mfgDate: { type: Date },
    expiryDate: { type: Date, required: true, index: true },
    purchasePrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    storageLocation: { type: String, default: 'Rack 1', trim: true }, // Shelf / Rack number
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

medicineBatchSchema.index({ hospitalId: 1, medicineId: 1, location: 1, expiryDate: 1 });

export const MedicineBatch = mongoose.model('MedicineBatch', medicineBatchSchema);
