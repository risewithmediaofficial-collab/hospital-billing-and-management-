import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    subdomain: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ['PENDING_APPROVAL', 'APPROVED', 'SUSPENDED', 'REJECTED', 'EXPIRED', 'DELETED'],
      default: 'PENDING_APPROVAL',
      index: true,
    },
    isDeleted: { type: Boolean, default: false, index: true },
    plan: {
      type: String,
      enum: ['BASIC', 'STANDARD', 'ADVANCED', 'ENTERPRISE', 'CUSTOM', 'STARTER', 'PROFESSIONAL'],
      default: 'PROFESSIONAL',
    },
    subscriptionPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
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
    
    // Trial & SaaS Subscription Management
    isTrial: { type: Boolean, default: true },
    trialStartDate: { type: Date, default: Date.now },
    trialEndDate: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-day free trial
    },
    trialStatus: {
      type: String,
      enum: ['TRIAL_ACTIVE', 'TRIAL_EXPIRING_SOON', 'TRIAL_EXPIRED', 'SUBSCRIPTION_ACTIVE', 'SUSPENDED'],
      default: 'TRIAL_ACTIVE',
      index: true,
    },
    trialRemindersSent: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ '3_days': false, '2_days': false, '1_day': false, '0_days': false }),
    },

    subscriptionStartDate: { type: Date, default: Date.now },
    subscriptionEndDate: { type: Date, default: null },
    
    enabledModules: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ dashboard: true, patientRegistration: true, patients: true, tokens: true, appointments: true, doctors: true, reception: true, nursing: true, laboratory: true, radiology: true, pharmacy: true, billing: true, opd: true, ipd: true, emergency: true, departments: true, staffManagement: true, reports: true, notifications: true, hospitalSettings: true, auditLogs: true, patientPortal: true, guardianPortal: true }),
    },
    enabledDepartments: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    staffLimits: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ hospitalAdmins: 2, doctors: 15, receptionists: 5, nurses: 15, laboratoryStaff: 5, radiologyStaff: 5, pharmacyStaff: 5, billingStaff: 5, totalStaff: 50 }),
    },
    usageLimits: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ monthlyPatients: 10000, monthlyTokens: 10000, monthlyBills: 5000, monthlyAppointments: 5000, storageInGB: 50, branches: 2, departments: 25, notifications: 10000 }),
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Hospital = mongoose.model('Hospital', hospitalSchema);
