import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ROLES } from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    assignedPasswordHint: { type: String, default: '' },
    role: { type: String, required: true, enum: Object.values(ROLES), index: true },
    specialization: { type: String, default: '' },
    medicalLicenseNo: { type: String, default: '' },
    qualification: { type: String, default: '' },
    consultationFee: { type: Number, default: 0 },
    shiftPattern: { type: String, default: 'ROTATIONAL' },
    avatarUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },       // Doctor on-duty / availability toggle
    availabilityUpdatedAt: { type: Date, default: null }, // When availability was last changed
    cabinNo: { type: String, default: 'Cabin 101' },     // Doctor's assigned OPD cabin/room number
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  // Prevent double hashing if passwordHash is already a valid bcrypt hash
  if (/^\$2[abxy]\$\d+\$/.test(this.passwordHash)) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      id: this._id,
      hospitalId: this.hospitalId,
      branchId: this.branchId,
      role: this.role,
      email: this.email,
      name: this.name,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      id: this._id,
    },
    env.REFRESH_TOKEN_SECRET,
    { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN }
  );
};

export const User = mongoose.model('User', userSchema);
