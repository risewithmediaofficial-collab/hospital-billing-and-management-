import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../providers/SocketProvider';
import { useDepartmentNotificationStore } from '../../store/departmentNotificationStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useEmergencyStore } from '../../store/emergencyStore';
import { useWorkspaceModeStore } from '../../store/workspaceModeStore';
import { axiosClient } from '../../api/axiosClient';
import { ROLE_NAVIGATION, ROLE_NAMES } from '../../utils/constants';
import * as Icons from 'lucide-react';

let savedSidebarScrollTop = 0;

export const WORK_MODE_NAVIGATION = [
  // Clinical Workstation
  { title: 'Clinical EMR Desk', path: '/doctor/dashboard', icon: 'Stethoscope', module: 'doctorConsultation', category: 'Clinical Workstation', requiredRoles: ['DOCTOR', 'HOSPITAL_ADMIN'] },
  { title: 'Appointments Desk', path: '/doctor/dashboard?tab=LIVE', icon: 'Calendar', module: 'appointments', category: 'Clinical Workstation', requiredRoles: ['DOCTOR', 'HOSPITAL_ADMIN'] },
  { title: 'Completed Visits', path: '/doctor/dashboard?tab=COMPLETED', icon: 'CheckCircle2', module: 'doctorConsultation', category: 'Clinical Workstation', requiredRoles: ['DOCTOR', 'HOSPITAL_ADMIN'] },
  { title: 'Dept Responses', path: '/doctor/dashboard?tab=DEPT_RESPONSES', icon: 'FileCheck2', module: 'doctorConsultation', category: 'Clinical Workstation', requiredRoles: ['DOCTOR', 'HOSPITAL_ADMIN'] },

  // Front Desk & Billing
  { title: 'Register Patient', path: '/reception/register-patient', icon: 'UserPlus', module: 'patientRegistration', category: 'Front Desk & Billing', requiredRoles: ['RECEPTIONIST', 'HOSPITAL_ADMIN'] },
  { title: 'Tokens & Live Queue', path: '/reception/tokens', icon: 'Ticket', module: 'tokens', category: 'Front Desk & Billing', requiredRoles: ['RECEPTIONIST', 'OPD_STAFF', 'HOSPITAL_ADMIN'] },
  { title: 'Patients Directory', path: '/reception/registered-patients?tab=ALL', icon: 'Users', module: 'patients', category: 'Front Desk & Billing', requiredRoles: ['RECEPTIONIST', 'DOCTOR', 'HOSPITAL_ADMIN'] },
  { title: 'Central Billing Desk', path: '/billing/dashboard', icon: 'CreditCard', module: 'billing', category: 'Front Desk & Billing', requiredRoles: ['CASHIER', 'BILLING_STAFF', 'HOSPITAL_ADMIN'] },
  { title: 'Receipts & Payments', path: '/billing/dashboard?tab=RECEIPTS', icon: 'Receipt', module: 'billing', category: 'Front Desk & Billing', requiredRoles: ['CASHIER', 'BILLING_STAFF', 'HOSPITAL_ADMIN'] },

  // Inpatient & Ward
  { title: 'Nursing Workstation', path: '/nurse-incharge/dashboard', icon: 'Activity', module: 'nursing', category: 'Inpatient & Ward', requiredRoles: ['NURSE', 'NURSE_INCHARGE', 'IPD_STAFF', 'HOSPITAL_ADMIN', 'DOCTOR'] },
  { title: 'Ward & Bed Matrix', path: '/nurse-incharge/dashboard?tab=BEDS', icon: 'LayoutGrid', module: 'nursing', category: 'Inpatient & Ward', requiredRoles: ['NURSE', 'NURSE_INCHARGE', 'IPD_STAFF', 'HOSPITAL_ADMIN', 'DOCTOR'] },

  // Support & Diagnostics
  { title: 'Pharmacy Desk', path: '/pharmacy/dashboard', icon: 'Pill', module: 'pharmacy', category: 'Support & Diagnostics', requiredRoles: ['PHARMACIST', 'PHARMACY_STAFF', 'HOSPITAL_ADMIN'] },
  { title: 'Prescription Queue', path: '/pharmacy/dispense-queue', icon: 'Clock', module: 'pharmacy', category: 'Support & Diagnostics', requiredRoles: ['PHARMACIST', 'PHARMACY_STAFF', 'HOSPITAL_ADMIN'] },
  { title: 'Laboratory Desk', path: '/laboratory/dashboard', icon: 'TestTube', module: 'laboratory', category: 'Support & Diagnostics', requiredRoles: ['LAB_TECH', 'LABORATORY_STAFF', 'HOSPITAL_ADMIN'] },
  { title: 'Radiology Desk', path: '/radiology/dashboard', icon: 'Scan', module: 'radiology', category: 'Support & Diagnostics', requiredRoles: ['RADIOLOGIST', 'RADIOLOGY_STAFF', 'HOSPITAL_ADMIN'] },

  // Emergency
  { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency', category: 'Emergency Services', requiredRoles: ['*'] },
];

const ALL_MODULE_NAVIGATION = [
  { title: 'Patient Registration', path: '/reception/register-patient', icon: 'UserPlus', module: 'patientRegistration' },
  { title: 'Patients Management', path: '/reception/registered-patients?tab=ALL', icon: 'Users', module: 'patients' },
  { title: 'Tokens & Queue', path: '/reception/tokens', icon: 'Ticket', module: 'tokens' },
  { title: 'Reception Desk', path: '/reception/dashboard', icon: 'LayoutDashboard', module: 'appointments' },
  { title: 'Clinical EMR Desk', path: '/doctor/dashboard', icon: 'Stethoscope', module: 'doctorConsultation' },
  { title: 'Nursing Workstation', path: '/nursing/dashboard', icon: 'Activity', module: 'nursing' },
  { title: 'Patient Vitals & MAR', path: '/nursing/vitals', icon: 'ClipboardList', module: 'nursing' },
  { title: 'Ward In-Charge Desk', path: '/nurse-incharge/dashboard', icon: 'ShieldCheck', module: 'ipd' },
  { title: 'Laboratory Desk', path: '/laboratory/dashboard', icon: 'TestTube', module: 'laboratory' },
  { title: 'Radiology Desk', path: '/radiology/dashboard', icon: 'Scan', module: 'radiology' },
  { title: 'Pharmacy Desk', path: '/pharmacy/dashboard', icon: 'Pill', module: 'pharmacy' },
  { title: 'Central Billing Desk', path: '/billing/dashboard', icon: 'CreditCard', module: 'billing' },
  { title: 'Receipts & Payments', path: '/billing/dashboard?tab=RECEIPTS', icon: 'Receipt', module: 'billing' },
  { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency' },
  { title: 'Inventory Desk', path: '/inventory/dashboard', icon: 'Boxes', module: 'inventory' },
  { title: 'HR Desk', path: '/hr/dashboard', icon: 'UserCheck', module: 'hr' },
];

const checkItemPermission = (user, item) => {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN' || user.role === 'HOSPITAL_ADMIN') {
    if (user.enabledModules && item.module && user.enabledModules[item.module] === false) {
      return false;
    }
    return true;
  }

  // Explicit module check
  const permissions = user.permissions || {};
  if (permissions['*']?.includes('*') || permissions['*']?.includes('view')) return true;

  const targetModule = item.module || ({
    '/doctor/': 'doctorConsultation', '/reception/': 'appointments', '/nursing/': 'nursing',
    '/nurse-incharge/': 'ipd', '/laboratory/': 'laboratory', '/radiology/': 'radiology',
    '/pharmacy/': 'pharmacy', '/billing/': 'billing', '/inventory/': 'inventory', '/hr/': 'hr',
    '/emergency': 'emergency', '/admin/': 'dashboard',
  })[Object.keys({
    '/doctor/': 1, '/reception/': 1, '/nursing/': 1, '/nurse-incharge/': 1, '/laboratory/': 1, '/radiology/': 1, '/pharmacy/': 1, '/billing/': 1, '/inventory/': 1, '/hr/': 1, '/emergency': 1, '/admin/': 1,
  }).find((prefix) => item.path.startsWith(prefix))];

  if (!targetModule) return false;

  const aliases = {
    dashboard: ['dashboard'],
    doctor: ['doctor', 'doctorConsultation', 'emr'],
    doctorConsultation: ['doctorConsultation', 'doctor', 'emr'],
    patients: ['patients', 'patientRegistration'],
    patientRegistration: ['patientRegistration', 'patients'],
    appointments: ['appointments', 'reception', 'tokens'],
    tokens: ['tokens', 'appointments', 'reception'],
    reception: ['reception', 'appointments', 'patientRegistration', 'tokens', 'patients'],
    nursing: ['nursing'],
    ipd: ['ipd', 'nursing', 'beds'],
    beds: ['beds', 'ipd'],
    laboratory: ['laboratory', 'diagnostics'],
    radiology: ['radiology', 'diagnostics'],
    pharmacy: ['pharmacy'],
    billing: ['billing'],
    inventory: ['inventory'],
    hr: ['hr'],
    emergency: ['emergency'],
    notifications: ['notifications'],
    reports: ['reports'],
    auditLogs: ['auditLogs'],
    hospitalSettings: ['hospitalSettings'],
  }[targetModule] || [targetModule];

  for (const mod of aliases) {
    const values = permissions[mod];
    if (Array.isArray(values) && values.length > 0) {
      if (values.includes('*') || values.includes('view') || values.some((a) => typeof a === 'string')) {
        return true;
      }
    }
    if (typeof values === 'object' && values !== null && (values.view === true || values['*'] === true)) {
      return true;
    }
  }

  return false;
};

export const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const { addNotification, fetchInitialNotifications, fetchPendingWork, getUnreadCountForNav } = useDepartmentNotificationStore();
  const { fetchNotifications } = useNotificationStore();
  const { activeCount, addEmergency, fetchActiveEmergencies } = useEmergencyStore();
  const { currentMode, setMode, isDualModeEligible } = useWorkspaceModeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef(null);

  const handleSwitchMode = (targetMode) => {
    setMode(targetMode);
    const domainFromPath = location.pathname.split('/')[1];
    const isKnownNonTenant = ['admin', 'hospital-admin', 'doctor', 'reception', 'billing', 'pharmacy', 'laboratory', 'radiology', 'nursing', '403', 'login', 'reset-password'].includes(domainFromPath);
    const domain = user?.hospitalDomain || (!isKnownNonTenant && domainFromPath ? domainFromPath : null);

    if (targetMode === 'WORK') {
      const target = domain ? `/${domain}/doctor/dashboard` : '/doctor/dashboard';
      navigate(target);
    } else if (targetMode === 'ADMIN') {
      if (user?.role === 'SUPER_ADMIN') {
        navigate('/admin/dashboard');
      } else {
        const target = domain ? `/${domain}/admin/dashboard` : '/hospital-admin/dashboard';
        navigate(target);
      }
    }
  };

  useLayoutEffect(() => {
    const restore = () => {
      if (navRef.current && savedSidebarScrollTop > 0) {
        navRef.current.scrollTop = savedSidebarScrollTop;
      }
    };

    restore();

    const handle1 = requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });

    const timer1 = setTimeout(restore, 20);
    const timer2 = setTimeout(restore, 100);

    return () => {
      cancelAnimationFrame(handle1);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [location.pathname, location.search]);

  const handleNavScroll = (e) => {
    if (e.currentTarget.scrollTop > 0) {
      savedSidebarScrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleLinkClick = () => {
    if (navRef.current && navRef.current.scrollTop > 0) {
      savedSidebarScrollTop = navRef.current.scrollTop;
    }
    if (onClose) onClose();
  };

  const userRoles = [
    user?.role,
    ...(Array.isArray(user?.additionalRoles) ? user.additionalRoles : []),
  ].filter(Boolean);

  const isGuardianView = location.pathname.includes('/guardian') || user?.role === 'GUARDIAN';
  const isDual = isDualModeEligible(user);

  let menuItems = [];
  if (isGuardianView) {
    menuItems = ROLE_NAVIGATION.GUARDIAN || [];
  } else if (isDual && currentMode === 'ADMIN') {
    const adminNavs = ROLE_NAVIGATION.HOSPITAL_ADMIN || [];
    menuItems = adminNavs.filter((item) => {
      if (user.enabledModules && item.module && user.enabledModules[item.module] === false) {
        return false;
      }
      return true;
    });
  } else if (isDual && currentMode === 'WORK') {
    // Work Mode: All active operational desks for clinical and front-desk workflows
    menuItems = WORK_MODE_NAVIGATION.filter((item) => {
      if (user.enabledModules && item.module && user.enabledModules[item.module] === false) {
        return false;
      }
      if (item.requiredRoles.includes('*')) return true;
      // If user is HOSPITAL_ADMIN or has any matching required role
      if (user.role === 'HOSPITAL_ADMIN' || user.role === 'SUPER_ADMIN') return true;
      return item.requiredRoles.some((r) => userRoles.includes(r));
    });
  } else if (user?.role === 'HOSPITAL_ADMIN') {
    const adminNavs = ROLE_NAVIGATION.HOSPITAL_ADMIN || [];
    menuItems = adminNavs.filter((item) => {
      if (user.enabledModules && item.module && user.enabledModules[item.module] === false) {
        return false;
      }
      return true;
    });
  } else {
    let rawItems = [];
    userRoles.forEach((roleCode) => {
      const navs = ROLE_NAVIGATION[roleCode] || [];
      rawItems.push(...navs);
    });

    // Only fallback to ALL_MODULE_NAVIGATION for custom roles or when no role navigation is defined
    if (rawItems.length === 0 && !['PATIENT', 'GUARDIAN'].includes(user?.role)) {
      ALL_MODULE_NAVIGATION.forEach((navItem) => {
        if (userRoles.includes('RECEPTIONIST') && navItem.path === '/reception/register-patient') return;
        if (checkItemPermission(user, navItem)) {
          rawItems.push(navItem);
        }
      });
    }

    const seenPaths = new Set();
    const seenTitles = new Set();
    menuItems = rawItems.filter((item) => {
      if (!item?.path) return false;
      const titleKey = (item.title || item.name || '').trim().toLowerCase();
      if (seenPaths.has(item.path) || seenTitles.has(titleKey)) return false;
      seenPaths.add(item.path);
      if (titleKey) seenTitles.add(titleKey);
      if (user?.enabledModules && item.module && user.enabledModules[item.module] === false) {
        return false;
      }
      return true;
    });
  }

  const [totalReceiptsCount, setTotalReceiptsCount] = useState(0);

  useEffect(() => {
    if (user?.role) {
      fetchInitialNotifications(userRoles);
      fetchActiveEmergencies();
      const refreshTimer = setInterval(fetchPendingWork, 10000);
      return () => clearInterval(refreshTimer);
    }
  }, [user, fetchInitialNotifications, fetchPendingWork, fetchActiveEmergencies]);

  useEffect(() => {
    if (!socket) return;

    const workflowPaths = {
      PATIENT_QUEUED: '/doctor/dashboard?tab=LIVE',
      TOKEN_REQUEUED: '/doctor/dashboard?tab=LIVE',
      DOCTOR_ACCEPTED_PATIENT: '/reception/registered-patients?tab=QUEUED',
      LAB_ORDER_CREATED: '/laboratory/dashboard',
      RADIOLOGY_ORDER_CREATED: '/radiology/dashboard',
      LAB_ACCEPTED: '/doctor/dashboard?tab=DEPT_RESPONSES',
      LAB_SUBMITTED: '/doctor/dashboard?tab=DEPT_RESPONSES',
      RADIOLOGY_ACCEPTED: '/doctor/dashboard?tab=DEPT_RESPONSES',
      RADIOLOGY_SUBMITTED: '/doctor/dashboard?tab=DEPT_RESPONSES',
      DOCTOR_REVIEWED_LAB: '/laboratory/dashboard?tab=REPORTS',
      DOCTOR_REVIEWED_RADIOLOGY: '/radiology/dashboard?tab=REPORTS',
      PRESCRIPTION_ISSUED: '/pharmacy/dispense-queue',
      PHARMACY_ACCEPTED: '/doctor/dashboard',
      PHARMACY_DISPENSED: '/doctor/dashboard',
      BILL_REQUESTED: '/billing/dashboard',
      BILL_READY: '/reception/registered-patients?tab=COMPLETED',
      PAYMENT_COLLECTED: '/reception/registered-patients?tab=COMPLETED',
      NURSE_REQUEST_RAISED: '/nursing/requests',
      NURSE_REQUEST_COMPLETED: '/doctor/dashboard',
    };

    const resolveWorkflowPath = (data) => {
      if (data.event === 'CONSULTATION_COMPLETE') {
        return '/billing/dashboard';
      }
      if (data.event === 'PAYMENT_COLLECTED' && data.targetRole === 'DOCTOR') return '/doctor/dashboard?tab=COMPLETED';
      return workflowPaths[data.event] || data.linkedPath || data.payload?.linkedPath || null;
    };

    const handleWorkflowEvent = (data) => {
      const linkedPath = resolveWorkflowPath(data);
      const resourceId = data.payload?.orderId || data.payload?.appointmentId || data.payload?.patientId || data.payload?.uhid || 'item';
      const notificationId = data.id || `wf_${data.event}_${resourceId}`;
      addNotification({
        id: notificationId,
        event: data.event,
        title: data.title || 'Department Alert',
        message: data.message || '',
        patientName: data.payload?.patientName || 'Patient',
        uhid: data.payload?.uhid || 'N/A',
        orderId: data.payload?.orderId || null,
        linkedPath,
        timestamp: data.timestamp,
        isPending: ['PATIENT_QUEUED', 'LAB_ORDER_CREATED', 'RADIOLOGY_ORDER_CREATED', 'PRESCRIPTION_ISSUED', 'CONSULTATION_COMPLETE', 'NURSE_REQUEST_RAISED'].includes(data.event),
      });

      const currentPath = location.pathname + (location.search || '');
      // Viewing a route never resolves pending work; status transitions do.
    };

    const handleDoctorQueueNotification = (data) => {
      addNotification({
        id: `doc_q_${Date.now()}_${Math.random()}`,
        event: 'PATIENT_QUEUED',
        title: 'New Patient Queued',
        message: data.patientName ? `Patient ${data.patientName} queued for consultation` : 'New patient registered in OPD Queue',
        patientName: data.patientName || 'OPD Patient',
        linkedPath: '/doctor/dashboard',
        timestamp: new Date(),
      });
    };

    const handleNursingRequestNotification = (data) => {
      addNotification({
        id: `nurse_req_${Date.now()}_${Math.random()}`,
        event: 'CARE_REQUEST',
        title: `Care Request: ${data.requestType || 'In-Bed Alert'}`,
        message: `Patient requested ${data.requestType || 'assistance'}`,
        patientName: data.patientName || 'Inpatient',
        linkedPath: '/nursing/dashboard',
        timestamp: new Date(),
      });
    };

    const handleEmergencyAlert = (data) => {
      // Use the actual MongoDB _id from the payload so resolveEmergency API call works
      const resolvedId = data.emergencyId || data._id || data.id || `emg_${Date.now()}`;
      addEmergency({
        ...data,
        _id: resolvedId,
        id: resolvedId,
        emergencyId: resolvedId,
        event: 'EMERGENCY',
        title: data.title || '🚨 Emergency Alert',
        message: data.message || 'Code Blue triggered',
        patientName: data.patientName || data.payload?.patientName || 'Unknown Patient',
        linkedPath: '/emergency',
        timestamp: data.timestamp || new Date(),
      });
      // Refresh the bell notification count (emergency notifications are persisted to DB)
      fetchNotifications();
    };

    // Only listen to 'emergency:alert' here — SocketProvider already handles 'emergency:code_blue_triggered'
    // for the global CodeBlue modal. Listening to both in Sidebar would double-add emergencies.
    socket.on('emergency:alert', handleEmergencyAlert);
    socket.on('queue:patient_added', handleDoctorQueueNotification);
    socket.on('token:generated', handleDoctorQueueNotification);
    socket.on('appointment:created', handleDoctorQueueNotification);
    socket.on('patient_request:created', handleNursingRequestNotification);
    socket.on('workflow:notification', handleWorkflowEvent);
    socket.on('workflow:pending_changed', fetchPendingWork);
    // Also refresh bell count on any patient request status update
    socket.on('patient_request:updated', () => fetchNotifications());

    return () => {
      socket.off('emergency:alert', handleEmergencyAlert);
      socket.off('queue:patient_added', handleDoctorQueueNotification);
      socket.off('token:generated', handleDoctorQueueNotification);
      socket.off('appointment:created', handleDoctorQueueNotification);
      socket.off('patient_request:created', handleNursingRequestNotification);
      socket.off('workflow:notification', handleWorkflowEvent);
      socket.off('workflow:pending_changed', fetchPendingWork);
    };
  }, [socket]);


  useEffect(() => {
    if (!user?.role || !['CASHIER', 'BILLING_STAFF', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(user.role)) return;

    const fetchReceiptsCount = async () => {
      try {
        const res = await axiosClient.get('/billing/receipts');
        const receipts = res.data || [];
        setTotalReceiptsCount(receipts.length);
      } catch (err) {}
    };

    fetchReceiptsCount();

    if (socket) {
      socket.on('billing:invoice_created', fetchReceiptsCount);
      return () => socket.off('billing:invoice_created', fetchReceiptsCount);
    }
  }, [user, socket]);

  const formatTenantPath = (path) => {
    if (!path) return path;
    const targetPath = path;
    if (user?.role === 'SUPER_ADMIN') return targetPath;
    const domainFromPath = location.pathname.split('/')[1];
    const isKnownNonTenant = ['admin', 'hospital-admin', 'doctor', 'reception', 'billing', 'pharmacy', 'laboratory', 'radiology', 'nursing', '403', 'login', 'reset-password'].includes(domainFromPath);
    const domain = user?.hospitalDomain || (!isKnownNonTenant && domainFromPath ? domainFromPath : null);

    if (!domain) {
      if (targetPath.startsWith('/admin')) {
        return targetPath.replace(/^\/admin/, '/hospital-admin');
      }
      return targetPath;
    }
    if (targetPath.startsWith(`/${domain}`)) return targetPath;
    return `/${domain}${targetPath}`;
  };

  const isItemActive = (itemPath) => {
    const formatted = formatTenantPath(itemPath);
    const [itemPathname, itemSearch] = formatted.split('?');
    const currentSearch = location.search.replace('?', '');
    if (itemSearch) {
      return location.pathname === itemPathname && currentSearch === itemSearch;
    }
    return (location.pathname === itemPathname || location.pathname === itemPath.split('?')[0]) && !location.search.includes('tab=');
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const primaryRoleName = ROLE_NAMES[user?.role] || user?.role || 'Staff Member';
  const additionalRoleNames = (user?.additionalRoles || []).map((r) => ROLE_NAMES[r] || r).join(', ');

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 h-full max-h-screen bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 shadow-lg lg:shadow-none shrink-0 overflow-hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between gap-3 border-b border-slate-200 flex-shrink-0 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-200 bg-white">
              <img src="/rwmlogo.jpeg" alt="Logo" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-slate-800 text-sm tracking-tight leading-none block">
                HPMBS
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                Healthcare System
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Close sidebar"
          >
            <Icons.X size={20} />
          </button>
        </div>

        {/* Role Identity Badge */}
        <div className="px-3 pt-3 pb-1 shrink-0">
          <div className="px-3 py-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-xs">
            <div className="flex items-center justify-between">
              <p className="text-indigo-400 uppercase tracking-wider text-[10px] font-bold">
                Active User Role
              </p>
              {isDual && (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${currentMode === 'WORK' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white'}`}>
                  {currentMode === 'WORK' ? 'Work Mode' : 'Admin Mode'}
                </span>
              )}
            </div>
            <p className="font-bold text-indigo-700 mt-0.5 truncate text-sm">
              {isGuardianView ? 'Guardian Portal' : primaryRoleName}
            </p>
            {additionalRoleNames && (
              <p className="text-[11px] text-indigo-500 font-medium truncate mt-0.5">
                + {additionalRoleNames}
              </p>
            )}

            {/* Dual Mode Switcher in Sidebar Header */}
            {isDual && (
              <div className="grid grid-cols-2 gap-1 p-1 bg-white/90 rounded-lg border border-indigo-200/80 mt-2 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('WORK')}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-bold transition-all ${
                    currentMode === 'WORK'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Clinical & Patient Care Desks"
                >
                  <Icons.Stethoscope size={12} /> Work
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('ADMIN')}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-bold transition-all ${
                    currentMode === 'ADMIN'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Hospital Admin & Settings"
                >
                  <Icons.Building2 size={12} /> Admin
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Divider label */}
        <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
          {isDual && currentMode === 'WORK' ? 'Workstation Desks' : 'Main Menu'}
        </p>

        {/* Navigation Links */}
        <nav
          ref={navRef}
          onScroll={handleNavScroll}
          className="flex-1 min-h-0 px-3 pb-3 space-y-0.5 overflow-y-auto"
          aria-label="Sidebar navigation"
        >
          {menuItems.map((item, index) => {
            const IconComponent = Icons[item.icon] || Icons.Circle;
            const label = item.title || item.name || 'Navigation Item';
            const active = isItemActive(item.path);
            const navUnreadCount = getUnreadCountForNav(item.path);
            const isEmergencyItem = item.path === '/emergency';
            const isReceiptsHistory = item.path.includes('tab=RECEIPTS') || item.path.includes('/billing/receipts');

            const prevItem = index > 0 ? menuItems[index - 1] : null;
            const showCategoryDivider = item.category && (!prevItem || prevItem.category !== item.category);

            const handleNavClick = (e) => {
              if (isGuardianView && (isEmergencyItem || label === 'Emergency Assistance')) {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('open-emergency-modal'));
              }
              handleLinkClick();
            };

            return (
              <React.Fragment key={item.path}>
                {showCategoryDivider && (
                  <p className="px-3 pt-3 pb-1 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                    {item.category}
                  </p>
                )}
                <Link
                  to={formatTenantPath(item.path)}
                  onClick={handleNavClick}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 border-l-2 ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 font-semibold border-l-indigo-500'
                      : isEmergencyItem && activeCount > 0
                      ? 'bg-red-50 text-red-700 font-bold border-l-red-600 animate-pulse'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-transparent'
                  }`}
                >
                <div className="flex items-center gap-3 min-w-0">
                  <IconComponent
                    size={16}
                    className={`shrink-0 ${
                      isEmergencyItem && activeCount > 0
                        ? 'text-red-600'
                        : active
                        ? 'text-indigo-500'
                        : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{label}</span>
                </div>

                {isEmergencyItem && activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white shadow-xs animate-bounce">
                    {activeCount}
                  </span>
                )}

                {!isEmergencyItem && navUnreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-xs animate-pulse">
                    {navUnreadCount}
                  </span>
                )}

                {isReceiptsHistory && totalReceiptsCount > 0 && navUnreadCount === 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-2xs">
                    {totalReceiptsCount}
                  </span>
                )}
                </Link>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex-shrink-0 bg-slate-50">
          <p className="text-[11px] text-slate-400 font-medium text-center">
            HPMBS Enterprise OS v2.4.0 &mdash; ISO &amp; HIPAA Compliant
          </p>
        </div>
      </aside>
    </>
  );
};
