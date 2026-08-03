import bcrypt from 'bcryptjs';
import { Hospital } from '../../models/Hospital.js';
import { Branch } from '../../models/Branch.js';
import { User } from '../../models/User.js';
import { Patient } from '../../models/Patient.js';
import { Appointment } from '../../models/Appointment.js';
import { Admission } from '../../models/Admission.js';
import { Invoice } from '../../models/Invoice.js';
import { DiagnosticOrder } from '../../models/DiagnosticOrder.js';
import { Emergency } from '../../models/Emergency.js';
import { Consultation } from '../../models/Consultation.js';
import { AuditLog } from '../../models/AuditLog.js';
import { ROLES } from '../../config/constants.js';
import { ApiError } from '../../utils/apiError.js';

const PLATFORM_CODES = ['PLATFORM', 'PLATFORM-HQ'];

const isPlatformHospital = (hospital) =>
  PLATFORM_CODES.includes(hospital?.code) || hospital?.subdomain === 'platform';

const tenantFilter = () => ({
  code: { $nin: PLATFORM_CODES },
  subdomain: { $ne: 'platform' },
});

const todayDateStr = () => new Date().toISOString().slice(0, 10);

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

const countStaffByRole = async (hospitalId, role) => {
  const query = { role, isActive: true };
  if (hospitalId) query.hospitalId = hospitalId;
  return User.countDocuments(query);
};

const buildStaffCounts = async (hospitalId = null) => {
  const base = hospitalId ? { hospitalId, isActive: true } : { isActive: true };
  const roles = [
    ROLES.HOSPITAL_ADMIN,
    ROLES.DOCTOR,
    ROLES.RECEPTIONIST,
    ROLES.NURSE,
    ROLES.NURSE_INCHARGE,
    ROLES.LAB_TECH,
    ROLES.RADIOLOGIST,
    ROLES.PHARMACIST,
    ROLES.CASHIER,
  ];

  const counts = {};
  await Promise.all(
    roles.map(async (role) => {
      counts[role] = await User.countDocuments({ ...base, role });
    })
  );

  const nurses = counts[ROLES.NURSE] + counts[ROLES.NURSE_INCHARGE];

  return {
    hospitalAdmins: counts[ROLES.HOSPITAL_ADMIN],
    doctors: counts[ROLES.DOCTOR],
    receptionists: counts[ROLES.RECEPTIONIST],
    nurses,
    labStaff: counts[ROLES.LAB_TECH],
    radiologyStaff: counts[ROLES.RADIOLOGIST],
    pharmacyStaff: counts[ROLES.PHARMACIST],
    billingStaff: counts[ROLES.CASHIER],
    totalStaff: Object.values(counts).reduce((a, b) => a + b, 0),
  };
};

const buildPatientCounts = async (hospitalId = null) => {
  const base = hospitalId ? { hospitalId } : {};
  const totalPatients = await Patient.countDocuments(base);
  const ipdPatients = await Admission.countDocuments({
    ...base,
    status: 'ADMITTED',
  });
  const opdPatients = Math.max(0, totalPatients - ipdPatients);

  return { totalPatients, opdPatients, ipdPatients };
};

