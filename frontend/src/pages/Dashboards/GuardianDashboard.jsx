import React from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Eye, CreditCard, Activity, DollarSign } from 'lucide-react';

export const GuardianDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Guardian Care & Billing Monitor</h2>
        <p className="text-xs text-slate-400 mt-1">Jane Doe — Guardian for Patient: John Doe (UHID: HOSP-00042)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Patient Treatment Status" value="STABLE" subtitle="Post-Op Recovery Ward 3B" icon={Activity} color="emerald" />
        <StatCard title="Total Unbilled IPD Charges" value="$1,240.00" subtitle="Room + Diagnostics" icon={CreditCard} color="sky" />
        <StatCard title="Advance Deposit Balance" value="$2,000.00" subtitle="Remaining Credit" icon={DollarSign} color="purple" />
        <StatCard title="Active Care Requests" value="0 Pending" subtitle="Nurse Attended" icon={Eye} color="amber" />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Eye size={18} className="text-sky-400" />
            Live Inpatient Progress Summary (Read-Only)
          </h3>
          <Button size="sm" variant="success">Pay Outstanding Bill Online</Button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <p className="font-bold text-white">Doctor Visit Summary (09:30 AM)</p>
            <p className="text-slate-400 mt-1">Dr. House conducted morning rounds. Patient is responding well to medication. Vitals normal.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
