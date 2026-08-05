import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    name: { type: String, required: true, trim: true, index: true },
    genericName: { type: String, required: true, trim: true, index: true },
    brandName: { type: String, default: '', trim: true },
    category: { type: String, required: true, trim: true, index: true }, // e.g. Antibiotic, Analgesic
    dosageForm: {
      type: String,
      required: true,
      enum: ['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'DROPS', 'INHALER', 'IV_FLUID', 'OINTMENT', 'OTHER'],
      default: 'TABLET',
      index: true,
    },
    strength: { type: String, required: true, trim: true }, // e.g. '500 mg', '10 mg/ml'
    manufacturer: { type: String, default: '', trim: true },
    supplier: { type: String, default: '', trim: true },
    purchasePrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    taxPercentage: { type: Number, default: 0, min: 0 }, // GST %
    minimumStockLevel: { type: Number, default: 10, min: 0 },
    reorderQuantity: { type: Number, default: 50, min: 0 },
    prescriptionRequired: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const Medicine = mongoose.model('Medicine', medicineSchema);
