import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    name: { type: String, required: true, trim: true },
    branchCode: { type: String, required: true, uppercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    isMainBranch: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    settings: {
      currencySymbol: { type: String, default: '$' },
      thermalPrinterWidth: { type: Number, default: 80 },
      autoApproveLabReports: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

branchSchema.index({ hospitalId: 1, branchCode: 1 }, { unique: true });

export const Branch = mongoose.model('Branch', branchSchema);
