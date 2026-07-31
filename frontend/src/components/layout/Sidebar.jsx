import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../providers/SocketProvider';
import { useDepartmentNotificationStore } from '../../store/departmentNotificationStore';
import { useEmergencyStore } from '../../store/emergencyStore';
import { axiosClient } from '../../api/axiosClient';
import { ROLE_NAVIGATION, ROLE_NAMES } from '../../utils/constants';
import * as Icons from 'lucide-react';

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
    '/emergency': 'emergency',
  })[Object.keys({
    '/doctor/': 1, '/reception/': 1, '/nursing/': 1, '/nurse-incharge/': 1, '/laboratory/': 1, '/radiology/': 1, '/pharmacy/': 1, '/billing/': 1, '/inventory/': 1, '/hr/': 1, '/emergency': 1,
  }).find((prefix) => item.path.startsWith(prefix))];

  if (!targetModule) return false;

  const aliases = {
    dashboard: ['dashboard', 'doctorConsultation', 'doctor'],
    doctor: ['doctor', 'doctorConsultation', 'emr'],
    doctorConsultation: ['doctorConsultation', 'doctor', 'emr', 'dashboard'],
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
  const { addNotification, fetchInitialNotifications, getUnreadCountForNav } = useDepartmentNotificationStore();
  const { activeCount, addEmergency, fetchActiveEmergencies } = useEmergencyStore();
  const location = useLocation();

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

    ALL_MODULE_NAVIGATION.forEach((navItem) => {
      if (checkItemPermission(user, navItem)) {
        rawItems.push(navItem);
      }
    });

    const seenPaths = new Set();
    menuItems = rawItems.filter((item) => {
      if (!item?.path) return false;
      if (seenPaths.has(item.path)) return false;
      seenPaths.add(item.path);
      return checkItemPermission(user, item);
    });
  }

  const [totalReceiptsCount, setTotalReceiptsCount] = useState(0);

  useEffect(() => {
    if (user?.role) {
      fetchInitialNotifications(user.role);
      fetchActiveEmergencies();
    }
  }, [user, fetchInitialNotifications, fetchActiveEmergencies]);

  useEffect(() => {
    if (!socket) return;

    const handleWorkflowEvent = (data) => {
      addNotification({
        id: data.id || `wf_${Date.now()}`,
        event: data.event,
        title: data.title || 'Department Alert',
        message: data.message || '',
        patientName: data.payload?.patientName || 'Patient',
        uhid: data.payload?.uhid || 'N/A',
        orderId: data.payload?.orderId || null,
        linkedPath: data.linkedPath || data.payload?.linkedPath || null,
        timestamp: data.timestamp,
      });
    };

    const handleEmergencyAlert = (data) => {
      addEmergency(data);
    };

    socket.on('emergency:alert', handleEmergencyAlert);
    socket.on('emergency:code_blue_triggered', handleEmergencyAlert);
    socket.on('diagnostics:report_ready', handleWorkflowEvent);
    socket.on('investigation:status_updated', handleWorkflowEvent);

    return () => {
      socket.off('emergency:alert', handleEmergencyAlert);
      socket.off('emergency:code_blue_triggered', handleEmergencyAlert);
      socket.off('diagnostics:report_ready', handleWorkflowEvent);
      socket.off('investigation:status_updated', handleWorkflowEvent);
    };
  }, [socket, addNotification, addEmergency]);

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

  const isItemActive = (itemPath) => {
    const [itemPathname, itemSearch] = itemPath.split('?');
    const currentSearch = location.search.replace('?', '');
    if (itemSearch) {
      return location.pathname === itemPathname && currentSearch === itemSearch;
    }
    return location.pathname === itemPathname && !location.search.includes('tab=');
  };

  const primaryRoleName = ROLE_NAMES[user?.role] || user?.role || 'Staff Member';
  const additionalRoleNames = (user?.additionalRoles || []).map((r) => ROLE_NAMES[r] || r).join(', ');

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 shadow-lg lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200 flex-shrink-0 bg-white">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0 shadow-sm">
            H
          </div>
          <div className="min-w-0">
            <span className="font-extrabold text-slate-800 text-sm tracking-tight leading-none block">
              HPMBS
            </span>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
              Enterprise SaaS
            </span>
          </div>
        </div>

        {/* Role Identity Badge */}
        <div className="px-3 pt-3 pb-1">
          <div className="px-3 py-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-xs">
            <p className="text-indigo-400 uppercase tracking-wider text-[10px] font-bold">
              Active Roles & Privileges
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
        <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Navigation
        </p>

        {/* Navigation Links */}
        <nav
          className="flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto"
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
                to={item.path}
                onClick={onClose}
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
            HPMBS v1.0.0 &mdash; HIPAA Compliant
          </p>
        </div>
      </aside>
    </>
  );
};
