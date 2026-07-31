import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    subdomain: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ['PENDING_APPROVAL', 'APPROVED', 'SUSPENDED', 'REJECTED'],
      default: 'PENDING_APPROVAL',
      index: true,
    },
    plan: {
      type: String,
      enum: ['BASIC', 'STANDARD', 'ADVANCED', 'ENTERPRISE', 'CUSTOM', 'STARTER', 'PROFESSIONAL'],
      default: 'PROFESSIONAL',
    },
    contactName: { type: String, required: true },
    contactEmail: { type: String, required: true },
    contactPhone: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
    },
    initialAdminPassword: { type: String, default: 'HospitalAdmin123!' },
    subscriptionStartDate: { type: Date, default: Date.now },
    subscriptionEndDate: { type: Date, default: null },
    enabledModules: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ dashboard: true, patientRegistration: true, patients: true, tokens: true, appointments: true, doctors: true, reception: true, nursing: true, laboratory: true, radiology: true, pharmacy: true, billing: true, opd: true, ipd: true, emergency: true, departments: true, staffManagement: true, reports: true, notifications: true, hospitalSettings: true, auditLogs: true, patientPortal: true, guardianPortal: true }),
    },
    enabledDepartments: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    staffLimits: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ hospitalAdmins: 1, doctors: 10, receptionists: 5, nurses: 10, laboratoryStaff: 4, radiologyStaff: 3, pharmacyStaff: 4, billingStaff: 3, totalStaff: 40 }),
    },
    usageLimits: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ monthlyPatients: 5000, monthlyTokens: 5000, monthlyBills: 3000, monthlyAppointments: 3000, storageInGB: 20, branches: 1, departments: 20, notifications: 5000 }),
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Hospital = mongoose.model('Hospital', hospitalSchema);
