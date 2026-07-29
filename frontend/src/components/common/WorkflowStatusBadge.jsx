import React from 'react';
import { Clock, CheckCircle, CheckCircle2, ArrowRightCircle, ShieldAlert, FileText, Activity } from 'lucide-react';

export const WorkflowStatusBadge = ({ status }) => {
  const normalized = (status || 'PENDING').toUpperCase();

  const STATUS_MAP = {
    REQUESTED: { label: 'Pending Request', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    PENDING: { label: 'Pending', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    ACCEPTED: { label: 'Accepted (Processing...)', bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: Activity },
    PROCESSING: { label: 'In Progress', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Activity },
    IN_PROGRESS: { label: 'In Progress', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Activity },
    REPORT_UPLOADED: { label: 'Report Submitted', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: FileText },
    SUBMITTED: { label: 'Submitted', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: FileText },
    DOCTOR_REVIEW: { label: 'Under Review', bg: 'bg-amber-100 text-amber-900 border-amber-300', icon: Clock },
    REVIEWED: { label: 'Doctor Accepted', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
    COMPLETED: { label: 'Completed', bg: 'bg-emerald-600 text-white border-emerald-700', icon: CheckCircle },
    CLOSED: { label: 'Closed & Billed', bg: 'bg-slate-100 text-slate-700 border-slate-300', icon: CheckCircle },
    CANCELLED: { label: 'Cancelled', bg: 'bg-red-50 text-red-700 border-red-200', icon: ShieldAlert },
  };

  const config = STATUS_MAP[normalized] || STATUS_MAP.PENDING;
  const IconComponent = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wide border uppercase shadow-2xs ${config.bg}`}>
      <IconComponent size={11} />
      <span>{config.label}</span>
    </span>
  );
};
