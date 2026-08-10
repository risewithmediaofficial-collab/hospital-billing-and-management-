import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const checkModulePermission = (permissions, currentModule) => {
  if (!permissions) return false;
  if (permissions['*']?.includes('*') || permissions['*']?.includes('view')) return true;

  const aliases = {
    doctor: ['doctor', 'doctorConsultation', 'emr'],
    reception: ['reception', 'patientRegistration', 'patients', 'tokens', 'appointments'],
    nursing: ['nursing'],
    ipd: ['ipd', 'nursing', 'beds'],
    laboratory: ['laboratory', 'diagnostics'],
    radiology: ['radiology', 'diagnostics'],
    pharmacy: ['pharmacy'],
    billing: ['billing'],
    inventory: ['inventory'],
    hr: ['hr'],
    emergency: ['emergency'],
    patients: ['patients', 'patientRegistration'],
    appointments: ['appointments'],
  }[currentModule] || [currentModule];

  for (const mod of aliases) {
    const values = permissions[mod];
    if (Array.isArray(values) && (values.includes('*') || values.includes('view'))) {
      return true;
    }
    if (typeof values === 'object' && values !== null && (values.view === true || values['*'] === true)) {
      return true;
    }
  }

  return false;
};

export const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-700">Verifying session security...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !user) {
    return <Navigate to="/login" replace />;
  }

  const routeModules = [
    ['/doctor/', 'doctor'], ['/reception/', 'reception'], ['/nursing/', 'nursing'],
    ['/nurse-incharge/', 'ipd'], ['/laboratory/', 'laboratory'], ['/radiology/', 'radiology'],
    ['/pharmacy/', 'pharmacy'], ['/billing/', 'billing'], ['/inventory/', 'inventory'],
    ['/hr/', 'hr'], ['/emergency', 'emergency'], ['/patients', 'patients'], ['/appointments', 'appointments'],
  ];
  const currentModule = routeModules.find(([prefix]) => location.pathname.includes(prefix))?.[1];

  const userRoles = [
    user?.role,
    ...(Array.isArray(user?.additionalRoles) ? user.additionalRoles : []),
  ].filter(Boolean);

  const hasRoleMatch = allowedRoles.length === 0 ||
    allowedRoles.some((role) => userRoles.includes(role)) ||
    userRoles.includes('SUPER_ADMIN');

  const hasPerm = currentModule ? checkModulePermission(user?.permissions, currentModule) : false;

  if (allowedRoles.length > 0 && user && !hasRoleMatch && !hasPerm) {
    return <Navigate to="/403" replace />;
  }

  if (user?.role === 'SUPER_ADMIN') {
    return <Outlet />;
  }

  if (currentModule && user?.role === 'HOSPITAL_ADMIN' && user.enabledModules?.[currentModule] === false) {
    return <Navigate to="/403" replace />;
  }

  if (currentModule && user?.role !== 'HOSPITAL_ADMIN' && user?.role !== 'SUPER_ADMIN') {
    const allowed = checkModulePermission(user?.permissions, currentModule);
    if (!allowed) return <Navigate to="/403" replace />;
  }

  return <Outlet />;
};