const buildTodayMetrics = async (hospitalId = null) => {
  const today = todayDateStr();
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const base = hospitalId ? { hospitalId } : {};

  const [
    registrations,
    appointments,
    consultations,
    admissions,
    discharges,
    revenueAgg,
    pendingLab,
    pendingRad,
    pendingBilling,
    emergencies,
  ] = await Promise.all([
    Patient.countDocuments({ ...base, createdAt: { $gte: todayStart, $lte: todayEnd } }),
    Appointment.countDocuments({ ...base, appointmentDate: today }),
    Consultation.countDocuments({ ...base, createdAt: { $gte: todayStart, $lte: todayEnd } }),
    Admission.countDocuments({ ...base, admittedAt: { $gte: todayStart, $lte: todayEnd } }),
    Admission.countDocuments({ ...base, dischargedAt: { $gte: todayStart, $lte: todayEnd } }),
    Invoice.aggregate([
      { $match: { ...base, createdAt: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } },
    ]),
    DiagnosticOrder.countDocuments({
      ...base,
      testCategory: { $in: ['LABORATORY', 'BLOOD_TEST', 'URINE_TEST', 'URINE_ANALYSIS', 'CULTURE_TEST'] },
      status: { $in: ['REQUESTED', 'SAMPLE_COLLECTED', 'IN_PROGRESS'] },
    }),
    DiagnosticOrder.countDocuments({
      ...base,
      testCategory: { $in: ['XRAY', 'MRI', 'CT_SCAN', 'ULTRASOUND', 'ECG', 'ECHO', 'EEG'] },
      status: { $in: ['REQUESTED', 'IN_PROGRESS'] },
    }),
    Invoice.countDocuments({ ...base, status: { $in: ['UNPAID', 'PARTIALLY_PAID'] } }),
    Emergency.countDocuments({ ...base, status: { $in: ['ACTIVE', 'RESPONDING', 'ON_SITE'] } }),
  ]);

  return {
    todayRegistrations: registrations,
    todayAppointments: appointments,
    todayConsultations: consultations,
    todayAdmissions: admissions,
    todayDischarges: discharges,
    todayRevenue: revenueAgg[0]?.total || 0,
    pendingLabReports: pendingLab,
    pendingRadiologyReports: pendingRad,
    pendingBilling,
    emergencyCases: emergencies,
  };
};

export class SaasService {
  static async registerHospital(data) {
    if (!data.contactEmail || !data.hospitalName) {
      throw new ApiError(400, 'Hospital name and contact email are required', null, 'VALIDATION_ERROR');
    }

    const cleanEmail = data.contactEmail.toLowerCase().trim();
    const existingEmail = await Hospital.findOne({ contactEmail: cleanEmail });
    if (existingEmail) {
      throw new ApiError(400, `A hospital application with email '${cleanEmail}' already exists`, null, 'DUPLICATE_EMAIL');
    }

    let rawSubdomain = data.subdomain || data.hospitalName;
    let subdomain = String(rawSubdomain).toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    if (!subdomain) {
      subdomain = `hosp${Date.now().toString(36)}`;
    }
    let code = subdomain.toUpperCase();

    const existingSubdomain = await Hospital.findOne({ subdomain });
    if (existingSubdomain) {
      subdomain = `${subdomain}${Math.floor(100 + Math.random() * 900)}`;
      code = subdomain.toUpperCase();
    }

    const hospital = await Hospital.create({
      name: data.hospitalName.trim(),
      code,
      subdomain,
      status: 'PENDING_APPROVAL',
      plan: data.plan || 'PROFESSIONAL',
      contactName: data.contactName || data.hospitalName || 'Hospital Administrator',
      contactEmail: cleanEmail,
      contactPhone: data.contactPhone || '+1 (555) 000-0000',
      licenseNumber: data.licenseNumber || `LIC-${Date.now()}`,
      address: {
        street: data.street || 'Main Medical St',
        city: data.city || 'Metropolis',
        state: data.state || 'NY',
        country: data.country || 'USA',
      },
      initialAdminPassword: data.adminPassword || 'HospitalAdmin123!',
      isActive: true,
    });

    return {
      hospital,
      adminInitialPassword: hospital.initialAdminPassword,
    };
  }

  static async getAllHospitals(user) {
    return await Hospital.find(tenantFilter()).sort({ createdAt: -1 });
  }

