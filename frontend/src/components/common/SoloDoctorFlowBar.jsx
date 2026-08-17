import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { UserPlus, Ticket, Stethoscope, CreditCard, ChevronRight, Sparkles, Activity } from 'lucide-react';

export const SoloDoctorFlowBar = ({ className = '', activeStepOverride = null }) => {
  const location = useLocation();
  const { user } = useAuthStore();

  const formatTenantPath = (path) => {
    if (!path) return path;
    if (user?.role === 'SUPER_ADMIN' || !user?.hospitalDomain) return path;
    if (path.startsWith(`/${user.hospitalDomain}`)) return path;
    return `/${user.hospitalDomain}${path}`;
  };

  const steps = [
    {
      id: 'register',
      stepNumber: '1',
      title: 'Register Patient',
      desc: 'New intake & MRN file',
      path: '/reception/register-patient',
      icon: UserPlus,
      activePatterns: ['/reception/register-patient', '/reception/registered-patients'],
      accentColor: 'indigo',
    },
    {
      id: 'token',
      stepNumber: '2',
      title: 'Issue Token',
      desc: 'OPD queue & token allocation',
      path: '/reception/tokens',
      icon: Ticket,
      activePatterns: ['/reception/tokens', '/reception/dashboard'],
      accentColor: 'amber',
    },
    {
      id: 'consult',
      stepNumber: '3',
      title: 'Consult & EMR',
      desc: 'Diagnosis, treatment & Rx',
      path: '/doctor/dashboard',
      icon: Stethoscope,
      activePatterns: ['/doctor/dashboard', '/doctor/consultation', '/doctor'],
      accentColor: 'emerald',
    },
    {
      id: 'billing',
      stepNumber: '4',
      title: 'Billing & Receipt',
      desc: 'Invoice & collect payment',
      path: '/billing/dashboard',
      icon: CreditCard,
      activePatterns: ['/billing/dashboard', '/billing'],
      accentColor: 'purple',
    },
  ];

  const currentPath = location.pathname;

  const getIsActive = (step) => {
    if (activeStepOverride) return activeStepOverride === step.id;
    return step.activePatterns.some((pattern) => currentPath.includes(pattern));
  };

  return (
    <div className={`bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-3 sm:p-4 text-white shadow-md border border-indigo-900/50 ${className}`}>
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Sparkles size={14} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-black tracking-wide uppercase text-indigo-200">
              Solo Doctor & Clinic Operations Flow
            </h3>
            <p className="text-[11px] text-slate-300">
              Complete patient journey: Intake &rarr; Token &rarr; Treatment &rarr; Payment
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Activity size={11} className="animate-pulse" /> Live Integrated Workbench
          </span>
        </div>
      </div>

      {/* 4 Steps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {steps.map((step, idx) => {
          const isActive = getIsActive(step);
          const Icon = step.icon;

          return (
            <Link
              key={step.id}
              to={formatTenantPath(step.path)}
              className={`relative group rounded-xl p-3 transition-all duration-200 border flex flex-col justify-between ${
                isActive
                  ? 'bg-white text-slate-900 border-white shadow-lg scale-[1.02] ring-2 ring-indigo-400/50'
                  : 'bg-white/10 text-white border-white/10 hover:bg-white/15 hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white/20 text-white'
                    }`}
                  >
                    {step.stepNumber}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-extrabold truncate leading-tight ${isActive ? 'text-slate-900' : 'text-white'}`}>
                      {step.title}
                    </p>
                    <p className={`text-[10px] truncate leading-none mt-0.5 ${isActive ? 'text-slate-500 font-medium' : 'text-slate-300'}`}>
                      {step.desc}
                    </p>
                  </div>
                </div>

                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'bg-white/10 text-white/80 group-hover:text-white'
                  }`}
                >
                  <Icon size={15} />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-current/10 text-[10px] font-bold">
                <span className={isActive ? 'text-indigo-600' : 'text-indigo-300'}>
                  {isActive ? '● Active Desk' : 'Open Desk'}
                </span>
                <span className="flex items-center gap-0.5 opacity-80 group-hover:translate-x-0.5 transition-transform">
                  Go <ChevronRight size={12} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
