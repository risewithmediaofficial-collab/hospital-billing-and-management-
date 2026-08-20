import React, { useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceModeStore } from '../../store/workspaceModeStore';
import { useAvailability } from '../../hooks/useAvailability';
import { ROLE_NAMES } from '../../utils/constants';
import {
  User,
  Mail,
  Building2,
  GitFork,
  Stethoscope,
  ShieldCheck,
  Power,
  LogOut,
  X,
  Sparkles,
  Briefcase,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '../ui/Button';

export const UserProfilePopover = ({ isOpen, onClose }) => {
  const { user, logout } = useAuthStore();
  const { currentMode, setMode, isDualModeEligible } = useWorkspaceModeStore();
  const { isAvailable, isToggling, handleToggle } = useAvailability();
  const popoverRef = useRef(null);

  const canSetAvailability = user && !['PATIENT', 'GUARDIAN', 'SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(user.role);
  const isDual = isDualModeEligible(user);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const primaryRoleName = ROLE_NAMES[user.role] || user.role || 'Staff Member';
  const additionalRoles = Array.isArray(user.additionalRoles) ? user.additionalRoles : [];

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-14 w-88 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fade-in text-slate-900"
    >
      {/* Header with Avatar & Name */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close profile"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-indigo-600 border-2 border-indigo-400 flex items-center justify-center text-white font-extrabold text-lg shadow-md shrink-0">
            {user.name ? user.name.charAt(0).toUpperCase() : <User size={22} />}
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <h3 className="font-extrabold text-base leading-tight truncate text-white">
              {user.name}
            </h3>
            <p className="text-xs text-indigo-300 font-medium flex items-center gap-1.5 mt-0.5 truncate">
              <Mail size={12} className="shrink-0" />
              <span className="truncate">{user.email || 'staff@hospital.com'}</span>
            </p>
          </div>
        </div>

        {/* Primary Role Pill */}
        <div className="mt-3 flex items-center justify-between gap-2 pt-2.5 border-t border-slate-800">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
              {primaryRoleName}
            </span>
          </div>

          {canSetAvailability && (
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span className={isAvailable ? 'text-emerald-300 text-[11px]' : 'text-rose-300 text-[11px]'}>
                {isAvailable ? 'Online' : 'Offline'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Body Details */}
      <div className="p-4 space-y-3.5 text-xs bg-slate-50/50">
        {/* Hospital & Branch */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 font-semibold">
            <span className="flex items-center gap-1.5 text-slate-700">
              <Building2 size={14} className="text-indigo-600" />
              Hospital
            </span>
            <span className="font-bold text-slate-900 truncate max-w-[180px]">
              {user.hospitalName || 'Main Hospital Campus'}
            </span>
          </div>

          {user.branchName && (
            <div className="flex items-center justify-between text-slate-500 font-semibold pt-1.5 border-t border-slate-100">
              <span className="flex items-center gap-1.5 text-slate-700">
                <GitFork size={14} className="text-indigo-600" />
                Branch
              </span>
              <span className="font-bold text-slate-900 truncate max-w-[180px]">
                {user.branchName}
              </span>
            </div>
          )}

          {user.department && (
            <div className="flex items-center justify-between text-slate-500 font-semibold pt-1.5 border-t border-slate-100">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Briefcase size={14} className="text-indigo-600" />
                Department
              </span>
              <span className="font-bold text-slate-900 truncate max-w-[180px]">
                {user.department}
              </span>
            </div>
          )}
        </div>

        {/* Assigned Additional Roles */}
        {additionalRoles.length > 0 && (
          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <ShieldCheck size={12} className="text-indigo-600" /> Assigned Roles & Permissions
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-extrabold">
                {primaryRoleName} (Primary)
              </span>
              {additionalRoles.map((roleCode) => (
                <span
                  key={roleCode}
                  className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold"
                >
                  + {ROLE_NAMES[roleCode] || roleCode}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Multi-Role Dual Workspace Mode Switcher */}
        {isDual && (
          <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-indigo-900 flex items-center gap-1">
                <Sparkles size={13} className="text-indigo-600" /> Workspace Mode
              </span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${currentMode === 'WORK' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white'}`}>
                {currentMode === 'WORK' ? 'Work Mode Active' : 'Admin Mode Active'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setMode('WORK')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all ${
                  currentMode === 'WORK'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-indigo-100 text-slate-700 border border-indigo-200'
                }`}
              >
                <Stethoscope size={13} /> Work Mode
              </button>
              <button
                type="button"
                onClick={() => setMode('ADMIN')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all ${
                  currentMode === 'ADMIN'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <Building2 size={13} /> Admin Mode
              </button>
            </div>
          </div>
        )}

        {/* Availability Toggle Button */}
        {canSetAvailability && (
          <button
            type="button"
            onClick={handleToggle}
            disabled={isToggling}
            className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors shadow-2xs ${
              isAvailable
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
            }`}
          >
            <span className="flex items-center gap-2">
              {isAvailable ? <Wifi size={15} className="text-emerald-600" /> : <WifiOff size={15} className="text-rose-600" />}
              <span>Duty Status: <strong>{isAvailable ? 'Online (Receiving Patients)' : 'Offline (Paused)'}</strong></span>
            </span>
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
              {isToggling ? 'Updating…' : 'Change'}
            </span>
          </button>
        )}
      </div>

      {/* Footer / Logout */}
      <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="font-bold text-xs"
        >
          Close
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            onClose();
            logout();
          }}
          className="font-bold text-xs gap-1.5 shadow-xs"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );
};

export default UserProfilePopover;
