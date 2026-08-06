import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    monthlyPrice: { type: Number, required: true, default: 0 },
    yearlyPrice: { type: Number, required: true, default: 0 },
    trialDays: { type: Number, default: 7 },
    // -1 means unlimited patients
    patientLimit: { type: Number, default: 1000 },
    staffLimits: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        hospitalAdmins: 2,
        doctors: 15,
        receptionists: 5,
        nurses: 15,
        laboratoryStaff: 5,
        radiologyStaff: 5,
        pharmacyStaff: 5,
        billingStaff: 5,
        totalStaff: 50,
      }),
    },
    usageLimits: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        monthlyPatients: 1000,
        storageInGB: 50,
        branches: 2,
        departments: 25,
        notifications: 10000,
      }),
    },
    availableModules: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        dashboard: true,
        patientRegistration: true,
        patients: true,
        tokens: true,
        appointments: true,
        doctors: true,
        reception: true,
        nursing: true,
        laboratory: true,
        radiology: true,
        pharmacy: true,
        billing: true,
        opd: true,
        ipd: true,
        emergency: true,
        departments: true,
        staffManagement: true,
        reports: true,
        notifications: true,
        hospitalSettings: true,
        auditLogs: true,
        patientPortal: true,
        guardianPortal: true,
      }),
    },
    supportLevel: { type: String, enum: ['BASIC', 'PRIORITY', '24_7_DEDICATED'], default: 'PRIORITY' },
    backupFrequency: { type: String, enum: ['DAILY', 'HOURLY', 'WEEKLY'], default: 'DAILY' },
    apiAccess: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
