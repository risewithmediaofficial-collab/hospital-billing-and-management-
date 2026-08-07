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
  const base = hospitalId ? { hospitalId: { $in: [hospitalId, String(hospitalId)] } } : {};

  const [
    hospitalAdmins,
    doctors,
    receptionists,
    nurses,
    labStaff,
    radiologyStaff,
    pharmacyStaff,
    billingStaff,
  ] = await Promise.all([
    User.countDocuments({ ...base, role: { $ne: 'SUPER_ADMIN' }, $or: [{ role: { $in: [ROLES.HOSPITAL_ADMIN, 'HOSPITAL_ADMIN', 'ADMIN'] } }, { additionalRoles: 'HOSPITAL_ADMIN' }] }),
    User.countDocuments({ ...base, role: { $ne: 'SUPER_ADMIN' }, $or: [{ role: { $in: [ROLES.DOCTOR, 'DOCTOR', 'PHYSICIAN'] } }, { additionalRoles: 'DOCTOR' }] }),
    User.countDocuments({ ...base, role: { $ne: 'SUPER_ADMIN' }, $or: [{ role: { $in: [ROLES.RECEPTIONIST, 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK'] } }, { additionalRoles: 'RECEPTIONIST' }] }),
    User.countDocuments({ ...base, role: { $ne: 'SUPER_ADMIN' }, $or: [{ role: { $in: [ROLES.NURSE, 'NURSE', 'NURSE_INCHARGE', 'NURSING', 'NURSE_STAFF'] } }, { additionalRoles: { $in: ['NURSE', 'NURSE_INCHARGE'] } }] }),
    User.countDocuments({ ...base, role: { $ne: 'SUPER_ADMIN' }, $or: [{ role: { $in: [ROLES.LAB_TECH, 'LAB_TECH', 'LABORATORY_STAFF', 'PATHOLOGIST'] } }, { additionalRoles: 'LAB_TECH' }] }),
    User.countDocuments({ ...base, role: { $ne: 'SUPER_ADMIN' }, $or: [{ role: { $in: [ROLES.RADIOLOGIST, 'RADIOLOGIST', 'RADIOLOGY_STAFF'] } }, { additionalRoles: 'RADIOLOGIST' }] }),
    User.countDocuments({ ...base, role: { $ne: 'SUPER_ADMIN' }, $or: [{ role: { $in: [ROLES.PHARMACIST, 'PHARMACIST', 'PHARMACY_STAFF'] } }, { additionalRoles: 'PHARMACIST' }] }),
    User.countDocuments({ ...base, role: { $ne: 'SUPER_ADMIN' }, $or: [{ role: { $in: [ROLES.CASHIER, 'CASHIER', 'BILLING_STAFF', 'ACCOUNTANT'] } }, { additionalRoles: 'CASHIER' }] }),
  ]);

  const totalStaff = await User.countDocuments({ ...base, role: { $nin: ['SUPER_ADMIN', 'PATIENT', 'GUARDIAN'] } });

  return {
    hospitalAdmins,
    doctors,
    receptionists,
    nurses,
    labStaff,
    radiologyStaff,
    pharmacyStaff,
    billingStaff,
    totalStaff,
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
    const existingEmail = await Hospital.findOne({ contactEmail: cleanEmail, isDeleted: { $ne: true } });
    if (existingEmail) {
      throw new ApiError(400, `A hospital application with email '${cleanEmail}' already exists`, null, 'DUPLICATE_EMAIL');
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      throw new ApiError(
        400,
        `A user with email '${cleanEmail}' already exists in the system. If this email belongs to a deleted hospital, please permanently delete it first to free up the email.`,
        null,
        'DUPLICATE_EMAIL'
      );
    }

    let rawSubdomain = data.subdomain || data.hospitalName;
    let subdomain = String(rawSubdomain).toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    if (!subdomain) {
      subdomain = `hosp${Date.now().toString(36)}`;
    }
    let code = subdomain.toUpperCase();

    const existingSubdomain = await Hospital.findOne({ subdomain, isDeleted: { $ne: true } });
    if (existingSubdomain) {
      subdomain = `${subdomain}${Math.floor(100 + Math.random() * 900)}`;
      code = subdomain.toUpperCase();
    }

    const trialStartDate = new Date();
    const trialEndDate = new Date(trialStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const hospital = await Hospital.create({
      name: data.hospitalName.trim(),
      code,
      subdomain,
      status: 'PENDING_APPROVAL',
      plan: data.plan || 'BASIC',
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
      isTrial: true,
      trialStartDate,
      trialEndDate,
      trialStatus: 'TRIAL_ACTIVE',
      isActive: true,
    });

    // Create Notification for Super Admin
    const { NotificationService } = await import('../notifications/notification.service.js');
    await NotificationService.createNotification({
      recipientRole: 'SUPER_ADMIN',
      hospitalId: hospital._id,
      title: `New Hospital Registration: ${hospital.name}`,
      message: `Hospital ${hospital.name} (Code: ${hospital.code}) registered by ${hospital.contactName} (${hospital.contactEmail}, ${hospital.contactPhone}) on ${trialStartDate.toLocaleString()}. 7-Day Free Trial ends on ${trialEndDate.toLocaleDateString()}.`,
      type: 'REGISTRATION',
      link: '/admin/pending-approvals',
      metadata: {
        hospitalId: hospital._id,
        hospitalName: hospital.name,
        contactName: hospital.contactName,
        contactEmail: hospital.contactEmail,
        contactPhone: hospital.contactPhone,
        trialStatus: 'TRIAL_ACTIVE',
        trialExpiryDate: trialEndDate,
      },
    });

    // Real-time Socket.IO emission to Super Admin online consoles
    try {
      const { socketManager } = await import('../../events/socketManager.js');
      socketManager.emitToRole('SUPER_ADMIN', 'workflow:notification', {
        title: `🏥 New Hospital Application: ${hospital.name}`,
        message: `New hospital '${hospital.name}' registered by ${hospital.contactName} (${hospital.contactEmail}). Awaiting Super Admin approval.`,
        type: 'REGISTRATION',
        linkedPath: '/admin/pending-approvals',
        event: 'HOSPITAL_REGISTERED',
        timestamp: new Date().toISOString(),
      });
      if (socketManager.io) {
        socketManager.io.emit('saas:pending_changed', { hospitalId: hospital._id, action: 'NEW_REGISTRATION' });
      }
    } catch (e) {
      console.error('Socket emission failed on hospital registration:', e.message);
    }

    // Audit Log Entry
    await AuditLog.create({
      hospitalId: hospital._id,
      action: 'HOSPITAL_REGISTRATION',
      module: 'SAAS',
      details: `New hospital '${hospital.name}' registered with 7-day free trial ending ${trialEndDate.toLocaleDateString()}`,
    });

    return {
      hospital,
      adminInitialPassword: hospital.initialAdminPassword,
      trialEndDate,
    };
  }

  static async getAllHospitals(user) {
    return await Hospital.find(tenantFilter()).sort({ createdAt: -1 });
  }

  static async getPendingApprovals() {
    const hospitals = await Hospital.find({
      ...tenantFilter(),
      status: { $in: ['PENDING_APPROVAL', 'PENDING'] },
      isDeleted: { $ne: true },
    }).sort({ createdAt: -1 });
    return hospitals;
  }

  static async getSubscriptionAlerts() {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Paid plans expiring within 7 days
    const expiringSoon = await Hospital.find({
      ...tenantFilter(),
      isDeleted: { $ne: true },
      isTrial: false,
      subscriptionEndDate: { $ne: null, $gte: now, $lte: sevenDaysFromNow },
    }).sort({ subscriptionEndDate: 1 });

    // Already expired
    const expired = await Hospital.find({
      ...tenantFilter(),
      isDeleted: { $ne: true },
      status: 'EXPIRED',
    }).sort({ subscriptionEndDate: -1 }).limit(20);

    // Trials expiring within 7 days
    const trialsExpiringSoon = await Hospital.find({
      ...tenantFilter(),
      isDeleted: { $ne: true },
      isTrial: true,
      status: 'APPROVED',
      trialEndDate: { $ne: null, $gte: now, $lte: sevenDaysFromNow },
    }).sort({ trialEndDate: 1 });

    return {
      expiringSoon,
      expired,
      trialsExpiringSoon,
    };
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

    const hospitalObjId = hospital._id;
    const hospitalStrId = String(hospital._id);
    const hospitalFilter = { hospitalId: { $in: [hospitalObjId, hospitalStrId] } };

    const totalStaffCount = await User.countDocuments({ ...hospitalFilter, role: { $ne: 'SUPER_ADMIN' } });
    const activeStaff = await User.countDocuments({ ...hospitalFilter, role: { $ne: 'SUPER_ADMIN' }, isActive: true });
    const inactiveStaff = await User.countDocuments({ ...hospitalFilter, role: { $ne: 'SUPER_ADMIN' }, isActive: false });

    // Fetch all staff members created for this hospital
    const rawStaff = await User.find({ ...hospitalFilter, role: { $ne: 'SUPER_ADMIN' } })
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch invoices for revenue calculations
    const invoices = await Invoice.find({ hospitalId: hospital._id }).lean();
    const totalHospitalRevenue = invoices.reduce((sum, inv) => sum + (inv.paidAmount || inv.grandTotal || 0), 0);

    const consultations = await Consultation.find({ hospitalId: hospital._id }).lean();
    const appointments = await Appointment.find({ hospitalId: hospital._id }).lean();

    const staffList = rawStaff.map((s) => {
      let patientsHandled = 0;
      let revenueGenerated = 0;

      if (s.role === ROLES.DOCTOR) {
        patientsHandled = consultations.filter((c) => String(c.doctorId) === String(s._id)).length;
        revenueGenerated = invoices
          .filter((inv) => String(inv.doctorId) === String(s._id))
          .reduce((sum, inv) => sum + (inv.paidAmount || inv.grandTotal || 0), 0);
      } else if (s.role === ROLES.RECEPTIONIST) {
        patientsHandled = appointments.filter((a) => String(a.createdBy || a.receptionistId) === String(s._id)).length;
      } else {
        revenueGenerated = invoices
          .filter((inv) => String(inv.createdBy || inv.cashierId) === String(s._id))
          .reduce((sum, inv) => sum + (inv.paidAmount || inv.grandTotal || 0), 0);
      }

      const credentialHint = s.assignedPasswordHint || hospital.initialAdminPassword || `${s.role.charAt(0) + s.role.slice(1).toLowerCase()}123!`;

      return {
        ...s,
        credentialHint,
        patientsHandled,
        revenueGenerated,
      };
    });

    const patientList = await Patient.find({
      $or: [
        { hospitalId: { $in: [hospitalObjId, hospitalStrId] } },
        { hospitalId: { $exists: false } },
        { hospitalId: null }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

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
        totalStaff: totalStaffCount,
        totalPatients: patientCounts.totalPatients,
        todayRevenue: todayMetrics.todayRevenue,
        totalHospitalRevenue,
      },
      stats: {
        ...staffCounts,
        ...patientCounts,
        activeStaff,
        inactiveStaff,
        ...todayMetrics,
        todayBills: todayMetrics.pendingBilling,
        totalHospitalRevenue,
      },
      staffList,
      patientList,
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

  static async permanentlyDeleteHospital(hospitalId) {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      throw new ApiError(404, 'Hospital tenant record not found');
    }

    await Hospital.findByIdAndDelete(hospitalId);

    const collections = [
      'Branch',
      'Department',
      'User',
      'Patient',
      'Appointment',
      'Consultation',
      'Prescription',
      'Invoice',
      'Receipt',
      'DiagnosticOrder',
      'Bed',
      'Emergency',
      'NurseTask',
      'PatientRequest',
      'AuditLog',
      'Notification',
      'Medicine',
      'MedicineBatch',
      'GuardianLink',
      'DoctorUpdate'
    ];

    const mongoose = (await import('mongoose')).default;
    for (const colName of collections) {
      try {
        if (mongoose.models[colName]) {
          await mongoose.models[colName].deleteMany({ hospitalId });
        }
      } catch (err) {
        console.error(`Failed to delete records in ${colName} for hospital ${hospitalId}:`, err.message);
      }
    }

    return { success: true, hospitalId };
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

  // ── SUBSCRIPTION PLAN MANAGEMENT ──
  static async createSubscriptionPlan(data, user) {
    const { SubscriptionPlan } = await import('../../models/SubscriptionPlan.js');
    if (!data.name || !data.code) {
      throw new ApiError(400, 'Plan name and unique plan code are required.', null, 'VALIDATION_ERROR');
    }
    const code = String(data.code).toUpperCase().trim();
    const existing = await SubscriptionPlan.findOne({ code });
    if (existing) {
      throw new ApiError(400, `Subscription plan with code '${code}' already exists.`, null, 'DUPLICATE_CODE');
    }
    const plan = await SubscriptionPlan.create({ ...data, code });
    return plan;
  }

  static async getAllSubscriptionPlans() {
    const { SubscriptionPlan } = await import('../../models/SubscriptionPlan.js');
    let plans = await SubscriptionPlan.find({ code: { $in: ['BASIC', 'STANDARD', 'UNLIMITED'] } }).sort({ monthlyPrice: 1 });
    if (plans.length < 3) {
      // Clear old plans and seed the 3-tier pricing
      await SubscriptionPlan.deleteMany({ code: { $in: ['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'BASIC', 'STANDARD', 'UNLIMITED'] } });
      plans = await SubscriptionPlan.insertMany([
        {
          name: 'BASIC PLAN',
          code: 'BASIC',
          description: 'For small clinics — register and bill up to 100 patients per month',
          monthlyPrice: 4000,
          yearlyPrice: 40000,
          trialDays: 7,
          patientLimit: 100,
          staffLimits: { hospitalAdmins: 1, doctors: 5, receptionists: 2, nurses: 5, laboratoryStaff: 2, radiologyStaff: 2, pharmacyStaff: 2, billingStaff: 2, totalStaff: 20 },
          usageLimits: { monthlyPatients: 100, storageInGB: 10, branches: 1, departments: 10, notifications: 1000 },
          supportLevel: 'BASIC',
          backupFrequency: 'WEEKLY',
          apiAccess: false,
          isDefault: true,
        },
        {
          name: 'STANDARD PLAN',
          code: 'STANDARD',
          description: 'For growing hospitals — register and bill up to 1,000 patients per month',
          monthlyPrice: 30000,
          yearlyPrice: 300000,
          trialDays: 7,
          patientLimit: 1000,
          staffLimits: { hospitalAdmins: 2, doctors: 20, receptionists: 8, nurses: 20, laboratoryStaff: 8, radiologyStaff: 8, pharmacyStaff: 8, billingStaff: 8, totalStaff: 80 },
          usageLimits: { monthlyPatients: 1000, storageInGB: 50, branches: 3, departments: 25, notifications: 10000 },
          supportLevel: 'PRIORITY',
          backupFrequency: 'DAILY',
          apiAccess: true,
          isDefault: false,
        },
        {
          name: 'UNLIMITED PLAN',
          code: 'UNLIMITED',
          description: 'For large hospital networks — unlimited patients with full platform access',
          monthlyPrice: 50000,
          yearlyPrice: 500000,
          trialDays: 7,
          patientLimit: -1,
          staffLimits: { hospitalAdmins: 5, doctors: 100, receptionists: 30, nurses: 100, laboratoryStaff: 30, radiologyStaff: 30, pharmacyStaff: 30, billingStaff: 30, totalStaff: 500 },
          usageLimits: { monthlyPatients: -1, storageInGB: 500, branches: 20, departments: 100, notifications: 100000 },
          supportLevel: '24_7_DEDICATED',
          backupFrequency: 'HOURLY',
          apiAccess: true,
          isDefault: false,
        },
      ]);
    }
    return plans;
  }

  static async updateSubscriptionPlan(planId, data, user) {
    const { SubscriptionPlan } = await import('../../models/SubscriptionPlan.js');
    const plan = await SubscriptionPlan.findByIdAndUpdate(planId, data, { new: true });
    if (!plan) throw new ApiError(404, 'Subscription plan not found', null, 'NOT_FOUND');
    return plan;
  }

  static async extendHospitalTrial(hospitalId, extraDays = 7, user) {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) throw new ApiError(404, 'Hospital tenant not found', null, 'NOT_FOUND');

    const currentEnd = hospital.trialEndDate && new Date(hospital.trialEndDate) > new Date()
      ? new Date(hospital.trialEndDate)
      : new Date();
    
    hospital.trialEndDate = new Date(currentEnd.getTime() + Number(extraDays) * 24 * 60 * 60 * 1000);
    hospital.trialStatus = 'TRIAL_ACTIVE';
    hospital.isTrial = true;
    hospital.status = 'APPROVED';
    await hospital.save();

    const { NotificationService } = await import('../notifications/notification.service.js');
    await NotificationService.createNotification({
      recipientRole: 'HOSPITAL_ADMIN',
      hospitalId: hospital._id,
      title: 'Free Trial Extended!',
      message: `Your hospital free trial has been extended by ${extraDays} days. New trial expiry date: ${hospital.trialEndDate.toLocaleDateString()}.`,
      type: 'TRIAL_STARTED',
    });

    await AuditLog.create({
      hospitalId: hospital._id,
      userId: user.id,
      userRole: user.role,
      action: 'TRIAL_EXTENDED',
      module: 'SAAS',
      details: `Super Admin extended trial for ${hospital.name} by ${extraDays} days until ${hospital.trialEndDate.toLocaleDateString()}`,
    });

    return hospital;
  }

  static async assignPlanToHospital(hospitalId, { planCode, billingCycle = 'MONTHLY' }, user) {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) throw new ApiError(404, 'Hospital tenant not found', null, 'NOT_FOUND');

    const { SubscriptionPlan } = await import('../../models/SubscriptionPlan.js');
    const plan = await SubscriptionPlan.findOne({ code: String(planCode).toUpperCase() });
    if (!plan) throw new ApiError(404, `Subscription plan '${planCode}' not found`, null, 'NOT_FOUND');

    const months = billingCycle === 'YEARLY' ? 12 : 1;
    hospital.plan = plan.code;
    hospital.subscriptionPlanId = plan._id;
    hospital.isTrial = false;
    hospital.trialStatus = 'SUBSCRIPTION_ACTIVE';
    hospital.status = 'APPROVED';
    hospital.subscriptionStartDate = new Date();
    hospital.subscriptionEndDate = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);
    hospital.staffLimits = plan.staffLimits;
    hospital.usageLimits = plan.usageLimits;
    hospital.enabledModules = plan.availableModules;
    await hospital.save();

    const { NotificationService } = await import('../notifications/notification.service.js');
    await NotificationService.createNotification({
      recipientRole: 'HOSPITAL_ADMIN',
      hospitalId: hospital._id,
      title: 'Subscription Activated!',
      message: `Your hospital is now subscribed to the ${plan.name} (${billingCycle}). Active until ${hospital.subscriptionEndDate.toLocaleDateString()}.`,
      type: 'SUBSCRIPTION_ACTIVATED',
    });

    await AuditLog.create({
      hospitalId: hospital._id,
      userId: user.id,
      userRole: user.role,
      action: 'SUBSCRIPTION_PURCHASED',
      module: 'SAAS',
      details: `Plan '${plan.name}' assigned to ${hospital.name} until ${hospital.subscriptionEndDate.toLocaleDateString()}`,
    });

    return hospital;
  }

  // ── AUTOMATED SUBSCRIPTION EXPIRY & 7-DAY WARNING ──
  static async evaluateSubscriptionExpiry() {
    const hospitals = await Hospital.find({ isDeleted: false, isTrial: false, subscriptionEndDate: { $ne: null } });
    const now = new Date();
    const { NotificationService } = await import('../notifications/notification.service.js');

    for (const hosp of hospitals) {
      if (!hosp.subscriptionEndDate) continue;

      const diffTime = new Date(hosp.subscriptionEndDate) - now;
      const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const warnings = hosp.subscriptionWarningsSent || { '7_days': false, '3_days': false, '1_day': false, '0_days': false };

      // Expired — set data retention deadline (90 days)
      if (remainingDays <= 0 && hosp.status !== 'EXPIRED') {
        hosp.status = 'EXPIRED';
        hosp.trialStatus = 'TRIAL_EXPIRED';
        const retentionDeadline = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        hosp.dataRetentionDeadline = retentionDeadline;
        warnings['0_days'] = true;
        hosp.subscriptionWarningsSent = warnings;
        await hosp.save();

        await NotificationService.createNotification({
          recipientRole: 'HOSPITAL_ADMIN',
          hospitalId: hosp._id,
          title: 'Subscription Expired',
          message: `Your ${hosp.plan} plan has expired. Your data will be retained for 90 days until ${retentionDeadline.toLocaleDateString()}. Please renew your subscription to restore access.`,
          type: 'TRIAL_EXPIRED',
        });

        await NotificationService.createNotification({
          recipientRole: 'SUPER_ADMIN',
          hospitalId: hosp._id,
          title: `Subscription Expired: ${hosp.name}`,
          message: `${hosp.plan} plan for ${hosp.name} (${hosp.contactEmail}) expired today. Data retention period: 90 days until ${retentionDeadline.toLocaleDateString()}.`,
          type: 'TRIAL_EXPIRED',
          link: `/admin/hospital/${hosp._id}/dashboard`,
        });
      } else if (remainingDays <= 7 && !warnings['7_days']) {
        // 7-day warning
        warnings['7_days'] = true;
        hosp.subscriptionWarningsSent = warnings;
        await hosp.save();

        await NotificationService.createNotification({
          recipientRole: 'HOSPITAL_ADMIN',
          hospitalId: hosp._id,
          title: 'Subscription Expiring in 7 Days!',
          message: `Your ${hosp.plan} subscription expires on ${new Date(hosp.subscriptionEndDate).toLocaleDateString()}. Renew now to avoid service interruption.`,
          type: 'TRIAL_EXPIRING',
        });

        await NotificationService.createNotification({
          recipientRole: 'SUPER_ADMIN',
          hospitalId: hosp._id,
          title: `⚠️ Plan Expiring Soon: ${hosp.name}`,
          message: `${hosp.name}'s ${hosp.plan} plan expires in ${remainingDays} days on ${new Date(hosp.subscriptionEndDate).toLocaleDateString()}. Contact them to renew.`,
          type: 'TRIAL_EXPIRING',
          link: `/admin/hospital/${hosp._id}/dashboard`,
        });
      } else if (remainingDays <= 3 && !warnings['3_days']) {
        warnings['3_days'] = true;
        hosp.subscriptionWarningsSent = warnings;
        await hosp.save();

        await NotificationService.createNotification({
          recipientRole: 'HOSPITAL_ADMIN',
          hospitalId: hosp._id,
          title: `Subscription Expiring in ${remainingDays} Days!`,
          message: `URGENT: Your ${hosp.plan} plan expires in ${remainingDays} days. Renew immediately to prevent data access interruption.`,
          type: 'TRIAL_EXPIRING',
        });
      } else if (remainingDays <= 1 && !warnings['1_day']) {
        warnings['1_day'] = true;
        hosp.subscriptionWarningsSent = warnings;
        await hosp.save();

        await NotificationService.createNotification({
          recipientRole: 'HOSPITAL_ADMIN',
          hospitalId: hosp._id,
          title: 'Subscription Expires Tomorrow!',
          message: `FINAL WARNING: Your ${hosp.plan} plan expires tomorrow. Renew immediately to avoid loss of access.`,
          type: 'TRIAL_EXPIRING',
        });
      }
    }

    // Check 90-day data retention deadlines — notify super admin before purge
    const expiringRetention = await Hospital.find({
      isDeleted: false,
      dataRetentionDeadline: { $ne: null, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      dataRetentionNotified: { $ne: true },
    });
    for (const hosp of expiringRetention) {
      const daysLeft = Math.ceil((new Date(hosp.dataRetentionDeadline) - now) / (1000 * 60 * 60 * 24));
      hosp.dataRetentionNotified = true;
      await hosp.save();
      await NotificationService.createNotification({
        recipientRole: 'SUPER_ADMIN',
        hospitalId: hosp._id,
        title: `⚠️ Data Deletion in ${daysLeft} Days: ${hosp.name}`,
        message: `${hosp.name}'s 90-day data retention period ends on ${new Date(hosp.dataRetentionDeadline).toLocaleDateString()}. All hospital data will be permanently deleted unless they renew.`,
        type: 'TRIAL_EXPIRED',
        link: `/admin/hospital/${hosp._id}/dashboard`,
      });
    }
  }

  // ── AUTOMATED TRIAL EXPIRY & REMINDERS EVALUATOR ──
  static async evaluateHospitalTrials() {
    const hospitals = await Hospital.find({ isDeleted: false });
    const now = new Date();
    const { NotificationService } = await import('../notifications/notification.service.js');

    for (const hosp of hospitals) {
      if (!hosp.isTrial || !hosp.trialEndDate) continue;

      const diffTime = hosp.trialEndDate - now;
      const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const reminders = hosp.trialRemindersSent || { '3_days': false, '2_days': false, '1_day': false, '0_days': false };

      if (remainingDays <= 0 && hosp.trialStatus !== 'TRIAL_EXPIRED') {
        hosp.trialStatus = 'TRIAL_EXPIRED';
        hosp.status = 'EXPIRED';
        reminders['0_days'] = true;
        hosp.trialRemindersSent = reminders;
        await hosp.save();

        await NotificationService.createNotification({
          recipientRole: 'HOSPITAL_ADMIN',
          hospitalId: hosp._id,
          title: 'Free Trial Expired',
          message: `Your free trial has ended. Please renew your subscription to continue using the Hospital Billing & Management System. All your hospital data is safe.`,
          type: 'TRIAL_EXPIRED',
        });

        await NotificationService.createNotification({
          recipientRole: 'SUPER_ADMIN',
          hospitalId: hosp._id,
          title: `Trial Expired: ${hosp.name}`,
          message: `Free trial for ${hosp.name} (Admin: ${hosp.contactEmail}) has expired today.`,
          type: 'TRIAL_EXPIRED',
          link: `/admin/hospital/${hosp._id}/dashboard`,
        });
      } else if (remainingDays === 1 && !reminders['1_day']) {
        hosp.trialStatus = 'TRIAL_EXPIRING_SOON';
        reminders['1_day'] = true;
        hosp.trialRemindersSent = reminders;
        await hosp.save();

        await NotificationService.createNotification({
          recipientRole: 'HOSPITAL_ADMIN',
          hospitalId: hosp._id,
          title: 'Trial Expires Tomorrow!',
          message: `Your hospital free trial will expire in 1 day. Subscribe now to continue uninterrupted access.`,
          type: 'TRIAL_EXPIRING',
        });
      } else if (remainingDays === 2 && !reminders['2_days']) {
        hosp.trialStatus = 'TRIAL_EXPIRING_SOON';
        reminders['2_days'] = true;
        hosp.trialRemindersSent = reminders;
        await hosp.save();

        await NotificationService.createNotification({
          recipientRole: 'HOSPITAL_ADMIN',
          hospitalId: hosp._id,
          title: 'Trial Expiring in 2 Days',
          message: `Your hospital free trial will expire in 2 days. Subscribe now to continue uninterrupted access.`,
          type: 'TRIAL_EXPIRING',
        });
      } else if (remainingDays === 3 && !reminders['3_days']) {
        hosp.trialStatus = 'TRIAL_EXPIRING_SOON';
        reminders['3_days'] = true;
        hosp.trialRemindersSent = reminders;
        await hosp.save();

        await NotificationService.createNotification({
          recipientRole: 'HOSPITAL_ADMIN',
          hospitalId: hosp._id,
          title: 'Trial Expiring in 3 Days',
          message: `Your hospital free trial will expire in 3 days. Subscribe now to continue uninterrupted access.`,
          type: 'TRIAL_EXPIRING',
        });
      }
    }
  }

  static async updateHospitalAdminCredentials(hospitalId, data) {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      throw new ApiError(404, 'Hospital not found');
    }

    const { name, email, password } = data;
    const cleanEmail = email ? email.toLowerCase().trim() : '';

    const hospitalObjId = hospital._id;
    const hospitalStrId = String(hospital._id);

    let adminUser = await User.findOne({
      $or: [
        { hospitalId: { $in: [hospitalObjId, hospitalStrId, hospitalId] }, role: { $in: [ROLES.HOSPITAL_ADMIN, 'HOSPITAL_ADMIN', 'ADMIN', 'SUPER_ADMIN'] } },
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(hospital.contactEmail ? [{ email: hospital.contactEmail.toLowerCase() }] : []),
      ]
    });

    if (cleanEmail) {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser && existingUser._id.toString() !== adminUser?._id?.toString()) {
        throw new ApiError(400, `A user with email '${cleanEmail}' already exists in the system.`);
      }
    }

    const cleanPassword = password ? String(password).trim() : '';

    if (!adminUser) {
      const pass = cleanPassword || hospital.initialAdminPassword || 'HospitalAdmin123!';
      const passwordHash = await bcrypt.hash(pass, 12);
      adminUser = await User.create({
        hospitalId: hospital._id,
        name: name || hospital.contactName || 'Hospital Admin',
        email: cleanEmail || hospital.contactEmail,
        passwordHash,
        assignedPasswordHint: pass,
        role: ROLES.HOSPITAL_ADMIN || 'HOSPITAL_ADMIN',
        phone: hospital.contactPhone || '+1 (555) 000-0000',
        status: 'ACTIVE',
      });
    } else {
      if (name) adminUser.name = name;
      if (cleanEmail) adminUser.email = cleanEmail;
      if (!adminUser.phone) adminUser.phone = hospital.contactPhone || '+1 (555) 000-0000';
      if (!adminUser.role) adminUser.role = ROLES.HOSPITAL_ADMIN || 'HOSPITAL_ADMIN';
      if (cleanPassword) {
        adminUser.passwordHash = cleanPassword;
        adminUser.assignedPasswordHint = cleanPassword;
      }
      await adminUser.save();
    }

    if (name) hospital.contactName = name;
    if (cleanEmail) hospital.contactEmail = cleanEmail;
    if (!hospital.contactPhone) hospital.contactPhone = adminUser.phone || '+1 (555) 000-0000';
    if (!hospital.licenseNumber) hospital.licenseNumber = 'LIC-' + (hospital.code || 'DEFAULT');
    if (cleanPassword) hospital.initialAdminPassword = cleanPassword;
    await hospital.save();

    return {
      hospital,
      adminUser: {
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        assignedPasswordHint: adminUser.assignedPasswordHint
      }
    };
  }
}

