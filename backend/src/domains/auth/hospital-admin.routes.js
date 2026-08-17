import { Router } from 'express';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { requireRole } from '../../middleware/permissions.js';
import { ROLES } from '../../config/constants.js';
import { AuditLog } from '../../models/AuditLog.js';
import { Hospital } from '../../models/Hospital.js';
import { User } from '../../models/User.js';
import { Patient } from '../../models/Patient.js';
import { Appointment } from '../../models/Appointment.js';
import { Admission } from '../../models/Admission.js';
import { Invoice } from '../../models/Invoice.js';
import { Consultation } from '../../models/Consultation.js';
import { sendSuccess } from '../../utils/apiResponse.js';

const router = Router();
const adminOrSuper = [verifyJwt, requireRole(ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN)];

// ─── Hospital Admin Dashboard Summary ─────────────────────────────────────────
router.get('/overview', ...adminOrSuper, async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    if (!hospitalId) return res.status(400).json({ message: 'Hospital context required' });

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const base = { hospitalId };

    const [
      totalStaff,
      totalPatients,
      todayRegistrations,
      todayConsultations,
      activeAdmissions,
      todayRevenueAgg,
      pendingBilling,
    ] = await Promise.all([
      User.countDocuments({ ...base, role: { $nin: ['SUPER_ADMIN', 'PATIENT', 'GUARDIAN'] }, isActive: true }),
      Patient.countDocuments(base),
      Patient.countDocuments({ ...base, createdAt: { $gte: todayStart, $lte: todayEnd } }),
      Consultation.countDocuments({ ...base, createdAt: { $gte: todayStart, $lte: todayEnd } }),
      Admission.countDocuments({ ...base, status: 'ADMITTED' }),
      Invoice.aggregate([{ $match: { ...base, createdAt: { $gte: todayStart, $lte: todayEnd }, status: 'PAID' } }, { $group: { _id: null, total: { $sum: '$paidAmount' } } }]).catch(() => []),
      Invoice.countDocuments({ ...base, status: { $in: ['UNPAID', 'PARTIALLY_PAID'] } }),
    ]);

    return sendSuccess(res, 200, 'Hospital admin overview', {
      totalStaff,
      totalPatients,
      todayRegistrations,
      todayConsultations,
      activeAdmissions,
      todayRevenue: todayRevenueAgg[0]?.total || 0,
      pendingBilling,
    });
  } catch (err) { next(err); }
});

// ─── Hospital Audit Logs ────────────────────────────────────────────────────
router.get('/audit-logs', ...adminOrSuper, async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    if (!hospitalId) return res.status(400).json({ message: 'Hospital context required' });

    const { module, limit = 100, page = 1 } = req.query;
    const query = { hospitalId };
    if (module && module !== 'ALL') query.module = module;

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'name email role')
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    const formatted = logs.map((log) => ({
      id: log._id,
      action: log.action,
      module: log.module,
      details: log.details,
      userName: log.userId?.name || 'System',
      userEmail: log.userId?.email || '',
      userRole: log.userRole || log.userId?.role || '',
      ipAddress: log.ipAddress || '',
      endpoint: log.endpoint || '',
      httpMethod: log.httpMethod || '',
      resourceId: log.resourceId || '',
      timestamp: log.createdAt,
    }));

    return sendSuccess(res, 200, 'Audit logs retrieved', { logs: formatted, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
});

// ─── Plan Details & Subscription Status ────────────────────────────────────
router.get('/plan-details', ...adminOrSuper, async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    const hospital = await Hospital.findById(hospitalId)
      .populate('subscriptionPlanId', 'name description price billingCycle features maxStaff maxPatients maxBranches')
      .lean();
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    return sendSuccess(res, 200, 'Plan details retrieved', {
      hospitalName: hospital.name,
      plan: hospital.plan,
      isTrial: hospital.isTrial,
      trialStatus: hospital.trialStatus,
      trialStartDate: hospital.trialStartDate,
      trialEndDate: hospital.trialEndDate,
      subscriptionStartDate: hospital.subscriptionStartDate,
      subscriptionEndDate: hospital.subscriptionEndDate,
      enabledModules: hospital.enabledModules,
      staffLimits: hospital.staffLimits,
      usageLimits: hospital.usageLimits,
      subscriptionPlan: hospital.subscriptionPlanId || null,
    });
  } catch (err) { next(err); }
});

