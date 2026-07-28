import mongoose from 'mongoose';
import { PAYMENT_MODES } from '../config/constants.js';

const receiptSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiptNo: { type: String, required: true },
    amountPaid: { type: Number, required: true },
    paymentMode: { type: String, enum: Object.values(PAYMENT_MODES), default: PAYMENT_MODES.CARD },
    transactionRef: { type: String, default: '' },
    remarks: { type: String, default: 'Payment collected successfully' },
  },
  { timestamps: true }
);

// Receipt number is unique per hospital, not globally (multi-hospital SaaS)
receiptSchema.index({ hospitalId: 1, receiptNo: 1 }, { unique: true });

export const Receipt = mongoose.model('Receipt', receiptSchema);
