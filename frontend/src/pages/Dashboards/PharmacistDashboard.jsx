import React from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Pill, Boxes, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const PharmacistDashboard = () => {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Pharmacy POS & FEFO Stock Workstation</h2>
        <p className="text-xs text-slate-500 mt-1">{user?.name || 'Pharmacist'} — Central Pharmacy Workstation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Prescriptions Pending" value="0 Orders" subtitle="Auto E-Prescription Queue" icon={Pill} color="sky" />
        <StatCard title="Today's Dispensed Items" value="0 Meds" subtitle="FEFO Compliant" icon={CheckCircle2} color="emerald" />
        <StatCard title="Near-Expiry Stock Alerts" value="0 Batches" subtitle="Expiring within 30 days" icon={AlertTriangle} color="amber" />
        <StatCard title="Total Medicine SKUs" value="0 SKUs" subtitle="In-Stock Store" icon={Boxes} color="purple" />
      </div>

      <Card>
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Pill size={18} className="text-indigo-500" />
            Pending E-Prescription Dispense Queue
          </span>
          <span className="text-xs text-slate-500 font-mono">FEFO Auto Batch Selection Active</span>
        </h3>

        <div className="p-8 text-center text-slate-500 text-sm">
          No pending e-prescriptions. When doctors finalize prescriptions, they will appear here!
        </div>
      </Card>
    </div>
  );
};
