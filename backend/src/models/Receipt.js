import mongoose from 'mongoose';
import { PAYMENT_MODES } from '../config/constants.js';

const receiptSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiptNo: { type: String, required: true },
    amountPaid: { type: Number, required: true },
    paymentMode: { type: String, enum: Object.values(PAYMENT_MODES), default: PAYMENT_MODES.CARD },
    splitPayments: [
      {
        mode: { type: String, enum: Object.values(PAYMENT_MODES), required: true },
        amount: { type: Number, required: true },
        reference: { type: String, default: '' },
        notes: { type: String, default: '' },
      },
    ],
    transactionRef: { type: String, default: '' },
    remarks: { type: String, default: 'Payment collected successfully' },
    followUpDate: { type: Date, default: null, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedByName: { type: String, default: '' },
    deletionReason: { type: String, default: '' },
  },
  { timestamps: true }
);

// Receipt number is unique per hospital, not globally (multi-hospital SaaS)
receiptSchema.index({ hospitalId: 1, receiptNo: 1 }, { unique: true });
receiptSchema.index({ hospitalId: 1, isDeleted: 1, createdAt: -1 });
receiptSchema.index({ hospitalId: 1, invoiceId: 1 });
receiptSchema.index({ hospitalId: 1, patientId: 1, createdAt: -1 });

export const Receipt = mongoose.model('Receipt', receiptSchema);