// ─── Usage & Limits Live Check ─────────────────────────────────────────────
router.get('/usage-limits', ...adminOrSuper, async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    const hospital = await Hospital.findById(hospitalId).lean();
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const base = { hospitalId };
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const now = new Date();

    const [
      totalStaff,
      totalPatients,
      monthPatients,
      monthAppointments,
      monthBills,
      activeAdmissions,
    ] = await Promise.all([
      User.countDocuments({ ...base, role: { $nin: ['SUPER_ADMIN', 'PATIENT', 'GUARDIAN'] }, isActive: true }),
      Patient.countDocuments(base),
      Patient.countDocuments({ ...base, createdAt: { $gte: monthStart, $lte: now } }),
      Appointment.countDocuments({ ...base, createdAt: { $gte: monthStart, $lte: now } }),
      Invoice.countDocuments({ ...base, createdAt: { $gte: monthStart, $lte: now } }),
      Admission.countDocuments({ ...base, status: 'ADMITTED' }),
    ]);

    const limits = hospital.staffLimits || {};
    const usageLimits = hospital.usageLimits || {};

    return sendSuccess(res, 200, 'Usage and limits retrieved', {
      usage: {
        totalStaff,
        totalPatients,
        monthPatients,
        monthAppointments,
        monthBills,
        activeAdmissions,
      },
      limits: {
        totalStaff: limits.totalStaff || 50,
        monthlyPatients: usageLimits.monthlyPatients || 100,
        monthlyAppointments: usageLimits.monthlyAppointments || 100,
        monthlyBills: usageLimits.monthlyBills || 100,
        branches: usageLimits.branches || 1,
        departments: usageLimits.departments || 10,
        storageInGB: usageLimits.storageInGB || 10,
      },
    });
  } catch (err) { next(err); }
});

// ─── Hospital Settings / Tariff Overview ──────────────────────────────────
router.get('/settings', ...adminOrSuper, async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    const hospital = await Hospital.findById(hospitalId).lean();
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    return sendSuccess(res, 200, 'Hospital settings retrieved', {
      hospitalId: hospital._id,
      name: hospital.name,
      code: hospital.code,
      domain: hospital.domain,
      contactName: hospital.contactName,
      contactEmail: hospital.contactEmail,
      contactPhone: hospital.contactPhone,
      licenseNumber: hospital.licenseNumber,
      address: hospital.address,
      enabledModules: hospital.enabledModules,
      enabledDepartments: hospital.enabledDepartments,
      status: hospital.status,
      isActive: hospital.isActive,
    });
  } catch (err) { next(err); }
});

// ─── Reports: Monthly Revenue & Patient Summary ──────────────────────────
router.get('/reports', ...adminOrSuper, async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    if (!hospitalId) return res.status(400).json({ message: 'Hospital context required' });

    const base = { hospitalId };

    // Last 6 months revenue
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      months.push({ label: start.toLocaleString('default', { month: 'short', year: '2-digit' }), start, end });
    }

    const revenueByMonth = await Promise.all(
      months.map(async ({ label, start, end }) => {
        const agg = await Invoice.aggregate([
          { $match: { ...base, createdAt: { $gte: start, $lte: end }, status: { $in: ['PAID', 'PARTIALLY_PAID'] } } },
          { $group: { _id: null, revenue: { $sum: '$paidAmount' }, invoices: { $sum: 1 } } },
        ]).catch(() => []);
        const patients = await Patient.countDocuments({ ...base, createdAt: { $gte: start, $lte: end } });
        const consultations = await Consultation.countDocuments({ ...base, createdAt: { $gte: start, $lte: end } });
        return { month: label, revenue: agg[0]?.revenue || 0, invoices: agg[0]?.invoices || 0, patients, consultations };
      })
    );

    // Overall totals
    const [totalRevenue, totalInvoices, totalPatients, activeAdmissions, pendingInvoices] = await Promise.all([
      Invoice.aggregate([{ $match: { ...base, status: { $in: ['PAID', 'PARTIALLY_PAID'] } } }, { $group: { _id: null, total: { $sum: '$paidAmount' } } }]).catch(() => []),
      Invoice.countDocuments({ ...base, status: { $in: ['PAID', 'PARTIALLY_PAID'] } }),
      Patient.countDocuments(base),
      Admission.countDocuments({ ...base, status: 'ADMITTED' }),
      Invoice.countDocuments({ ...base, status: { $in: ['UNPAID', 'PARTIALLY_PAID'] } }),
    ]);

    return sendSuccess(res, 200, 'Reports data retrieved', {
      revenueByMonth,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalInvoices,
      totalPatients,
      activeAdmissions,
      pendingInvoices,
    });
  } catch (err) { next(err); }
});

export default router;
