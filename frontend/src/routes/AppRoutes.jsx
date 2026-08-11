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

import { SuperAdminDashboardPage } from '../pages/SuperAdmin/SuperAdminDashboardPage';
import { SuperAdminHospitalsPage } from '../pages/SuperAdmin/SuperAdminHospitalsPage';
import { SuperAdminHospitalAdminsPage } from '../pages/SuperAdmin/SuperAdminHospitalAdminsPage';
import { SuperAdminHospitalDashboard } from '../pages/SuperAdmin/SuperAdminHospitalDashboard';
import { SuperAdminStaffPage, SuperAdminDoctorsPage } from '../pages/SuperAdmin/SuperAdminStaffPage';
import { SuperAdminAuditLogsPage } from '../pages/SuperAdmin/SuperAdminAuditLogsPage';
import { SuperAdminSubscriptionsPage } from '../pages/SuperAdmin/SuperAdminSubscriptionsPage';
import { SuperAdminReportsPage } from '../pages/SuperAdmin/SuperAdminReportsPage';
import { SuperAdminPendingApprovalsPage } from '../pages/SuperAdmin/SuperAdminPendingApprovalsPage';

import { HospitalAdminDashboard } from '../pages/Dashboards/HospitalAdminDashboard';
import { HospitalAdminManagementViews } from '../pages/Dashboards/HospitalAdminManagementViews';
import { DoctorDashboard } from '../pages/Dashboards/DoctorDashboard';
import { NurseDashboard } from '../pages/Dashboards/NurseDashboard';
import { NurseInchargeDashboard } from '../pages/Dashboards/NurseInchargeDashboard';
import { ReceptionDashboard } from '../pages/Dashboards/ReceptionDashboard';
import { PharmacistDashboard } from '../pages/Dashboards/PharmacistDashboard';
import { LabTechDashboard } from '../pages/Dashboards/LabTechDashboard';
import { RadiologistDashboard } from '../pages/Dashboards/RadiologistDashboard';
import { CashierDashboard } from '../pages/Dashboards/CashierDashboard';
import { PatientDashboard } from '../pages/Dashboards/PatientDashboard';
import { GuardianDashboard } from '../pages/Dashboards/GuardianDashboard';
import { InventoryDashboard } from '../pages/Dashboards/InventoryDashboard';
import { HRDashboard } from '../pages/Dashboards/HRDashboard';
import { RegisteredPatientsView } from '../pages/Reception/RegisteredPatientsView';
import { PatientRegistrationPage } from '../pages/Reception/PatientRegistrationPage';

import { EmergencyBanner } from '../components/emergency/EmergencyBanner';
import { EmergencyConsoleView } from '../pages/Emergency/EmergencyConsoleView';

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
        <main ref={mainRef} className={`flex-1 min-h-0 overflow-y-auto ${noPadding ? 'p-0' : 'p-6'}`}>{children}</main>
      </div>
      <GlobalCodeBlueModal />
    </div>
  );
};

