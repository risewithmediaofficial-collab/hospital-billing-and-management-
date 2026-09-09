import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Compass, Home, BedDouble, UserPlus, ArrowRight, ShieldAlert, LogIn } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ROLES } from '../utils/constants';

export const NotFoundPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();
  const [countdown, setCountdown] = useState(5);
  const [autoRedirectCancelled, setAutoRedirectCancelled] = useState(false);

  const pathParts = location.pathname.split('/').filter(Boolean);
  const potentialDomain = pathParts[0] && !['admin', 'hospital-admin', 'doctor', 'nurse', 'nursing', 'reception', 'pharmacy', 'laboratory', 'radiology', 'billing', 'patient', 'guardian', 'workflow', 'login'].includes(pathParts[0])
    ? pathParts[0]
    : user?.hospitalDomain || null;

  const getTargetDashboard = () => {
    if (!isAuthenticated || !user) {
      return potentialDomain ? `/${potentialDomain}/login` : '/login';
    }
    if (user.role === ROLES.SUPER_ADMIN) {
      return '/admin/dashboard';
    }
    const domain = potentialDomain || user.hospitalDomain || 'testhospital';
    const routes = {
      [ROLES.HOSPITAL_ADMIN]: `/${domain}/admin/dashboard`,
      [ROLES.DOCTOR]: `/${domain}/doctor/dashboard`,
      [ROLES.NURSE]: `/${domain}/nurse/dashboard`,
      [ROLES.NURSE_INCHARGE]: `/${domain}/nurse-incharge/dashboard`,
      [ROLES.RECEPTIONIST]: `/${domain}/reception/dashboard`,
      [ROLES.PHARMACIST]: `/${domain}/pharmacy/dashboard`,
      [ROLES.LAB_TECH]: `/${domain}/laboratory/dashboard`,
      [ROLES.RADIOLOGIST]: `/${domain}/radiology/dashboard`,
      [ROLES.CASHIER]: `/${domain}/billing/dashboard`,
      [ROLES.PATIENT]: `/${domain}/patient/dashboard`,
      [ROLES.GUARDIAN]: `/${domain}/guardian/dashboard`,
    };
    return routes[user.role] || `/${domain}/admin/dashboard`;
  };

  const targetDashboard = getTargetDashboard();

  useEffect(() => {
    if (autoRedirectCancelled) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(targetDashboard);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRedirectCancelled, targetDashboard, navigate]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-lg w-full bg-slate-800/80 border border-slate-700/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Compass size={36} className="animate-spin-slow" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-3">
          <span>HPMBS Smart Navigation Assistant</span>
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight">
          Page Relocated or Not Found
        </h1>

        <p className="mt-2 text-sm text-slate-400 font-mono break-all px-4 py-2 bg-slate-900/60 rounded-xl border border-slate-700/50">
          {location.pathname}
        </p>

        <p className="mt-4 text-xs text-slate-400">
          Auto-navigating back to your primary workstation in{' '}
          <span className="text-indigo-400 font-bold text-sm">{countdown}s</span>...
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <Button
            variant="primary"
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20"
            onClick={() => navigate(targetDashboard)}
          >
            <Home size={18} />
            <span>Return to Workstation Dashboard</span>
            <ArrowRight size={16} />
          </Button>

          {potentialDomain && (
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => {
                  setAutoRedirectCancelled(true);
                  navigate(`/${potentialDomain}/admin/bed-matrix`);
                }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-600/50 transition-colors"
              >
                <BedDouble size={14} className="text-emerald-400" />
                <span>Bed Matrix</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAutoRedirectCancelled(true);
                  navigate(`/${potentialDomain}/patient/register`);
                }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-600/50 transition-colors"
              >
                <UserPlus size={14} className="text-blue-400" />
                <span>Patient Registration</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setAutoRedirectCancelled(true)}
            className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-4"
          >
            Cancel automatic redirection
          </button>
        </div>
      </div>
    </div>
  );
};
