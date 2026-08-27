import React, { useState, useRef, useEffect } from 'react';
import { useAvailability } from '../../hooks/useAvailability';
import {
  Stethoscope, UserCheck, Receipt, Pill, TestTube,
  Activity, BedDouble, ShieldAlert, ChevronDown, CheckCircle2,
  Power, Layers, Check, X, Shield, Sparkles
} from 'lucide-react';

const DEPARTMENTS = [
  {
    key: 'DOCTOR',
    name: 'Doctor / OPD Desk',
    desc: 'Consultations, EMR, Prescriptions & OPD Queue',
    icon: Stethoscope,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    accent: 'bg-cyan-600',
  },
  {
    key: 'RECEPTIONIST',
    name: 'Reception Desk',
    desc: 'Patient Registration, Appointments & Tokens',
    icon: UserCheck,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    accent: 'bg-indigo-600',
  },
  {
    key: 'CASHIER',
    name: 'Cashier & Billing',
    desc: 'Invoice Settlement, Payments & Receipts',
    icon: Receipt,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    accent: 'bg-emerald-600',
  },
  {
    key: 'PHARMACIST',
    name: 'Pharmacy Desk',
    desc: 'Prescription Dispense & Medicine Stocks',
    icon: Pill,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    accent: 'bg-purple-600',
  },
  {
    key: 'LAB_TECH',
    name: 'Laboratory Desk',
    desc: 'Blood & Pathology Tests & Report Entry',
    icon: TestTube,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    accent: 'bg-amber-600',
  },
  {
    key: 'RADIOLOGIST',
    name: 'Radiology Desk',
    desc: 'X-Ray, CT, Ultrasound & Imaging Scans',
    icon: Activity,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    accent: 'bg-blue-600',
  },
  {
    key: 'NURSE',
    name: 'Nursing & IPD Ward',
    desc: 'Inpatient Beds, Nurse Tasks & Injections',
    icon: BedDouble,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    accent: 'bg-rose-600',
  },
  {
    key: 'EMERGENCY_STAFF',
    name: 'Emergency Desk',
    desc: 'Code Blue, Rapid Triage & Critical Alerts',
    icon: ShieldAlert,
    color: 'text-red-600 bg-red-50 border-red-200',
    accent: 'bg-red-600',
  },
];

export const AdminAvailabilityPopover = () => {
  const {
    isAvailable,
    departmentAvailability,
    isToggling,
    handleToggle,
    handleDepartmentToggle,
    handleSetAllDepartments,
    statusMessage,
  } = useAvailability();

  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  // Count active departments
  const activeCount = Object.values(departmentAvailability || {}).filter(Boolean).length;
  const totalCount = DEPARTMENTS.length;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isToggling}
        className={`flex items-center gap-1 sm:gap-1.5 h-8 px-2 sm:px-2.5 py-1 rounded-lg border text-xs font-black transition-all shadow-2xs cursor-pointer shrink-0 ${
          isAvailable
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100/80'
            : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
        }`}
        title="Configure Admin Availability & Department Work Mode"
      >
        <span className="relative flex h-2 w-2">
          {isAvailable && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isAvailable ? 'bg-emerald-500' : 'bg-slate-400'
            }`}
          ></span>
        </span>

        <span className="hidden md:inline">
          {isAvailable ? `Available (${activeCount}/${totalCount})` : 'Unavailable'}
        </span>
        <span className="md:hidden hidden sm:inline">
          {isAvailable ? `(${activeCount}/${totalCount})` : 'Off'}
        </span>
        <span className="sm:hidden">
          {isAvailable ? `${activeCount}/${totalCount}` : 'Off'}
        </span>

        <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Content */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[410px] max-w-[calc(100vw-20px)] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fade-in text-slate-900">
          {/* Header */}
          <div className="p-4 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <Shield size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black leading-tight flex items-center gap-1.5">
                    Admin Availability &amp; Work Mode
                  </h3>
                  <p className="text-[11px] text-indigo-200/80">
                    Step in as backup when regular staff are absent
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Total / Master Toggle Banner */}
            <div className="mt-3.5 p-3 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-200 block">
                  Total Admin Availability
                </span>
                <span className="text-xs font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                  <Power size={13} className={isAvailable ? 'text-emerald-400' : 'text-slate-400'} />
                  {isAvailable ? 'AVAILABLE (ACTIVE IN WORKFLOWS)' : 'UNAVAILABLE (OFFLINE)'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleToggle()}
                disabled={isToggling}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isAvailable ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isAvailable ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Body: Department Breakdown */}
          <div className="p-3.5 space-y-3 max-h-[380px] overflow-y-auto">
            {/* Quick Actions */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={13} className="text-indigo-600" />
                Department Desks ({activeCount}/{totalCount} Active)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetAllDepartments(true)}
                  disabled={isToggling}
                  className="px-2 py-0.5 rounded-md text-[11px] font-extrabold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition-colors"
                >
                  Enable All
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllDepartments(false)}
                  disabled={isToggling}
                  className="px-2 py-0.5 rounded-md text-[11px] font-extrabold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  Pause All
                </button>
              </div>
            </div>

            {/* Department List */}
            <div className="space-y-1.5">
              {DEPARTMENTS.map((dept) => {
                const Icon = dept.icon;
                const isDeptActive = Boolean(departmentAvailability?.[dept.key]) && isAvailable;

                return (
                  <div
                    key={dept.key}
                    onClick={() => handleDepartmentToggle(dept.key)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 select-none ${
                      isDeptActive
                        ? 'bg-indigo-50/40 border-indigo-200 shadow-2xs hover:bg-indigo-50/70'
                        : 'bg-slate-50/60 border-slate-200 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-lg border flex-shrink-0 ${isDeptActive ? dept.color : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className={`text-xs font-bold truncate ${isDeptActive ? 'text-slate-900' : 'text-slate-500'}`}>
                            {dept.name}
                          </h4>
                          {isDeptActive && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">
                          {dept.desc}
                        </p>
                      </div>
                    </div>

                    {/* Department Switch */}
                    <div
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        isDeptActive ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isDeptActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Status Message Alert */}
            {statusMessage && (
              <div
                className={`p-2.5 rounded-lg text-xs font-bold flex items-center gap-2 ${
                  statusMessage.type === 'error'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{statusMessage.text}</span>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
            <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
              <Sparkles size={11} className="text-amber-500" />
              <span>Admin acts as backup for enabled desks when assigned staff are away.</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
