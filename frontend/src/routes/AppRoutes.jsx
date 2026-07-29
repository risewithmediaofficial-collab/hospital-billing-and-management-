import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { GlobalCodeBlueModal } from '../components/emergency/GlobalCodeBlueModal';
import { GenericSubView } from '../components/common/GenericSubView';
import { ROLES, ROLE_NAVIGATION } from '../utils/constants';
import { useAuthStore } from '../store/authStore';

import { LoginPage } from '../pages/LoginPage';
import { HospitalRegisterPage } from '../pages/HospitalRegisterPage';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { NotFoundPage } from '../pages/NotFoundPage';

import { SuperAdminDashboard } from '../pages/Dashboards/SuperAdminDashboard';
import { HospitalAdminDashboard } from '../pages/Dashboards/HospitalAdminDashboard';
import { DoctorDashboard } from '../pages/Dashboards/DoctorDashboard';
import { NurseDashboard } from '../pages/Dashboards/NurseDashboard';
import { NurseInchargeDashboard } from '../pages/Dashboards/NurseInchargeDashboard';
import { ReceptionDashboard } from '../pages/Dashboards/ReceptionDashboard';
import { RegisteredPatientsView } from '../pages/Reception/RegisteredPatientsView';
import { PharmacistDashboard } from '../pages/Dashboards/PharmacistDashboard';
import { LabTechDashboard } from '../pages/Dashboards/LabTechDashboard';
import { RadiologistDashboard } from '../pages/Dashboards/RadiologistDashboard';
import { CashierDashboard } from '../pages/Dashboards/CashierDashboard';
import { InventoryDashboard } from '../pages/Dashboards/InventoryDashboard';
import { HRDashboard } from '../pages/Dashboards/HRDashboard';
import { PatientDashboard } from '../pages/Dashboards/PatientDashboard';
import { GuardianDashboard } from '../pages/Dashboards/GuardianDashboard';
import { EmergencyBanner } from '../components/emergency/EmergencyBanner';
import { EmergencyConsoleView } from '../pages/Emergency/EmergencyConsoleView';