  static async getPlatformMetrics() {
    const hospitals = await Hospital.find(tenantFilter());
    const activeHospitals = hospitals.filter((h) => h.status === 'APPROVED');
    const inactiveHospitals = hospitals.filter((h) => h.status !== 'APPROVED');

    const staffCounts = await buildStaffCounts();
    const patientCounts = await buildPatientCounts();
    const todayMetrics = await buildTodayMetrics();

    const recentHospitals = await Hospital.find(tenantFilter())
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name code status plan contactEmail createdAt');

    const recentActivities = await AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('hospitalId', 'name')
      .populate('userId', 'name email role')
      .lean();

    return {
      totalHospitals: hospitals.length,
      activeHospitals: activeHospitals.length,
      inactiveHospitals: inactiveHospitals.length,
      ...staffCounts,
      ...patientCounts,
      ...todayMetrics,
      recentHospitalRegistrations: recentHospitals,
      recentActivities: recentActivities.map((a) => ({
        id: a._id,
        action: a.action,
        module: a.module,
        details: a.details,
        hospitalName: a.hospitalId?.name || 'Platform',
        userName: a.userId?.name || 'System',
        userRole: a.userRole || a.userId?.role,
        timestamp: a.createdAt,
      })),
    };
  }

  static async getHospitalDetail(hospitalId) {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital || isPlatformHospital(hospital)) {
      throw new ApiError(404, 'Hospital not found', null, 'NOT_FOUND');
    }

    const admin = await User.findOne({
      hospitalId: hospital._id,
      role: ROLES.HOSPITAL_ADMIN,
    }).select('-passwordHash');

    const staffCounts = await buildStaffCounts(hospital._id);
    const patientCounts = await buildPatientCounts(hospital._id);
    const todayMetrics = await buildTodayMetrics(hospital._id);

    const totalStaff = await User.countDocuments({ hospitalId: hospital._id, isActive: true });
    const activeStaff = await User.countDocuments({ hospitalId: hospital._id, isActive: true });
    const inactiveStaff = await User.countDocuments({ hospitalId: hospital._id, isActive: false });

    const adminLastLogin = admin?.lastLoginAt || null;

