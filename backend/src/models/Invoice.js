import mongoose from 'mongoose';
import { PAYMENT_STATUS } from '../config/constants.js';

const invoiceSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    doctorName: { type: String, default: '' },
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
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedByName: { type: String, default: '' },
    deletionReason: { type: String, default: '' },
  },
  { timestamps: true }
);

// Invoice number is unique per hospital, not globally (multi-hospital SaaS)
invoiceSchema.index({ hospitalId: 1, invoiceNo: 1 }, { unique: true });
invoiceSchema.index({ hospitalId: 1, isDeleted: 1, createdAt: -1 });
invoiceSchema.index({ hospitalId: 1, status: 1, isDeleted: 1 });
invoiceSchema.index({ hospitalId: 1, patientId: 1, createdAt: -1 });
invoiceSchema.index({ hospitalId: 1, doctorId: 1, createdAt: -1 });

export const Invoice = mongoose.model('Invoice', invoiceSchema);