const MainLayout = ({ children, hideSidebar = false, noPadding = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();
  const menuItems = user?.role ? ROLE_NAVIGATION[user.role] || [] : [];
  const shouldHideSidebar = hideSidebar || menuItems.length === 0;

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-900">
      {!shouldHideSidebar && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onToggleSidebar={shouldHideSidebar ? null : () => setSidebarOpen(!sidebarOpen)} />
        <EmergencyBanner />
        <main className={`flex-1 overflow-y-auto ${noPadding ? 'p-0' : 'p-6'}`}>{children}</main>
      </div>
      <GlobalCodeBlueModal />
    </div>
  );
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register-hospital" element={<HospitalRegisterPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      {/* 1. Master Platform Super Admin Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]} />}>
        <Route path="/admin/dashboard" element={<MainLayout hideSidebar={true}><SuperAdminDashboard /></MainLayout>} />
        <Route path="/admin/tenants" element={<MainLayout hideSidebar={true}><SuperAdminDashboard /></MainLayout>} />
        <Route path="/admin/audit-logs" element={<MainLayout hideSidebar={true}><GenericSubView title="System Audit Logs" subtitle="Immutable HIPAA & Security Mutation Trail" iconName="FileText" /></MainLayout>} />
        <Route path="/admin/settings" element={<MainLayout hideSidebar={true}><GenericSubView title="Global Platform Settings" subtitle="System Configuration & Backups" iconName="Settings" /></MainLayout>} />
      </Route>

      {/* 2. Hospital Admin Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/hospital-admin/dashboard" element={<MainLayout hideSidebar={true}><HospitalAdminDashboard /></MainLayout>} />
        <Route path="/hospital-admin/staff" element={<MainLayout hideSidebar={true}><HospitalAdminDashboard /></MainLayout>} />
        <Route path="/hospital-admin/departments" element={<MainLayout hideSidebar={true}><GenericSubView title="Departments & Wards Setup" subtitle="Clinical and Diagnostic Departments" iconName="GitFork" /></MainLayout>} />
        <Route path="/hospital-admin/tariffs" element={<MainLayout hideSidebar={true}><GenericSubView title="Tariffs & Price Master" subtitle="Service Tariffs and Room Charges" iconName="Receipt" /></MainLayout>} />
        <Route path="/hospital-admin/reports" element={<MainLayout hideSidebar={true}><GenericSubView title="Operational & Revenue Reports" subtitle="Executive Analytics" iconName="BarChart3" /></MainLayout>} />
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
        <Route path="/reception/register-patient" element={<MainLayout><GenericSubView title="Patient Registration Station" subtitle="UHID Auto-Sequencing" iconName="UserPlus" /></MainLayout>} />
        <Route path="/reception/tokens" element={<MainLayout><GenericSubView title="OPD Token Calling Desk" subtitle="Live Queue Audio Calling" iconName="Ticket" /></MainLayout>} />
        <Route path="/reception/visitors" element={<MainLayout><GenericSubView title="Visitor Pass Printing Desk" subtitle="Inpatient Visitor Badges" iconName="IdCard" /></MainLayout>} />
      </Route>

      {/* 7. Pharmacist Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.PHARMACIST, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/pharmacy/dashboard" element={<MainLayout><PharmacistDashboard /></MainLayout>} />
        <Route path="/pharmacy/dispense-queue" element={<MainLayout><GenericSubView title="Prescription Dispense Queue" subtitle="FEFO Batch Selection" iconName="Clock" /></MainLayout>} />
        <Route path="/pharmacy/stock" element={<MainLayout><GenericSubView title="FEFO Stock Manager" subtitle="Batch Expiry Control" iconName="Boxes" /></MainLayout>} />
        <Route path="/pharmacy/expiry-alerts" element={<MainLayout><GenericSubView title="Near-Expiry Batch Alerts" subtitle="30-Day Expiry Warnings" iconName="AlertTriangle" /></MainLayout>} />
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
        <Route path="/patient-portal/dashboard" element={<MainLayout><PatientDashboard /></MainLayout>} />
        <Route path="/patient-portal/records" element={<MainLayout><GenericSubView title="My Medical Records & Prescriptions" subtitle="EHR Health History" iconName="FileText" /></MainLayout>} />
        <Route path="/patient-portal/bills" element={<MainLayout><GenericSubView title="My Invoices & Payments" subtitle="Itemized Hospital Invoices" iconName="Receipt" /></MainLayout>} />
        <Route path="/patient-portal/request-amenity" element={<MainLayout><GenericSubView title="In-Bed Room Request Console" subtitle="Nurse Notification" iconName="Bell" /></MainLayout>} />
      </Route>

      {/* 14. Guardian Sub-Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.GUARDIAN, ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]} />}>
        <Route path="/guardian-portal/dashboard" element={<MainLayout><GuardianDashboard /></MainLayout>} />
        <Route path="/guardian-portal/bills" element={<MainLayout><GenericSubView title="Patient Daily Billing Summary" subtitle="Read-only Ledger Items" iconName="CreditCard" /></MainLayout>} />
        <Route path="/guardian-portal/updates" element={<MainLayout><GenericSubView title="Doctor & Nursing Progress Updates" subtitle="Live Inpatient Updates" iconName="Activity" /></MainLayout>} />
        <Route path="/guardian-portal/pay-online" element={<MainLayout><GenericSubView title="Online Bill Payment Gateway" subtitle="Instant Payment Clearance" iconName="IndianRupee" /></MainLayout>} />
      </Route>

      {/* Global Emergency Route */}
      <Route path="/emergency" element={<MainLayout><EmergencyConsoleView /></MainLayout>} />

      {/* Redirect Root to Login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
