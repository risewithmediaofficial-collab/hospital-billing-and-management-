import mongoose from 'mongoose';
import { PAYMENT_STATUS } from '../config/constants.js';

const invoiceSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    invoiceNo: { type: String, required: true },
    items: [
      {
        description: { type: String, required: true },
        category: { type: String, enum: ['CONSULTATION', 'LAB', 'RADIOLOGY', 'PHARMACY', 'BED_TARIFF', 'OTHER'], default: 'CONSULTATION' },
        qty: { type: Number, required: true, default: 1 },
        unitPrice: { type: Number, required: true },
        totalPrice: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, required: true },
    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.UNPAID, index: true },
  },
  { timestamps: true }
);

// Invoice number is unique per hospital, not globally (multi-hospital SaaS)
invoiceSchema.index({ hospitalId: 1, invoiceNo: 1 }, { unique: true });

export const Invoice = mongoose.model('Invoice', invoiceSchema);
