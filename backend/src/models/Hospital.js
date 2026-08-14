import mongoose from 'mongoose';

export const RESERVED_DOMAINS = [
  'admin', 'api', 'login', 'super-admin', 'superadmin', 'system', 'settings', 'assets', 'static', 'dashboard', 'public'
];

export function sanitizeAndValidateDomain(inputDomain) {
  if (!inputDomain || !String(inputDomain).trim()) {
    throw new Error('Hospital Domain / URL Name is required.');
  }
  const clean = String(inputDomain).toLowerCase().trim();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(clean)) {
    throw new Error('Domain must contain only lowercase letters, numbers, and single hyphens (e.g. guman, citygeneral, apollo-hosur).');
  }
  if (RESERVED_DOMAINS.includes(clean)) {
    throw new Error(`The domain name '${clean}' is a reserved platform route and cannot be used by a hospital.`);
  }
  return clean;
}

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    domain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
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
      enum: ['BASIC', 'STANDARD', 'UNLIMITED', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'ADVANCED', 'CUSTOM'],
      default: 'BASIC',
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
      country: { type: String, default: 'India' },
      postalCode: { type: String, default: '' },
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

    // Subscription expiry warnings (7 days before paid plan expires)
    subscriptionWarningsSent: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ '7_days': false, '3_days': false, '1_day': false, '0_days': false }),
    },

    // 90-day data retention: set when subscription expires; data purged after this date
    dataRetentionDeadline: { type: Date, default: null },
    dataRetentionNotified: { type: Boolean, default: false },

    enabledModules: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        dashboard: true, patientRegistration: true, patients: true, tokens: true,
        appointments: true, doctors: true, reception: true, nursing: true,
        laboratory: true, radiology: true, pharmacy: true, billing: true,
        opd: true, ipd: true, emergency: true, departments: true,
        staffManagement: true, reports: true, notifications: true,
        hospitalSettings: true, auditLogs: true, patientPortal: true, guardianPortal: true,
      }),
    },
    enabledDepartments: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    staffLimits: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        hospitalAdmins: 2, doctors: 10, receptionists: 5, nurses: 10,
        laboratoryStaff: 5, radiologyStaff: 5, pharmacyStaff: 5, billingStaff: 5, totalStaff: 50,
      }),
    },
    usageLimits: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        monthlyPatients: 100, monthlyTokens: 100, monthlyBills: 100,
        monthlyAppointments: 100, storageInGB: 10, branches: 1, departments: 10, notifications: 1000,
      }),
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Hospital = mongoose.model('Hospital', hospitalSchema);