export const AppRoutes = () => {
  return (
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
      <Route element={<ProtectedRoute allowedRoles={[ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/hospital-admin/dashboard" element={<MainLayout><HospitalAdminDashboard /></MainLayout>} />
        <Route path="/hospital-admin/staff" element={<MainLayout><HospitalAdminDashboard /></MainLayout>} />
        <Route path="/hospital-admin/departments" element={<MainLayout><GenericSubView title="Departments & Wards Setup" subtitle="Clinical and Diagnostic Departments" iconName="GitFork" /></MainLayout>} />
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
        <Route path="/hospital-admin/tariffs" element={<MainLayout><GenericSubView title="Tariffs & Price Master" subtitle="Service Tariffs and Room Charges" iconName="Receipt" /></MainLayout>} />
        <Route path="/hospital-admin/reports" element={<MainLayout><GenericSubView title="Operational & Revenue Reports" subtitle="Executive Analytics" iconName="BarChart3" /></MainLayout>} />
        <Route path="/hospital-admin/plan-details" element={<MainLayout><GenericSubView title="Plan Details" subtitle="Subscription, enabled modules, and staff limits" iconName="BadgeCheck" /></MainLayout>} />
        <Route path="/hospital-admin/usage-limits" element={<MainLayout><GenericSubView title="Usage and Limits" subtitle="Current plan usage and remaining capacity" iconName="Gauge" /></MainLayout>} />
      </Route>

      {/* 3. Doctor Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/doctor/dashboard" element={<MainLayout noPadding><DoctorDashboard /></MainLayout>} />
        <Route path="/doctor/queue" element={<MainLayout noPadding><DoctorDashboard /></MainLayout>} />
        <Route path="/doctor/ipd-rounds" element={<MainLayout><GenericSubView title="IPD Rounds & Vitals" subtitle="Inpatient Ward Visits" iconName="BedDouble" /></MainLayout>} />
        <Route path="/doctor/prescriptions" element={<MainLayout><GenericSubView title="E-Prescriptions History" subtitle="FEFO Auto-Checked Orders" iconName="Pill" /></MainLayout>} />
        <Route path="/doctor/diagnostics" element={<MainLayout><GenericSubView title="Diagnostic Lab & RIS Results" subtitle="Pathology and Radiology Reports" iconName="Activity" /></MainLayout>} />
      </Route>

      {/* 4. Nurse Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/nursing/dashboard" element={<MainLayout><NurseDashboard /></MainLayout>} />
        <Route path="/nursing/beds" element={<MainLayout><GenericSubView title="Bed Matrix Console" subtitle="Live Ward Bed Occupancy" iconName="Bed" /></MainLayout>} />
        <Route path="/nursing/requests" element={<MainLayout><GenericSubView title="In-Bed Patient Requests" subtitle="Real-Time Care Timers" iconName="Bell" /></MainLayout>} />
        <Route path="/nursing/vitals" element={<MainLayout><GenericSubView title="Vitals & Medication Log (MAR)" subtitle="Shift MAR Administration" iconName="ClipboardList" /></MainLayout>} />
      </Route>

      {/* 5. Nurse In-Charge Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.NURSE_INCHARGE, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/nurse-incharge/dashboard" element={<MainLayout><NurseInchargeDashboard /></MainLayout>} />
        <Route path="/nurse-incharge/bed-transfers" element={<MainLayout><GenericSubView title="Bed Allocations & Ward Transfers" subtitle="Inter-ward movement" iconName="ArrowRightLeft" /></MainLayout>} />
        <Route path="/nurse-incharge/overdue-requests" element={<MainLayout><GenericSubView title="Overdue Escalation Audit" subtitle="Level 1-3 Unanswered Requests" iconName="Clock" /></MainLayout>} />
        <Route path="/nurse-incharge/roster" element={<MainLayout><GenericSubView title="Nurse Duty Roster Schedule" subtitle="Shift Roster Allocations" iconName="Calendar" /></MainLayout>} />
      </Route>

      {/* 6. Receptionist Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/reception/dashboard" element={<MainLayout><ReceptionDashboard /></MainLayout>} />
        <Route path="/reception/registered-patients" element={<MainLayout><RegisteredPatientsView /></MainLayout>} />
        <Route path="/reception/register-patient" element={<MainLayout><PatientRegistrationPage /></MainLayout>} />
        <Route path="/reception/tokens" element={<MainLayout><GenericSubView title="OPD Token Calling Desk" subtitle="Live Queue Audio Calling" iconName="Ticket" /></MainLayout>} />
        <Route path="/reception/visitors" element={<MainLayout><GenericSubView title="Visitor Pass Printing Desk" subtitle="Inpatient Visitor Badges" iconName="IdCard" /></MainLayout>} />
      </Route>

      {/* 7. Pharmacist Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.PHARMACIST, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/pharmacy/dashboard" element={<MainLayout><PharmacistDashboard /></MainLayout>} />
        <Route path="/pharmacy/dispense-queue" element={<MainLayout><PharmacistDashboard /></MainLayout>} />
        <Route path="/pharmacy/stock" element={<MainLayout><PharmacistDashboard /></MainLayout>} />
        <Route path="/pharmacy/expiry-alerts" element={<MainLayout><PharmacistDashboard /></MainLayout>} />
      </Route>

      {/* 8. Lab Tech Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.LAB_TECH, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/laboratory/dashboard" element={<MainLayout><LabTechDashboard /></MainLayout>} />
        <Route path="/laboratory/samples" element={<MainLayout><LabTechDashboard /></MainLayout>} />
        <Route path="/laboratory/results" element={<MainLayout><LabTechDashboard /></MainLayout>} />
        <Route path="/laboratory/approvals" element={<MainLayout><LabTechDashboard /></MainLayout>} />
      </Route>

      {/* 9. Radiologist Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.RADIOLOGIST, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/radiology/dashboard" element={<MainLayout><RadiologistDashboard /></MainLayout>} />
        <Route path="/radiology/dicom" element={<MainLayout><RadiologistDashboard /></MainLayout>} />
        <Route path="/radiology/reports" element={<MainLayout><RadiologistDashboard /></MainLayout>} />
      </Route>

      {/* 10. Cashier Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.CASHIER, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/billing/dashboard" element={<MainLayout><CashierDashboard /></MainLayout>} />
        <Route path="/billing/create-invoice" element={<MainLayout><GenericSubView title="Invoice Generator Station" subtitle="Consolidated Patient Invoices" iconName="PlusCircle" /></MainLayout>} />
        <Route path="/billing/receipts" element={<MainLayout><CashierDashboard /></MainLayout>} />
        <Route path="/billing/shift-close" element={<MainLayout><GenericSubView title="End-of-Shift Reconciliation" subtitle="Drawer Cash Balancing" iconName="Lock" /></MainLayout>} />
      </Route>

      {/* 11. Inventory Manager Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.INVENTORY_MANAGER, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/inventory/dashboard" element={<MainLayout><InventoryDashboard /></MainLayout>} />
        <Route path="/inventory/indents" element={<MainLayout><GenericSubView title="Ward Indent Requests" subtitle="Central Store Stock Transfers" iconName="Truck" /></MainLayout>} />
        <Route path="/inventory/purchase-orders" element={<MainLayout><GenericSubView title="Purchase Orders (PO) Console" subtitle="Vendor Procurement" iconName="ShoppingCart" /></MainLayout>} />
        <Route path="/inventory/reorder-alerts" element={<MainLayout><GenericSubView title="Stock Reorder Alerts" subtitle="Safety Stock Thresholds" iconName="AlertCircle" /></MainLayout>} />
      </Route>

      {/* 12. HR Manager Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.HR_MANAGER, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/hr/dashboard" element={<MainLayout><HRDashboard /></MainLayout>} />
        <Route path="/hr/roster" element={<MainLayout><GenericSubView title="Duty Rostering Engine" subtitle="Shift Roster Scheduling" iconName="CalendarDays" /></MainLayout>} />
        <Route path="/hr/attendance" element={<MainLayout><GenericSubView title="Biometric Attendance Log" subtitle="eSSL Biometric Scanner Sync" iconName="Fingerprint" /></MainLayout>} />
        <Route path="/hr/payroll" element={<MainLayout><GenericSubView title="Monthly Payroll Processing" subtitle="Salary & Commission Slips" iconName="IndianRupee" /></MainLayout>} />
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
        <Route path="/:hospitalDomain/admin/tariffs" element={<MainLayout><GenericSubView title="Tariffs & Price Master" subtitle="Service Tariffs and Room Charges" iconName="Receipt" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/reports" element={<MainLayout><GenericSubView title="Operational & Revenue Reports" subtitle="Executive Analytics" iconName="BarChart3" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/plan-details" element={<MainLayout><GenericSubView title="Plan Details" subtitle="Subscription, enabled modules, and staff limits" iconName="BadgeCheck" /></MainLayout>} />
        <Route path="/:hospitalDomain/admin/usage-limits" element={<MainLayout><GenericSubView title="Usage and Limits" subtitle="Current plan usage and remaining capacity" iconName="Gauge" /></MainLayout>} />
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
        <Route path="/:hospitalDomain/admin/emergency" element={<MainLayout><HospitalAdminManagementViews viewType="emergency" /></MainLayout>} />
      </Route>

      {/* Doctor tenant routes */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/doctor/dashboard" element={<MainLayout noPadding><DoctorDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/doctor/queue" element={<MainLayout noPadding><DoctorDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/doctor/ipd-rounds" element={<MainLayout><GenericSubView title="IPD Rounds & Vitals" subtitle="Inpatient Ward Visits" iconName="BedDouble" /></MainLayout>} />
        <Route path="/:hospitalDomain/doctor/prescriptions" element={<MainLayout><GenericSubView title="E-Prescriptions History" subtitle="FEFO Auto-Checked Orders" iconName="Pill" /></MainLayout>} />
        <Route path="/:hospitalDomain/doctor/diagnostics" element={<MainLayout><GenericSubView title="Diagnostic Lab & RIS Results" subtitle="Pathology and Radiology Reports" iconName="Activity" /></MainLayout>} />
      </Route>

      {/* Nurse & Nurse-Incharge tenant routes */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.NURSE, ROLES.NURSE_INCHARGE, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/nurse/dashboard" element={<MainLayout><NurseDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/nursing/dashboard" element={<MainLayout><NurseDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/nursing/beds" element={<MainLayout><GenericSubView title="Bed Matrix Console" subtitle="Live Ward Bed Occupancy" iconName="Bed" /></MainLayout>} />
        <Route path="/:hospitalDomain/nursing/requests" element={<MainLayout><GenericSubView title="In-Bed Patient Requests" subtitle="Real-Time Care Timers" iconName="Bell" /></MainLayout>} />
        <Route path="/:hospitalDomain/nursing/vitals" element={<MainLayout><GenericSubView title="Vitals & Medication Log (MAR)" subtitle="Shift MAR Administration" iconName="ClipboardList" /></MainLayout>} />
        <Route path="/:hospitalDomain/nurse-incharge/dashboard" element={<MainLayout><NurseInchargeDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/nurse-incharge/bed-transfers" element={<MainLayout><GenericSubView title="Bed Allocations & Ward Transfers" subtitle="Inter-ward movement" iconName="ArrowRightLeft" /></MainLayout>} />
        <Route path="/:hospitalDomain/nurse-incharge/overdue-requests" element={<MainLayout><GenericSubView title="Overdue Escalation Audit" subtitle="Level 1-3 Unanswered Requests" iconName="Clock" /></MainLayout>} />
        <Route path="/:hospitalDomain/nurse-incharge/roster" element={<MainLayout><GenericSubView title="Nurse Duty Roster Schedule" subtitle="Shift Roster Allocations" iconName="Calendar" /></MainLayout>} />
      </Route>

      {/* Reception tenant routes */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.RECEPTIONIST, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/reception/dashboard" element={<MainLayout><ReceptionDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/reception/registered-patients" element={<MainLayout><RegisteredPatientsView /></MainLayout>} />
        <Route path="/:hospitalDomain/reception/register-patient" element={<MainLayout><PatientRegistrationPage /></MainLayout>} />
        <Route path="/:hospitalDomain/reception/tokens" element={<MainLayout><GenericSubView title="OPD Token Calling Desk" subtitle="Live Queue Audio Calling" iconName="Ticket" /></MainLayout>} />
        <Route path="/:hospitalDomain/reception/visitors" element={<MainLayout><GenericSubView title="Visitor Pass Printing Desk" subtitle="Inpatient Visitor Badges" iconName="IdCard" /></MainLayout>} />
      </Route>

      {/* Pharmacy tenant routes */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.PHARMACIST, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/pharmacy/dashboard" element={<MainLayout><PharmacistDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/pharmacy/dispense-queue" element={<MainLayout><GenericSubView title="Prescription Dispense Queue" subtitle="FEFO Batch Selection" iconName="Clock" /></MainLayout>} />
        <Route path="/:hospitalDomain/pharmacy/stock" element={<MainLayout><GenericSubView title="FEFO Stock Manager" subtitle="Batch Expiry Control" iconName="Boxes" /></MainLayout>} />
        <Route path="/:hospitalDomain/pharmacy/expiry-alerts" element={<MainLayout><GenericSubView title="Near-Expiry Batch Alerts" subtitle="30-Day Expiry Warnings" iconName="AlertTriangle" /></MainLayout>} />
      </Route>

      {/* Laboratory tenant routes */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.LAB_TECH, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/laboratory/dashboard" element={<MainLayout><LabTechDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/laboratory/samples" element={<MainLayout><LabTechDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/laboratory/results" element={<MainLayout><LabTechDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/laboratory/approvals" element={<MainLayout><LabTechDashboard /></MainLayout>} />
      </Route>

      {/* Radiology tenant routes */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.RADIOLOGIST, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/radiology/dashboard" element={<MainLayout><RadiologistDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/radiology/dicom" element={<MainLayout><RadiologistDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/radiology/reports" element={<MainLayout><RadiologistDashboard /></MainLayout>} />
      </Route>

      {/* Billing / Cashier tenant routes */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.CASHIER, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/billing/dashboard" element={<MainLayout><CashierDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/billing/receipts" element={<MainLayout><CashierDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/billing/create-invoice" element={<MainLayout><GenericSubView title="Invoice Generator Station" subtitle="Consolidated Patient Invoices" iconName="PlusCircle" /></MainLayout>} />
        <Route path="/:hospitalDomain/billing/shift-close" element={<MainLayout><GenericSubView title="End-of-Shift Reconciliation" subtitle="Drawer Cash Balancing" iconName="Lock" /></MainLayout>} />
      </Route>

      {/* Inventory Manager tenant routes */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.INVENTORY_MANAGER, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/inventory/dashboard" element={<MainLayout><InventoryDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/inventory/indents" element={<MainLayout><GenericSubView title="Ward Indent Requests" subtitle="Central Store Stock Transfers" iconName="Truck" /></MainLayout>} />
        <Route path="/:hospitalDomain/inventory/purchase-orders" element={<MainLayout><GenericSubView title="Purchase Orders (PO) Console" subtitle="Vendor Procurement" iconName="ShoppingCart" /></MainLayout>} />
        <Route path="/:hospitalDomain/inventory/reorder-alerts" element={<MainLayout><GenericSubView title="Stock Reorder Alerts" subtitle="Safety Stock Thresholds" iconName="AlertCircle" /></MainLayout>} />
      </Route>

      {/* HR Manager tenant routes */}
      <Route element={<TenantRouteGuard allowedRoles={[ROLES.HR_MANAGER, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/:hospitalDomain/hr/dashboard" element={<MainLayout><HRDashboard /></MainLayout>} />
        <Route path="/:hospitalDomain/hr/roster" element={<MainLayout><GenericSubView title="Duty Rostering Engine" subtitle="Shift Roster Scheduling" iconName="CalendarDays" /></MainLayout>} />
        <Route path="/:hospitalDomain/hr/attendance" element={<MainLayout><GenericSubView title="Biometric Attendance Log" subtitle="eSSL Biometric Scanner Sync" iconName="Fingerprint" /></MainLayout>} />
        <Route path="/:hospitalDomain/hr/payroll" element={<MainLayout><GenericSubView title="Monthly Payroll Processing" subtitle="Salary & Commission Slips" iconName="IndianRupee" /></MainLayout>} />
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
  );
};

