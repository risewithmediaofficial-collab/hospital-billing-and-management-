import React, { useState } from 'react';
import { ShieldCheck, Clock, AlertTriangle, ArrowUpRight, Zap, Users, HardDrive } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatDate } from '../../utils/formatters';

export const SubscriptionDashboardWidget = ({ hospital, stats = {}, onOpenRenewalModal }) => {
  if (!hospital) return null;

  const trialEndDate = hospital.trialEndDate ? new Date(hospital.trialEndDate) : null;
  const now = new Date();
  const diffTime = trialEndDate ? trialEndDate - now : 0;
  const remainingDays = trialEndDate ? Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))) : 0;

  const isTrial = hospital.isTrial !== false && hospital.trialStatus !== 'SUBSCRIPTION_ACTIVE';
  const isExpired = hospital.trialStatus === 'TRIAL_EXPIRED' || hospital.status === 'EXPIRED' || remainingDays === 0;
  const isExpiringSoon = remainingDays > 0 && remainingDays <= 3;

  const planName = hospital.plan || 'PROFESSIONAL';
  const staffLimits = hospital.staffLimits || { totalStaff: 50, doctors: 15, nurses: 15 };
  const usageLimits = hospital.usageLimits || { monthlyPatients: 10000, storageInGB: 50 };

  const currentStaffCount = stats.totalStaff || stats.doctors + stats.nurses + stats.receptionists || 0;

  return (
    <Card className="space-y-4 border border-indigo-100 shadow-xs bg-gradient-to-br from-white via-indigo-50/20 to-slate-50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm">
            <Zap size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">SaaS Subscription & Capacity</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                {planName} PLAN
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Active Tenant Workspace · Hospital ID: {hospital.code}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isTrial && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                isExpired
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : isExpiringSoon
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
            >
              <Clock size={14} />
              {isExpired
                ? 'Trial Expired'
                : `Free Trial - ${remainingDays} Day${remainingDays === 1 ? '' : 's'} Remaining`}
            </span>
          )}

          <Button
            size="sm"
            onClick={onOpenRenewalModal}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm flex items-center gap-1"
          >
            {isExpired ? 'Renew Subscription' : 'Upgrade Plan'} <ArrowUpRight size={14} />
          </Button>
        </div>
      </div>

      {/* Trial Countdown Banner Alert */}
      {isTrial && isExpiringSoon && !isExpired && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <span>
              Your hospital free trial expires in <strong>{remainingDays} days</strong> on{' '}
              {trialEndDate ? formatDate(trialEndDate) : ''}. Subscribe now to maintain uninterrupted operational access.
            </span>
          </div>
          <button
            onClick={onOpenRenewalModal}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shrink-0"
          >
            Subscribe Now
          </button>
        </div>
      )}

      {/* Capacity & Meter Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-white border border-slate-200">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Staff Limit Meter</span>
          <p className="font-extrabold text-slate-900 text-sm mt-1">
            {currentStaffCount} / {staffLimits.totalStaff || 50} <span className="text-[10px] text-slate-500 font-normal">Members</span>
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, (currentStaffCount / (staffLimits.totalStaff || 50)) * 100)}%` }}
            />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Doctor Seats</span>
          <p className="font-extrabold text-emerald-700 text-sm mt-1">
            {stats.doctors || 0} / {staffLimits.doctors || 15} <span className="text-[10px] text-slate-500 font-normal">Doctors</span>
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, ((stats.doctors || 0) / (staffLimits.doctors || 15)) * 100)}%` }}
            />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Monthly Patient Cap</span>
          <p className="font-extrabold text-purple-700 text-sm mt-1">
            {stats.totalPatients || 0} / {usageLimits.monthlyPatients || 10000}
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-purple-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, ((stats.totalPatients || 0) / (usageLimits.monthlyPatients || 10000)) * 100)}%` }}
            />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Subscription Renewal</span>
          <p className="font-extrabold text-slate-900 text-sm mt-1">
            {trialEndDate ? formatDate(trialEndDate) : 'Active'}
          </p>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">
            {isTrial ? 'Trial Status: Active' : 'Auto-Renew On'}
          </p>
        </div>
      </div>
    </Card>
  );
};