    return {
      hospital: {
        ...hospital.toObject(),
        administrator: admin
          ? { name: admin.name, email: admin.email, phone: admin.phone, lastLoginAt: admin.lastLoginAt }
          : null,
        registrationDate: hospital.createdAt,
        subscriptionPlan: hospital.plan,
        subscriptionExpiry: null,
        lastLogin: adminLastLogin,
        totalStaff,
        totalPatients: patientCounts.totalPatients,
        todayRevenue: todayMetrics.todayRevenue,
      },
      stats: {
        ...staffCounts,
        ...patientCounts,
        activeStaff,
        inactiveStaff,
        ...todayMetrics,
        todayBills: todayMetrics.pendingBilling,
      },
    };
  }

  static async getAllHospitalAdminOverview() {
    const hospitals = await Hospital.find({ ...tenantFilter(), status: 'APPROVED' }).sort({ name: 1 });

    const overview = await Promise.all(
      hospitals.map(async (hospital) => {
        const staffCounts = await buildStaffCounts(hospital._id);
        const patientCounts = await buildPatientCounts(hospital._id);
        return {
          hospitalId: hospital._id,
          hospitalName: hospital.name,
          hospitalCode: hospital.code,
          status: hospital.status,
          plan: hospital.plan,
          ...staffCounts,
          ...patientCounts,
        };
      })
    );

    return overview;
  }

  static async globalSearch(query, filters = {}) {
    const term = String(query || '').trim();
    if (!term || term.length < 2) {
      return { hospitals: [], doctors: [], staff: [], patients: [], bills: [], departments: [], administrators: [] };
    }

    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const hospitalQuery = { ...tenantFilter(), $or: [{ name: regex }, { code: regex }, { subdomain: regex }] };
    if (filters.hospitalId) hospitalQuery._id = filters.hospitalId;

    const [hospitals, doctors, staff, patients, bills, administrators] = await Promise.all([
      Hospital.find(hospitalQuery).limit(10).select('name code status plan contactEmail'),
      User.find({
        role: ROLES.DOCTOR,
        $or: [{ name: regex }, { email: regex }, { specialization: regex }],
        ...(filters.hospitalId ? { hospitalId: filters.hospitalId } : {}),
      })
        .limit(10)
        .select('name email role specialization hospitalId')
        .populate('hospitalId', 'name'),
      User.find({
        role: { $nin: [ROLES.SUPER_ADMIN, ROLES.PATIENT, ROLES.GUARDIAN] },
        $or: [{ name: regex }, { email: regex }],
        ...(filters.hospitalId ? { hospitalId: filters.hospitalId } : {}),
      })
        .limit(10)
        .select('name email role hospitalId')
        .populate('hospitalId', 'name'),
      Patient.find({
        $or: [{ firstName: regex }, { lastName: regex }, { uhid: regex }, { phone: regex }],
        ...(filters.hospitalId ? { hospitalId: filters.hospitalId } : {}),
      })
        .limit(10)
        .select('firstName lastName uhid phone hospitalId')
        .populate('hospitalId', 'name'),
      Invoice.find({
        invoiceNo: regex,
        ...(filters.hospitalId ? { hospitalId: filters.hospitalId } : {}),
      })
        .limit(10)
        .select('invoiceNo grandTotal status hospitalId')
        .populate('hospitalId', 'name'),
      User.find({
        role: ROLES.HOSPITAL_ADMIN,
        $or: [{ name: regex }, { email: regex }],
      })
        .limit(10)
        .select('name email hospitalId')
        .populate('hospitalId', 'name'),
    ]);

    return {
      hospitals,
      doctors,
      staff,
      patients,
      bills,
      departments: [],
      administrators,
      tokens: [],
    };
  }

  static async getAuditLogs(filters = {}) {
    const query = {};
    if (filters.hospitalId) query.hospitalId = filters.hospitalId;
    if (filters.module) query.module = filters.module;

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50)
      .populate('hospitalId', 'name')
      .populate('userId', 'name email role')
      .lean();

    return logs.map((log) => ({
      id: log._id,
      action: log.action,
      module: log.module,
      details: log.details,
      hospitalName: log.hospitalId?.name || 'Platform',
      userName: log.userId?.name || 'System',
      userRole: log.userRole || log.userId?.role,
      ipAddress: log.ipAddress,
      timestamp: log.createdAt,
    }));
  }

  static async getAllHospitalsWithStats() {
    const hospitals = await Hospital.find(tenantFilter()).sort({ createdAt: -1 });

    return Promise.all(
      hospitals.map(async (hospital) => {
        const admin = await User.findOne({ hospitalId: hospital._id, role: ROLES.HOSPITAL_ADMIN }).select('name email lastLoginAt');
        const totalStaff = await User.countDocuments({ hospitalId: hospital._id, isActive: true });
        const totalPatients = await Patient.countDocuments({ hospitalId: hospital._id });
        const todayStart = startOfToday();
        const todayEnd = endOfToday();
        const revenueAgg = await Invoice.aggregate([
          { $match: { hospitalId: hospital._id, createdAt: { $gte: todayStart, $lte: todayEnd } } },
          { $group: { _id: null, total: { $sum: '$paidAmount' } } },
        ]);

        const now = new Date();
        const isExpired = hospital.status === 'EXPIRED' || (hospital.subscriptionEndDate && new Date(hospital.subscriptionEndDate) < now);

        return {
          ...hospital.toObject(),
          isExpired,
          administrator: admin ? { name: admin.name, email: admin.email } : null,
          registrationDate: hospital.createdAt,
          subscriptionPlan: hospital.plan,
          subscriptionExpiry: hospital.subscriptionEndDate || null,
          lastLogin: admin?.lastLoginAt || null,
          totalStaff,
          totalPatients,
          todayRevenue: revenueAgg[0]?.total || 0,
        };
      })
    );
  }

  static async deleteHospital(hospitalId) {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      throw new ApiError(404, 'Hospital tenant record not found');
    }
    hospital.status = 'DELETED';
    hospital.isDeleted = true;
    hospital.isActive = false;
    await hospital.save();

    await User.updateMany({ hospitalId: hospital._id }, { isActive: false });
    return hospital;
  }

  static async restoreHospital(hospitalId) {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      throw new ApiError(404, 'Hospital tenant record not found');
    }
    hospital.status = 'APPROVED';
    hospital.isDeleted = false;
    hospital.isActive = true;
    await hospital.save();

    await User.updateMany({ hospitalId: hospital._id }, { isActive: true });
    return hospital;
  }

  static async approveHospital(hospitalId, user) {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      throw new ApiError(404, 'Hospital tenant record not found', null, 'NOT_FOUND');
    }

    hospital.status = 'APPROVED';
    await hospital.save();

    // Create Main Branch for this approved hospital
    let branch = await Branch.findOne({ hospitalId: hospital._id });
    if (!branch) {
      branch = await Branch.create({
        hospitalId: hospital._id,
        name: `${hospital.name} Main Branch`,
        branchCode: `${hospital.code}-MAIN`,
        phone: hospital.contactPhone || '+1 (555) 000-0000',
        email: hospital.contactEmail,
        address: hospital.address?.street || 'Main Medical St',
        city: hospital.address?.city || 'Metropolis',
        state: hospital.address?.state || 'NY',
        postalCode: '10001',
        isMainBranch: true,
      });
    }

    // Create or update initial Hospital Admin user account with the requested password
    const adminPassword = hospital.initialAdminPassword || 'HospitalAdmin123!';
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const cleanEmail = hospital.contactEmail.toLowerCase().trim();

    let adminUser = await User.findOne({ email: cleanEmail });
    if (adminUser) {
      adminUser.hospitalId = hospital._id;
      adminUser.branchId = branch._id;
      adminUser.passwordHash = passwordHash;
      adminUser.assignedPasswordHint = adminPassword;
      adminUser.role = ROLES.HOSPITAL_ADMIN;
      adminUser.status = 'ACTIVE';
      adminUser.isActive = true;
      await adminUser.save();
    } else {
      adminUser = await User.create({
        hospitalId: hospital._id,
        branchId: branch._id,
        name: hospital.contactName || 'Hospital Admin',
        email: cleanEmail,
        passwordHash,
        assignedPasswordHint: adminPassword,
        role: ROLES.HOSPITAL_ADMIN,
        phone: hospital.contactPhone || '+1 (555) 000-0000',
        status: 'ACTIVE',
      });
    }

    return {
      hospital,
      adminUser: {
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        tempPassword: adminPassword,
      },
    };
  }

  static async updateHospitalStatus(hospitalId, status, user) {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      throw new ApiError(404, 'Hospital tenant record not found', null, 'NOT_FOUND');
    }

    hospital.status = status;
    await hospital.save();
    return hospital;
  }

  static async updateHospitalConfiguration(hospitalId, data, user, req) {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital || isPlatformHospital(hospital)) {
      throw new ApiError(404, 'Hospital not found', null, 'NOT_FOUND');
    }
    const allowed = ['plan', 'status', 'isActive', 'subscriptionStartDate', 'subscriptionEndDate', 'enabledModules', 'enabledDepartments', 'staffLimits', 'usageLimits'];
    const previousState = {};
    for (const key of allowed) {
      if (data[key] !== undefined) {
        previousState[key] = hospital[key];
        hospital[key] = data[key];
      }
    }
    await hospital.save();
    await AuditLog.create({
      hospitalId: hospital._id, userId: user.id, userRole: user.role,
      action: 'HOSPITAL_CONFIGURATION_UPDATED', module: 'PLATFORM_CONFIGURATION',
      resourceId: String(hospital._id), previousState,
      newState: allowed.reduce((values, key) => (data[key] !== undefined ? { ...values, [key]: hospital[key] } : values), {}),
      details: `Platform configuration updated for ${hospital.name}`,
      ipAddress: req?.ip, endpoint: req?.originalUrl, httpMethod: req?.method,
    });
    return hospital;
  }
}
