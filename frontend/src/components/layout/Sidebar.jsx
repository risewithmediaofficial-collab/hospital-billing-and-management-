import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../providers/SocketProvider';
import { useDepartmentNotificationStore } from '../../store/departmentNotificationStore';
import { useEmergencyStore } from '../../store/emergencyStore';
import { axiosClient } from '../../api/axiosClient';
import { ROLE_NAVIGATION, ROLE_NAMES } from '../../utils/constants';
import * as Icons from 'lucide-react';

let savedSidebarScrollTop = 0;

const ALL_MODULE_NAVIGATION = [
  { title: 'Patient Registration', path: '/reception/register-patient', icon: 'UserPlus', module: 'patientRegistration' },
  { title: 'Patients Management', path: '/reception/registered-patients?tab=ALL', icon: 'Users', module: 'patients' },
  { title: 'Tokens & Queue', path: '/reception/tokens', icon: 'Ticket', module: 'tokens' },
  { title: 'Appointments Desk', path: '/reception/dashboard', icon: 'Calendar', module: 'appointments' },
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
  const { activeCount, addEmergency, fetchActiveEmergencies } = useEmergencyStore();
  const location = useLocation();
  const navRef = useRef(null);

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

  let menuItems = [];
  if (user?.role === 'HOSPITAL_ADMIN') {
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
      if (!['PATIENT_QUEUED', 'LAB_ORDER_CREATED', 'RADIOLOGY_ORDER_CREATED', 'PRESCRIPTION_ISSUED', 'CONSULTATION_COMPLETE', 'NURSE_REQUEST_RAISED'].includes(data.event) && linkedPath && (currentPath === linkedPath || (!linkedPath.includes('?') && location.pathname === linkedPath))) {
        useDepartmentNotificationStore.getState().markAsRead(notificationId);
      }
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
      addEmergency({
        id: data.id || `emg_${Date.now()}`,
        event: 'EMERGENCY',
        title: data.title || '🚨 Emergency Alert',
        message: data.message || 'Code Blue triggered',
        patientName: data.patientName || data.payload?.patientName || 'Unknown Patient',
        linkedPath: '/emergency',
        timestamp: data.timestamp || new Date(),
      });
      addNotification({
        id: `emg_notif_${Date.now()}`,
        event: 'EMERGENCY',
        title: data.title || '🚨 Emergency Alert',
        message: data.message || 'Code Blue triggered',
        patientName: data.patientName || data.payload?.patientName || 'Unknown Patient',
        linkedPath: '/emergency',
        timestamp: data.timestamp || new Date(),
      });
    };

    socket.on('emergency:alert', handleEmergencyAlert);
    socket.on('emergency:code_blue_triggered', handleEmergencyAlert);
    socket.on('queue:patient_added', handleDoctorQueueNotification);
    socket.on('token:generated', handleDoctorQueueNotification);
    socket.on('appointment:created', handleDoctorQueueNotification);
    socket.on('patient_request:created', handleNursingRequestNotification);
    socket.on('workflow:notification', handleWorkflowEvent);
    socket.on('workflow:pending_changed', fetchPendingWork);

    return () => {
      socket.off('emergency:alert', handleEmergencyAlert);
      socket.off('emergency:code_blue_triggered', handleEmergencyAlert);
      socket.off('queue:patient_added', handleDoctorQueueNotification);
      socket.off('token:generated', handleDoctorQueueNotification);
      socket.off('appointment:created', handleDoctorQueueNotification);
      socket.off('patient_request:created', handleNursingRequestNotification);
      socket.off('workflow:notification', handleWorkflowEvent);
      socket.off('workflow:pending_changed', fetchPendingWork);
    };
  }, [socket, addNotification, addEmergency, fetchPendingWork, location.pathname, location.search]);

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
    let targetPath = path;
    if (user?.role === 'DOCTOR' && (path === '/reception/dashboard' || path.includes('/reception/dashboard'))) {
      targetPath = '/doctor/dashboard?tab=LIVE';
    }
    // SUPER_ADMIN has no hospital domain; absolute paths stay absolute
    if (user?.role === 'SUPER_ADMIN' || !user?.hospitalDomain) return targetPath;
    // Already has the tenant prefix — leave it
    if (targetPath.startsWith(`/${user.hospitalDomain}`)) return targetPath;
    return `/${user.hospitalDomain}${targetPath}`;
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
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0 shadow-sm">
              H
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
            <p className="text-indigo-400 uppercase tracking-wider text-[10px] font-bold">
              Active User Role
            </p>
            <p className="font-bold text-indigo-700 mt-0.5 truncate text-sm">
              {primaryRoleName}
            </p>
            {additionalRoleNames && (
              <p className="text-[11px] text-indigo-500 font-medium truncate mt-0.5">
                + {additionalRoleNames}
              </p>
            )}
          </div>
        </div>

        {/* Divider label */}
        <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
          Main Menu
        </p>

        {/* Navigation Links */}
        <nav
          ref={navRef}
          onScroll={handleNavScroll}
          className="flex-1 min-h-0 px-3 pb-3 space-y-0.5 overflow-y-auto"
          aria-label="Sidebar navigation"
        >
          {menuItems.map((item) => {
            const IconComponent = Icons[item.icon] || Icons.Circle;
            const label = item.title || item.name || 'Navigation Item';
            const active = isItemActive(item.path);
            const navUnreadCount = getUnreadCountForNav(item.path);
            const isEmergencyItem = item.path === '/emergency';
            const isReceiptsHistory = item.path.includes('tab=RECEIPTS') || item.path.includes('/billing/receipts');

            return (
              <Link
                key={item.path}
                to={formatTenantPath(item.path)}
                onClick={handleLinkClick}
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
