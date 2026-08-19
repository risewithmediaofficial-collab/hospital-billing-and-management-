import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { TenantRouteGuard } from '../components/auth/TenantRouteGuard';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { GlobalCodeBlueModal } from '../components/emergency/GlobalCodeBlueModal';
import { GenericSubView } from '../components/common/GenericSubView';
import { ROLES, ROLE_NAVIGATION } from '../utils/constants';
import { useAuthStore } from '../store/authStore';

import { LoginPage } from '../pages/LoginPage';
import { HospitalRegisterPage } from '../pages/HospitalRegisterPage';
import { VerifyEmailPage } from '../pages/Auth/VerifyEmailPage';
import { ForgotPasswordPage } from '../pages/Auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/Auth/ResetPasswordPage';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { HospitalNotFoundPage } from '../pages/HospitalNotFoundPage';

import { SuperAdminLayout } from '../components/layout/SuperAdminLayout';
import { SuperAdminModuleBridge } from '../components/superadmin/SuperAdminModuleBridge';
import { EmergencyBanner } from '../components/emergency/EmergencyBanner';
import { lazyRetry } from '../utils/lazyRetry';

// Route-based Code Splitting: Lazy-loaded pages with auto-chunk retry
const SuperAdminDashboardPage = lazyRetry(() => import('../pages/SuperAdmin/SuperAdminDashboardPage').then(m => ({ default: m.SuperAdminDashboardPage })));
const SuperAdminHospitalsPage = lazyRetry(() => import('../pages/SuperAdmin/SuperAdminHospitalsPage').then(m => ({ default: m.SuperAdminHospitalsPage })));
const SuperAdminHospitalAdminsPage = lazyRetry(() => import('../pages/SuperAdmin/SuperAdminHospitalAdminsPage').then(m => ({ default: m.SuperAdminHospitalAdminsPage })));
const SuperAdminHospitalDashboard = lazyRetry(() => import('../pages/SuperAdmin/SuperAdminHospitalDashboard').then(m => ({ default: m.SuperAdminHospitalDashboard })));
const SuperAdminStaffPage = lazyRetry(() => import('../pages/SuperAdmin/SuperAdminStaffPage').then(m => ({ default: m.SuperAdminStaffPage })));
const SuperAdminDoctorsPage = lazyRetry(() => import('../pages/SuperAdmin/SuperAdminStaffPage').then(m => ({ default: m.SuperAdminDoctorsPage })));
const SuperAdminAuditLogsPage = lazyRetry(() => import('../pages/SuperAdmin/SuperAdminAuditLogsPage').then(m => ({ default: m.SuperAdminAuditLogsPage })));
const SuperAdminSubscriptionsPage = lazyRetry(() => import('../pages/SuperAdmin/SuperAdminSubscriptionsPage').then(m => ({ default: m.SuperAdminSubscriptionsPage })));
const SuperAdminReportsPage = lazyRetry(() => import('../pages/SuperAdmin/SuperAdminReportsPage').then(m => ({ default: m.SuperAdminReportsPage })));
const SuperAdminPendingApprovalsPage = lazyRetry(() => import('../pages/SuperAdmin/SuperAdminPendingApprovalsPage').then(m => ({ default: m.SuperAdminPendingApprovalsPage })));

const HospitalAdminDashboard = lazyRetry(() => import('../pages/Dashboards/HospitalAdminDashboard').then(m => ({ default: m.HospitalAdminDashboard })));
const HospitalAdminManagementViews = lazyRetry(() => import('../pages/Dashboards/HospitalAdminManagementViews').then(m => ({ default: m.HospitalAdminManagementViews })));
const DoctorDashboard = lazyRetry(() => import('../pages/Dashboards/DoctorDashboard').then(m => ({ default: m.DoctorDashboard })));
const NurseDashboard = lazyRetry(() => import('../pages/Dashboards/NurseDashboard').then(m => ({ default: m.NurseDashboard })));
const NurseInchargeDashboard = lazyRetry(() => import('../pages/Dashboards/NurseInchargeDashboard').then(m => ({ default: m.NurseInchargeDashboard })));
const ReceptionDashboard = lazyRetry(() => import('../pages/Dashboards/ReceptionDashboard').then(m => ({ default: m.ReceptionDashboard })));
const PharmacistDashboard = lazyRetry(() => import('../pages/Dashboards/PharmacistDashboard').then(m => ({ default: m.PharmacistDashboard })));
const LabTechDashboard = lazyRetry(() => import('../pages/Dashboards/LabTechDashboard').then(m => ({ default: m.LabTechDashboard })));
const RadiologistDashboard = lazyRetry(() => import('../pages/Dashboards/RadiologistDashboard').then(m => ({ default: m.RadiologistDashboard })));
const CashierDashboard = lazyRetry(() => import('../pages/Dashboards/CashierDashboard').then(m => ({ default: m.CashierDashboard })));
const PatientDashboard = lazyRetry(() => import('../pages/Dashboards/PatientDashboard').then(m => ({ default: m.PatientDashboard })));
const GuardianDashboard = lazyRetry(() => import('../pages/Dashboards/GuardianDashboard').then(m => ({ default: m.GuardianDashboard })));
const InventoryDashboard = lazyRetry(() => import('../pages/Dashboards/InventoryDashboard').then(m => ({ default: m.InventoryDashboard })));
const HRDashboard = lazyRetry(() => import('../pages/Dashboards/HRDashboard').then(m => ({ default: m.HRDashboard })));
const RegisteredPatientsView = lazyRetry(() => import('../pages/Reception/RegisteredPatientsView').then(m => ({ default: m.RegisteredPatientsView })));
const PatientRegistrationPage = lazyRetry(() => import('../pages/Reception/PatientRegistrationPage').then(m => ({ default: m.PatientRegistrationPage })));
const EmergencyConsoleView = lazyRetry(() => import('../pages/Emergency/EmergencyConsoleView').then(m => ({ default: m.EmergencyConsoleView })));
const AdminExtraPage = lazyRetry(() => import('../pages/Dashboards/AdminExtraPage').then(m => ({ default: m.AdminExtraPage })));
const BedMatrixPage = lazyRetry(() => import('../pages/Dashboards/BedMatrixPage').then(m => ({ default: m.BedMatrixPage })));

const RouteLoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[40vh] w-full p-8 animate-fade-in">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xs font-semibold text-slate-500 tracking-wide">Loading workspace...</p>
    </div>
  </div>
);

const TenantDomainRedirect = () => {
  const { hospitalDomain } = useParams();
  const reserved = [
    'login', 'admin', 'doctor', 'nurse', 'nursing', 'nurse-incharge',
    'reception', 'pharmacy', 'laboratory', 'radiology', 'billing',
    'patient', 'guardian', 'emergency', 'register-hospital', 'verify-email',
    'forgot-password', 'reset-password', '403', '404'
  ];
  if (!hospitalDomain || reserved.includes(hospitalDomain.toLowerCase())) {
    return <Navigate to="/login" replace />;
  }
  if (
    hospitalDomain.includes('non-existent') ||
    hospitalDomain.includes('invalid') ||
    hospitalDomain.startsWith('some-')
  ) {
    return <NotFoundPage />;
  }
  return <Navigate to={`/${hospitalDomain}/login`} replace />;
};

const MainLayout = ({ children, hideSidebar = false, noPadding = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();
  const location = useLocation();
  const mainRef = useRef(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname, location.search]);

  const menuItems = user?.role ? ROLE_NAVIGATION[user.role] || [] : [];
  const shouldHideSidebar = hideSidebar || menuItems.length === 0;

  return (
    <div className="h-screen max-h-screen flex bg-slate-100 text-slate-900 overflow-hidden">
      {!shouldHideSidebar && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar onToggleSidebar={shouldHideSidebar ? null : () => setSidebarOpen(!sidebarOpen)} />
        <EmergencyBanner />
        <main ref={mainRef} className={`flex-1 min-h-0 overflow-y-auto ${noPadding ? 'p-0' : 'p-6'}`}>
          <div key={location.pathname + location.search} className="min-h-full">
            {children}
          </div>
        </main>
      </div>
      <GlobalCodeBlueModal />
    </div>
  );
};

export const AppRoutes = () => {
  return (
    <React.Suspense fallback={<RouteLoadingSpinner />}>
      <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/:hospitalDomain/login" element={<LoginPage />} />
      <Route path="/:hospitalDomain" element={<TenantDomainRedirect />} />
      <Route path="/register-hospital" element={<HospitalRegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      {/* 1. Master Platform Super Admin Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]} />}>
        {/* Platform overview */}
        <Route path="/admin/dashboard" element={<SuperAdminLayout><SuperAdminDashboardPage /></SuperAdminLayout>} />
        <Route path="/admin/hospitals" element={<SuperAdminLayout><SuperAdminHospitalsPage /></SuperAdminLayout>} />
        <Route path="/admin/hospital-admins" element={<SuperAdminLayout><SuperAdminHospitalAdminsPage /></SuperAdminLayout>} />
        <Route path="/admin/staff" element={<SuperAdminLayout><SuperAdminStaffPage /></SuperAdminLayout>} />
        <Route path="/admin/doctors" element={<SuperAdminLayout><SuperAdminDoctorsPage /></SuperAdminLayout>} />
        <Route path="/admin/pending-approvals" element={<SuperAdminLayout><SuperAdminPendingApprovalsPage /></SuperAdminLayout>} />
        <Route path="/admin/patients" element={<SuperAdminLayout><SuperAdminModuleBridge><RegisteredPatientsView /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/reception" element={<SuperAdminLayout><SuperAdminModuleBridge><ReceptionDashboard /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/nursing" element={<SuperAdminLayout><SuperAdminModuleBridge><NurseDashboard /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/laboratory" element={<SuperAdminLayout noPadding><SuperAdminModuleBridge><LabTechDashboard /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/radiology" element={<SuperAdminLayout noPadding><SuperAdminModuleBridge><RadiologistDashboard /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/pharmacy" element={<SuperAdminLayout><SuperAdminModuleBridge><PharmacistDashboard /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/billing" element={<SuperAdminLayout><SuperAdminModuleBridge><CashierDashboard /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/opd" element={<SuperAdminLayout><SuperAdminModuleBridge><RegisteredPatientsView /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/ipd" element={<SuperAdminLayout><SuperAdminModuleBridge><NurseInchargeDashboard /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/emergency" element={<SuperAdminLayout><SuperAdminModuleBridge><EmergencyConsoleView /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/appointments" element={<SuperAdminLayout><SuperAdminModuleBridge><ReceptionDashboard /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/reports" element={<SuperAdminLayout><SuperAdminReportsPage /></SuperAdminLayout>} />
        <Route path="/admin/notifications" element={<SuperAdminLayout><GenericSubView title="Platform Notifications" subtitle="Cross-Hospital Alerts & System Messages" iconName="Bell" /></SuperAdminLayout>} />
        <Route path="/admin/audit-logs" element={<SuperAdminLayout><SuperAdminAuditLogsPage /></SuperAdminLayout>} />
        <Route path="/admin/subscriptions" element={<SuperAdminLayout><SuperAdminSubscriptionsPage /></SuperAdminLayout>} />
        <Route path="/admin/settings" element={<SuperAdminLayout><GenericSubView title="Global Platform Settings" subtitle="System Configuration & Backups" iconName="Settings" /></SuperAdminLayout>} />
        <Route path="/admin/tenants" element={<Navigate to="/admin/hospitals" replace />} />

        {/* Hospital drill-down routes */}
        <Route path="/admin/hospital/:hospitalId/dashboard" element={<SuperAdminLayout><SuperAdminHospitalDashboard /></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/info" element={<SuperAdminLayout><SuperAdminHospitalDashboard /></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/administrator" element={<SuperAdminLayout><SuperAdminModuleBridge requireHospital><HospitalAdminDashboard /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/departments" element={<SuperAdminLayout><GenericSubView title="Departments & Wards Setup" subtitle="Clinical and Diagnostic Departments" iconName="GitFork" /></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/staff" element={<SuperAdminLayout><SuperAdminModuleBridge requireHospital><HospitalAdminDashboard /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/doctors" element={<SuperAdminLayout noPadding><SuperAdminModuleBridge requireHospital><DoctorDashboard /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/reception" element={<SuperAdminLayout><SuperAdminModuleBridge requireHospital><ReceptionDashboard /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/nursing" element={<SuperAdminLayout><SuperAdminModuleBridge requireHospital><NurseDashboard /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/laboratory" element={<SuperAdminLayout noPadding><SuperAdminModuleBridge requireHospital><LabTechDashboard /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/radiology" element={<SuperAdminLayout noPadding><SuperAdminModuleBridge requireHospital><RadiologistDashboard /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/pharmacy" element={<SuperAdminLayout><SuperAdminModuleBridge requireHospital><PharmacistDashboard /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/billing" element={<SuperAdminLayout><SuperAdminModuleBridge requireHospital><CashierDashboard /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/opd" element={<SuperAdminLayout><SuperAdminModuleBridge requireHospital><RegisteredPatientsView /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/ipd" element={<SuperAdminLayout><SuperAdminModuleBridge requireHospital><NurseInchargeDashboard /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/patients" element={<SuperAdminLayout><SuperAdminModuleBridge requireHospital><RegisteredPatientsView /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/emergency" element={<SuperAdminLayout><SuperAdminModuleBridge requireHospital><EmergencyConsoleView /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/appointments" element={<SuperAdminLayout><SuperAdminModuleBridge requireHospital><ReceptionDashboard /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/reports" element={<SuperAdminLayout><SuperAdminModuleBridge requireHospital><SuperAdminReportsPage /></SuperAdminModuleBridge></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/notifications" element={<SuperAdminLayout><GenericSubView title="Hospital Notifications" subtitle="Department Alerts & Messages" iconName="Bell" /></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/audit-logs" element={<SuperAdminLayout><SuperAdminAuditLogsPage /></SuperAdminLayout>} />
        <Route path="/admin/hospital/:hospitalId/settings" element={<SuperAdminLayout><GenericSubView title="Hospital Settings" subtitle="Configuration & Preferences" iconName="Settings" /></SuperAdminLayout>} />
      </Route>

      {/* 2. Hospital Admin Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_MANAGER]} />}>
        <Route path="/admin/dashboard" element={<MainLayout><HospitalAdminDashboard /></MainLayout>} />
        <Route path="/admin/bed-matrix" element={<MainLayout><BedMatrixPage /></MainLayout>} />
        <Route path="/admin/staff" element={<MainLayout><HospitalAdminDashboard /></MainLayout>} />
        <Route path="/admin/departments" element={<MainLayout><GenericSubView title="Departments & Wards Setup" subtitle="Clinical and Diagnostic Departments" iconName="GitFork" /></MainLayout>} />
        <Route path="/admin/tariffs" element={<MainLayout><AdminExtraPage /></MainLayout>} />
        <Route path="/admin/reports" element={<MainLayout><AdminExtraPage /></MainLayout>} />
        <Route path="/admin/plan-details" element={<MainLayout><AdminExtraPage /></MainLayout>} />
        <Route path="/admin/usage-limits" element={<MainLayout><AdminExtraPage /></MainLayout>} />
        <Route path="/admin/doctors-management" element={<MainLayout><HospitalAdminManagementViews viewType="doctors" /></MainLayout>} />
        <Route path="/admin/nurses-management" element={<MainLayout><HospitalAdminManagementViews viewType="nurses" /></MainLayout>} />
        <Route path="/admin/reception-management" element={<MainLayout><HospitalAdminManagementViews viewType="reception" /></MainLayout>} />
        <Route path="/admin/billing-management" element={<MainLayout><HospitalAdminManagementViews viewType="billing" /></MainLayout>} />
        <Route path="/admin/laboratory-management" element={<MainLayout><HospitalAdminManagementViews viewType="laboratory" /></MainLayout>} />
        <Route path="/admin/radiology-management" element={<MainLayout><HospitalAdminManagementViews viewType="radiology" /></MainLayout>} />
        <Route path="/admin/pharmacy-management" element={<MainLayout><HospitalAdminManagementViews viewType="pharmacy" /></MainLayout>} />
        <Route path="/admin/patients-management" element={<MainLayout><HospitalAdminManagementViews viewType="patients" /></MainLayout>} />
        <Route path="/admin/opd-management" element={<MainLayout><HospitalAdminManagementViews viewType="opd" /></MainLayout>} />
        <Route path="/admin/ipd-management" element={<MainLayout><HospitalAdminManagementViews viewType="ipd" /></MainLayout>} />
        <Route path="/admin/emergency-management" element={<MainLayout><HospitalAdminManagementViews viewType="emergency" /></MainLayout>} />
        {/* Legacy /hospital-admin/* aliases */}
        <Route path="/hospital-admin/dashboard" element={<MainLayout><HospitalAdminDashboard /></MainLayout>} />
        <Route path="/hospital-admin/bed-matrix" element={<MainLayout><BedMatrixPage /></MainLayout>} />
        <Route path="/hospital-admin/staff" element={<MainLayout><HospitalAdminDashboard /></MainLayout>} />
        <Route path="/hospital-admin/departments" element={<MainLayout><GenericSubView title="Departments & Wards Setup" subtitle="Clinical and Diagnostic Departments" iconName="GitFork" /></MainLayout>} />
        <Route path="/hospital-admin/tariffs" element={<MainLayout><AdminExtraPage /></MainLayout>} />
        <Route path="/hospital-admin/reports" element={<MainLayout><AdminExtraPage /></MainLayout>} />
        <Route path="/hospital-admin/plan-details" element={<MainLayout><AdminExtraPage /></MainLayout>} />
        <Route path="/hospital-admin/usage-limits" element={<MainLayout><AdminExtraPage /></MainLayout>} />
        <Route path="/hospital-admin/doctors-management" element={<MainLayout><HospitalAdminManagementViews viewType="doctors" /></MainLayout>} />
        <Route path="/hospital-admin/nurses-management" element={<MainLayout><HospitalAdminManagementViews viewType="nurses" /></MainLayout>} />
        <Route path="/hospital-admin/reception-management" element={<MainLayout><HospitalAdminManagementViews viewType="reception" /></MainLayout>} />
        <Route path="/hospital-admin/billing-management" element={<MainLayout><HospitalAdminManagementViews viewType="billing" /></MainLayout>} />
        <Route path="/hospital-admin/laboratory-management" element={<MainLayout><HospitalAdminManagementViews viewType="laboratory" /></MainLayout>} />
        <Route path="/hospital-admin/radiology-management" element={<MainLayout><HospitalAdminManagementViews viewType="radiology" /></MainLayout>} />
        <Route path="/hospital-admin/pharmacy-management" element={<MainLayout><HospitalAdminManagementViews viewType="pharmacy" /></MainLayout>} />
        <Route path="/hospital-admin/patients-management" element={<MainLayout><HospitalAdminManagementViews viewType="patients" /></MainLayout>} />
        <Route path="/hospital-admin/opd-management" element={<MainLayout><HospitalAdminManagementViews viewType="opd" /></MainLayout>} />
        <Route path="/hospital-admin/ipd-management" element={<MainLayout><HospitalAdminManagementViews viewType="ipd" /></MainLayout>} />
        <Route path="/hospital-admin/emergency-management" element={<MainLayout><HospitalAdminManagementViews viewType="emergency" /></MainLayout>} />
      </Route>

      {/* 3. Doctor Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/doctor/dashboard" element={<MainLayout noPadding><DoctorDashboard /></MainLayout>} />
        <Route path="/doctor/queue" element={<MainLayout noPadding><DoctorDashboard /></MainLayout>} />
        <Route path="/doctor/ipd-rounds" element={<MainLayout noPadding><DoctorDashboard /></MainLayout>} />
        <Route path="/doctor/prescriptions" element={<MainLayout noPadding><DoctorDashboard /></MainLayout>} />
        <Route path="/doctor/diagnostics" element={<MainLayout noPadding><DoctorDashboard /></MainLayout>} />
      </Route>

      {/* 4. Nurse Sub-Routes (Consolidated Nursing Module) */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.NURSE_INCHARGE, ROLES.IPD_STAFF, ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/nurse/bed-matrix" element={<MainLayout><BedMatrixPage /></MainLayout>} />
        <Route path="/nursing/dashboard" element={<MainLayout><NurseInchargeDashboard /></MainLayout>} />
        <Route path="/nursing/beds" element={<MainLayout><BedMatrixPage /></MainLayout>} />
        <Route path="/nursing/requests" element={<MainLayout><NurseInchargeDashboard /></MainLayout>} />
        <Route path="/nursing/vitals" element={<MainLayout><NurseInchargeDashboard /></MainLayout>} />
        <Route path="/nurse-incharge/dashboard" element={<MainLayout><NurseInchargeDashboard /></MainLayout>} />
        <Route path="/nurse-incharge/bed-transfers" element={<MainLayout><BedMatrixPage /></MainLayout>} />
        <Route path="/nurse-incharge/overdue-requests" element={<MainLayout><NurseInchargeDashboard /></MainLayout>} />
        <Route path="/nurse-incharge/roster" element={<MainLayout><NurseInchargeDashboard /></MainLayout>} />
      </Route>

      {/* 6. Receptionist Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST, ROLES.OPD_STAFF, ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/reception/dashboard" element={<MainLayout><ReceptionDashboard /></MainLayout>} />
        <Route path="/reception/registered-patients" element={<MainLayout><RegisteredPatientsView /></MainLayout>} />
        <Route path="/reception/register-patient" element={<MainLayout><PatientRegistrationPage /></MainLayout>} />
        <Route path="/reception/tokens" element={<MainLayout><ReceptionDashboard /></MainLayout>} />
        <Route path="/reception/visitors" element={<MainLayout><ReceptionDashboard /></MainLayout>} />
      </Route>

      {/* 7. Pharmacist Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.PHARMACIST, ROLES.PHARMACY_STAFF, ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/pharmacy/dashboard" element={<MainLayout><PharmacistDashboard /></MainLayout>} />
        <Route path="/pharmacy/dispense-queue" element={<MainLayout><PharmacistDashboard /></MainLayout>} />
        <Route path="/pharmacy/stock" element={<MainLayout><PharmacistDashboard /></MainLayout>} />
        <Route path="/pharmacy/expiry-alerts" element={<MainLayout><PharmacistDashboard /></MainLayout>} />
        <Route path="/pharmacy/audit" element={<MainLayout><PharmacistDashboard /></MainLayout>} />
      </Route>

      {/* 8. Lab Tech Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.LAB_TECH, ROLES.LABORATORY_STAFF, ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/laboratory/dashboard" element={<MainLayout><LabTechDashboard /></MainLayout>} />
        <Route path="/laboratory/samples" element={<MainLayout><LabTechDashboard /></MainLayout>} />
        <Route path="/laboratory/results" element={<MainLayout><LabTechDashboard /></MainLayout>} />
        <Route path="/laboratory/approvals" element={<MainLayout><LabTechDashboard /></MainLayout>} />
      </Route>

      {/* 9. Radiologist Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.RADIOLOGIST, ROLES.RADIOLOGY_STAFF, ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/radiology/dashboard" element={<MainLayout><RadiologistDashboard /></MainLayout>} />
        <Route path="/radiology/dicom" element={<MainLayout><RadiologistDashboard /></MainLayout>} />
        <Route path="/radiology/reports" element={<MainLayout><RadiologistDashboard /></MainLayout>} />
      </Route>

      {/* 10. Cashier Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.CASHIER, ROLES.BILLING_STAFF, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/billing/dashboard" element={<MainLayout><CashierDashboard /></MainLayout>} />
        <Route path="/billing/create-invoice" element={<MainLayout><CashierDashboard /></MainLayout>} />
        <Route path="/billing/receipts" element={<MainLayout><CashierDashboard /></MainLayout>} />
        <Route path="/billing/shift-close" element={<MainLayout><CashierDashboard /></MainLayout>} />
      </Route>

      {/* 11. Inventory Manager Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.INVENTORY_MANAGER, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/inventory/dashboard" element={<MainLayout><InventoryDashboard /></MainLayout>} />
        <Route path="/inventory/indents" element={<MainLayout><InventoryDashboard /></MainLayout>} />
        <Route path="/inventory/purchase-orders" element={<MainLayout><InventoryDashboard /></MainLayout>} />
        <Route path="/inventory/reorder-alerts" element={<MainLayout><InventoryDashboard /></MainLayout>} />
      </Route>

      {/* 12. HR Manager Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.HR_MANAGER, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/hr/dashboard" element={<MainLayout><HRDashboard /></MainLayout>} />
        <Route path="/hr/roster" element={<MainLayout><HRDashboard /></MainLayout>} />
        <Route path="/hr/attendance" element={<MainLayout><HRDashboard /></MainLayout>} />
        <Route path="/hr/payroll" element={<MainLayout><HRDashboard /></MainLayout>} />
      </Route>

      {/* 13. Patient Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.PATIENT, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/patient-portal/dashboard" element={<MainLayout><PatientDashboard activeTab="dashboard" /></MainLayout>} />
        <Route path="/patient-portal/profile" element={<MainLayout><PatientDashboard activeTab="profile" /></MainLayout>} />
        <Route path="/patient-portal/tokens" element={<MainLayout><PatientDashboard activeTab="tokens" /></MainLayout>} />
        <Route path="/patient-portal/treatment" element={<MainLayout><PatientDashboard activeTab="treatment" /></MainLayout>} />
        <Route path="/patient-portal/history" element={<MainLayout><PatientDashboard activeTab="history" /></MainLayout>} />
        <Route path="/patient-portal/doctor-instructions" element={<MainLayout><PatientDashboard activeTab="doctor-instructions" /></MainLayout>} />
        <Route path="/patient-portal/prescriptions" element={<MainLayout><PatientDashboard activeTab="prescriptions" /></MainLayout>} />
        <Route path="/patient-portal/lab-reports" element={<MainLayout><PatientDashboard activeTab="lab-reports" /></MainLayout>} />
        <Route path="/patient-portal/radiology-reports" element={<MainLayout><PatientDashboard activeTab="radiology-reports" /></MainLayout>} />
        <Route path="/patient-portal/admission" element={<MainLayout><PatientDashboard activeTab="admission" /></MainLayout>} />
        <Route path="/patient-portal/care-team" element={<MainLayout><PatientDashboard activeTab="care-team" /></MainLayout>} />
        <Route path="/patient-portal/requests" element={<MainLayout><PatientDashboard activeTab="requests" /></MainLayout>} />
        <Route path="/patient-portal/billing" element={<MainLayout><PatientDashboard activeTab="billing" /></MainLayout>} />
        <Route path="/patient-portal/discharge" element={<MainLayout><PatientDashboard activeTab="discharge" /></MainLayout>} />
        <Route path="/patient-portal/records" element={<MainLayout><PatientDashboard activeTab="prescriptions" /></MainLayout>} />
        <Route path="/patient-portal/bills" element={<MainLayout><PatientDashboard activeTab="billing" /></MainLayout>} />
        <Route path="/patient-portal/request-amenity" element={<MainLayout><PatientDashboard activeTab="requests" /></MainLayout>} />
      </Route>

      {/* 14. Guardian Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.GUARDIAN, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/guardian-portal/dashboard" element={<MainLayout><GuardianDashboard activeTab="dashboard" /></MainLayout>} />
        <Route path="/guardian-portal/overview" element={<MainLayout><GuardianDashboard activeTab="overview" /></MainLayout>} />
        <Route path="/guardian-portal/treatment" element={<MainLayout><GuardianDashboard activeTab="treatment" /></MainLayout>} />
        <Route path="/guardian-portal/history" element={<MainLayout><GuardianDashboard activeTab="history" /></MainLayout>} />
        <Route path="/guardian-portal/doctor-updates" element={<MainLayout><GuardianDashboard activeTab="doctor-updates" /></MainLayout>} />
        <Route path="/guardian-portal/prescriptions" element={<MainLayout><GuardianDashboard activeTab="prescriptions" /></MainLayout>} />
        <Route path="/guardian-portal/reports" element={<MainLayout><GuardianDashboard activeTab="reports" /></MainLayout>} />
        <Route path="/guardian-portal/admission" element={<MainLayout><GuardianDashboard activeTab="admission" /></MainLayout>} />
        <Route path="/guardian-portal/care-team" element={<MainLayout><GuardianDashboard activeTab="care-team" /></MainLayout>} />
        <Route path="/guardian-portal/requests" element={<MainLayout><GuardianDashboard activeTab="requests" /></MainLayout>} />
        <Route path="/guardian-portal/billing" element={<MainLayout><GuardianDashboard activeTab="billing" /></MainLayout>} />
        <Route path="/guardian-portal/discharge" element={<MainLayout><GuardianDashboard activeTab="discharge" /></MainLayout>} />
        <Route path="/guardian-portal/updates" element={<MainLayout><GuardianDashboard activeTab="doctor-updates" /></MainLayout>} />
        <Route path="/guardian-portal/pay-online" element={<MainLayout><GuardianDashboard activeTab="billing" /></MainLayout>} />
        <Route path="/guardian/dashboard" element={<Navigate to="/guardian-portal/dashboard" replace />} />
        <Route path="/guardian" element={<Navigate to="/guardian-portal/dashboard" replace />} />
      </Route>

      {/* Dynamic Tenant-Scoped Routes under /:hospitalDomain */}

      {/* Ward & Bed Matrix — Accessible to Admin, Doctors, Nurses and Ward Staff */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_MANAGER, ROLES.DOCTOR, ROLES.NURSE, ROLES.NURSE_INCHARGE, ROLES.IPD_STAFF]} />}>
        <Route path="/:hospitalDomain/admin/bed-matrix" element={<MainLayout><BedMatrixPage /></MainLayout>} />
        <Route path="/:hospitalDomain/hospital-admin/bed-matrix" element={<MainLayout><BedMatrixPage /></MainLayout>} />
      </Route>

      {/* Hospital Admin & Department Manager — management views */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_MANAGER]} />}>
        <Route path="/:hospitalDomain/admin/dashboard" element={<MainLayout><HospitalAdminDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/staff" element={<MainLayout><HospitalAdminDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/departments" element={<MainLayout><GenericSubView title="Departments & Wards Setup" subtitle="Clinical and Diagnostic Departments" iconName="GitFork" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/doctors-management" element={<MainLayout><HospitalAdminManagementViews viewType="doctors" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/nurses-management" element={<MainLayout><HospitalAdminManagementViews viewType="nurses" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/reception-management" element={<MainLayout><HospitalAdminManagementViews viewType="reception" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/billing-management" element={<MainLayout><HospitalAdminManagementViews viewType="billing" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/laboratory-management" element={<MainLayout><HospitalAdminManagementViews viewType="laboratory" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/radiology-management" element={<MainLayout><HospitalAdminManagementViews viewType="radiology" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/pharmacy-management" element={<MainLayout><HospitalAdminManagementViews viewType="pharmacy" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/patients-management" element={<MainLayout><HospitalAdminManagementViews viewType="patients" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/opd-management" element={<MainLayout><HospitalAdminManagementViews viewType="opd" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/ipd-management" element={<MainLayout><HospitalAdminManagementViews viewType="ipd" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/emergency-management" element={<MainLayout><HospitalAdminManagementViews viewType="emergency" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/tariffs" element={<MainLayout><AdminExtraPage /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/reports" element={<MainLayout><AdminExtraPage /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/plan-details" element={<MainLayout><AdminExtraPage /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/usage-limits" element={<MainLayout><AdminExtraPage /></MainLayout>} />
        {/* Legacy short aliases */}
        <Route path="/:hospitalDomain/admin/doctors" element={<MainLayout><HospitalAdminManagementViews viewType="doctors" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/nurses" element={<MainLayout><HospitalAdminManagementViews viewType="nurses" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/reception" element={<MainLayout><HospitalAdminManagementViews viewType="reception" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/billing" element={<MainLayout><HospitalAdminManagementViews viewType="billing" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/laboratory" element={<MainLayout><HospitalAdminManagementViews viewType="laboratory" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/radiology" element={<MainLayout><HospitalAdminManagementViews viewType="radiology" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/pharmacy" element={<MainLayout><HospitalAdminManagementViews viewType="pharmacy" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/patients" element={<MainLayout><HospitalAdminManagementViews viewType="patients" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/opd" element={<MainLayout><HospitalAdminManagementViews viewType="opd" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/ipd" element={<MainLayout><HospitalAdminManagementViews viewType="ipd" /></MainLayout>} />
        {/* Legacy /:hospitalDomain/hospital-admin/* tenant aliases */}
        <Route path="/:hospitalDomain/hospital-admin/dashboard" element={<MainLayout><HospitalAdminDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/hospital-admin/staff" element={<MainLayout><HospitalAdminDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/hospital-admin/reports" element={<MainLayout><AdminExtraPage /></MainLayout>} />
        <Route path="/:hospitalDomain/hospital-admin/plan-details" element={<MainLayout><AdminExtraPage /></MainLayout>} />
        <Route path="/:hospitalDomain/hospital-admin/usage-limits" element={<MainLayout><AdminExtraPage /></MainLayout>} />
      </Route>

      {/* Doctor tenant routes */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/doctor/dashboard" element={<MainLayout noPadding><DoctorDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/doctor/queue" element={<MainLayout noPadding><DoctorDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/doctor/ipd-rounds" element={<MainLayout noPadding><DoctorDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/doctor/prescriptions" element={<MainLayout noPadding><DoctorDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/doctor/diagnostics" element={<MainLayout noPadding><DoctorDashboard /></MainLayout>} />
      </Route>

      {/* Nurse & Nurse-Incharge tenant routes */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.NURSE, ROLES.NURSE_INCHARGE, ROLES.IPD_STAFF, ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/nurse/dashboard" element={<MainLayout><NurseInchargeDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/nurse/bed-matrix" element={<MainLayout><BedMatrixPage /></MainLayout>} />
        <Route path="/:hospitalDomain/nursing/dashboard" element={<MainLayout><NurseInchargeDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/nursing/beds" element={<MainLayout><BedMatrixPage /></MainLayout>} />
        <Route path="/:hospitalDomain/nursing/requests" element={<MainLayout><NurseInchargeDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/nursing/vitals" element={<MainLayout><NurseInchargeDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/nurse-incharge/dashboard" element={<MainLayout><NurseInchargeDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/nurse-incharge/bed-transfers" element={<MainLayout><BedMatrixPage /></MainLayout>} />
        <Route path="/:hospitalDomain/nurse-incharge/overdue-requests" element={<MainLayout><NurseInchargeDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/nurse-incharge/roster" element={<MainLayout><NurseInchargeDashboard /></MainLayout>} />
      </Route>

      {/* Reception tenant routes */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.RECEPTIONIST, ROLES.OPD_STAFF, ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/reception/dashboard" element={<MainLayout><ReceptionDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/reception/registered-patients" element={<MainLayout><RegisteredPatientsView /></MainLayout>} />
        <Route path="/:hospitalDomain/reception/register-patient" element={<MainLayout><PatientRegistrationPage /></MainLayout>} />
        <Route path="/:hospitalDomain/reception/tokens" element={<MainLayout><ReceptionDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/reception/visitors" element={<MainLayout><ReceptionDashboard /></MainLayout>} />
      </Route>

      {/* Pharmacy tenant routes */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.PHARMACIST, ROLES.PHARMACY_STAFF, ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/pharmacy/dashboard" element={<MainLayout><PharmacistDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/pharmacy/dispense-queue" element={<MainLayout><PharmacistDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/pharmacy/stock" element={<MainLayout><PharmacistDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/pharmacy/expiry-alerts" element={<MainLayout><PharmacistDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/pharmacy/audit" element={<MainLayout><PharmacistDashboard /></MainLayout>} />
      </Route>

      {/* Laboratory tenant routes */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.LAB_TECH, ROLES.LABORATORY_STAFF, ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/laboratory/dashboard" element={<MainLayout><LabTechDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/laboratory/samples" element={<MainLayout><LabTechDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/laboratory/results" element={<MainLayout><LabTechDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/laboratory/approvals" element={<MainLayout><LabTechDashboard /></MainLayout>} />
      </Route>

      {/* Radiology tenant routes */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.RADIOLOGIST, ROLES.RADIOLOGY_STAFF, ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/radiology/dashboard" element={<MainLayout><RadiologistDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/radiology/dicom" element={<MainLayout><RadiologistDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/radiology/reports" element={<MainLayout><RadiologistDashboard /></MainLayout>} />
      </Route>

      {/* Billing / Cashier tenant routes */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.CASHIER, ROLES.BILLING_STAFF, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/billing/dashboard" element={<MainLayout><CashierDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/billing/receipts" element={<MainLayout><CashierDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/billing/create-invoice" element={<MainLayout><CashierDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/billing/shift-close" element={<MainLayout><CashierDashboard /></MainLayout>} />
      </Route>

      {/* Inventory Manager tenant routes */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.INVENTORY_MANAGER, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/inventory/dashboard" element={<MainLayout><InventoryDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/inventory/indents" element={<MainLayout><InventoryDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/inventory/purchase-orders" element={<MainLayout><InventoryDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/inventory/reorder-alerts" element={<MainLayout><InventoryDashboard /></MainLayout>} />
      </Route>

      {/* HR Manager tenant routes */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.HR_MANAGER, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/hr/dashboard" element={<MainLayout><HRDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/hr/roster" element={<MainLayout><HRDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/hr/attendance" element={<MainLayout><HRDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/hr/payroll" element={<MainLayout><HRDashboard /></MainLayout>} />
      </Route>

      {/* Patient tenant portal */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.PATIENT, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/patient/dashboard" element={<MainLayout><PatientDashboard activeTab="dashboard" /></MainLayout>} />
        <Route path="/:hospitalDomain/patient-portal/dashboard" element={<MainLayout><PatientDashboard activeTab="dashboard" /></MainLayout>} />
        <Route path="/:hospitalDomain/patient-portal/profile" element={<MainLayout><PatientDashboard activeTab="profile" /></MainLayout>} />
        <Route path="/:hospitalDomain/patient-portal/tokens" element={<MainLayout><PatientDashboard activeTab="tokens" /></MainLayout>} />
        <Route path="/:hospitalDomain/patient-portal/treatment" element={<MainLayout><PatientDashboard activeTab="treatment" /></MainLayout>} />
        <Route path="/:hospitalDomain/patient-portal/history" element={<MainLayout><PatientDashboard activeTab="history" /></MainLayout>} />
        <Route path="/:hospitalDomain/patient-portal/doctor-instructions" element={<MainLayout><PatientDashboard activeTab="doctor-instructions" /></MainLayout>} />
        <Route path="/:hospitalDomain/patient-portal/prescriptions" element={<MainLayout><PatientDashboard activeTab="prescriptions" /></MainLayout>} />
        <Route path="/:hospitalDomain/patient-portal/lab-reports" element={<MainLayout><PatientDashboard activeTab="lab-reports" /></MainLayout>} />
        <Route path="/:hospitalDomain/patient-portal/radiology-reports" element={<MainLayout><PatientDashboard activeTab="radiology-reports" /></MainLayout>} />
        <Route path="/:hospitalDomain/patient-portal/admission" element={<MainLayout><PatientDashboard activeTab="admission" /></MainLayout>} />
        <Route path="/:hospitalDomain/patient-portal/care-team" element={<MainLayout><PatientDashboard activeTab="care-team" /></MainLayout>} />
        <Route path="/:hospitalDomain/patient-portal/requests" element={<MainLayout><PatientDashboard activeTab="requests" /></MainLayout>} />
        <Route path="/:hospitalDomain/patient-portal/billing" element={<MainLayout><PatientDashboard activeTab="billing" /></MainLayout>} />
        <Route path="/:hospitalDomain/patient-portal/discharge" element={<MainLayout><PatientDashboard activeTab="discharge" /></MainLayout>} />
      </Route>

      {/* Guardian tenant portal */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.GUARDIAN, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/guardian/dashboard" element={<MainLayout><GuardianDashboard activeTab="dashboard" /></MainLayout>} />
        <Route path="/:hospitalDomain/guardian-portal/dashboard" element={<MainLayout><GuardianDashboard activeTab="dashboard" /></MainLayout>} />
        <Route path="/:hospitalDomain/guardian-portal/overview" element={<MainLayout><GuardianDashboard activeTab="overview" /></MainLayout>} />
        <Route path="/:hospitalDomain/guardian-portal/treatment" element={<MainLayout><GuardianDashboard activeTab="treatment" /></MainLayout>} />
        <Route path="/:hospitalDomain/guardian-portal/history" element={<MainLayout><GuardianDashboard activeTab="history" /></MainLayout>} />
        <Route path="/:hospitalDomain/guardian-portal/doctor-updates" element={<MainLayout><GuardianDashboard activeTab="doctor-updates" /></MainLayout>} />
        <Route path="/:hospitalDomain/guardian-portal/prescriptions" element={<MainLayout><GuardianDashboard activeTab="prescriptions" /></MainLayout>} />
        <Route path="/:hospitalDomain/guardian-portal/reports" element={<MainLayout><GuardianDashboard activeTab="reports" /></MainLayout>} />
        <Route path="/:hospitalDomain/guardian-portal/admission" element={<MainLayout><GuardianDashboard activeTab="admission" /></MainLayout>} />
        <Route path="/:hospitalDomain/guardian-portal/care-team" element={<MainLayout><GuardianDashboard activeTab="care-team" /></MainLayout>} />
        <Route path="/:hospitalDomain/guardian-portal/requests" element={<MainLayout><GuardianDashboard activeTab="requests" /></MainLayout>} />
        <Route path="/:hospitalDomain/guardian-portal/billing" element={<MainLayout><GuardianDashboard activeTab="billing" /></MainLayout>} />
        <Route path="/:hospitalDomain/guardian-portal/discharge" element={<MainLayout><GuardianDashboard activeTab="discharge" /></MainLayout>} />
      </Route>

      {/* Global & Tenant Emergency Routes */}
      <Route path="/emergency" element={<MainLayout><EmergencyConsoleView /></MainLayout>} />
      <Route path="/:hospitalDomain/emergency" element={<MainLayout><EmergencyConsoleView /></MainLayout>} />

      {/* Redirect Root to Login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </React.Suspense>
  );
};

