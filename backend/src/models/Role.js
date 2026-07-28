import mongoose from 'mongoose';
import { ROLES } from '../config/constants.js';

const roleSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, enum: Object.values(ROLES) },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    permissions: [{ type: String }],
    defaultRoute: { type: String, required: true },
  },
  { timestamps: true }
);

export const Role = mongoose.model('Role', roleSchema);
