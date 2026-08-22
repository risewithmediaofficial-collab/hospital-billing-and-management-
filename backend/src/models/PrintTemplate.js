import mongoose from 'mongoose';
import { tenantAwareModel } from '../config/tenantAwareModel.js';

const printTemplateSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    type: { type: String, enum: ['OPD_RECEIPT', 'IPD_INVOICE', 'LAB_REPORT', 'PRESCRIPTION', 'PATIENT_WRISTBAND'], required: true },
    name: { type: String, required: true },
    paperSize: { type: String, enum: ['THERMAL_80MM', 'THERMAL_58MM', 'A4', 'LETTER'], default: 'THERMAL_80MM' },
    headerHtml: { type: String, default: '' },
    footerHtml: { type: String, default: '' },
    styles: { type: String, default: '' },
    isDefault: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PrintTemplate = tenantAwareModel(mongoose.model('PrintTemplate', printTemplateSchema));
