import React, { useState, useEffect } from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { UserCheck, CalendarDays, Fingerprint, DollarSign } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { axiosClient } from '../../api/axiosClient';

export const HRDashboard = () => {
  const { user } = useAuthStore();
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await axiosClient.get('/auth/staff');
      setStaff(res.data);
    } catch (err) {
      console.error('Failed to load HR staff:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">HR Roster & Payroll Command Center</h2>
        <p className="text-xs text-slate-400 mt-1">{user?.name || 'HR Manager'} — HR & Workforce Manager Desk</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Staff On Duty Today" value={`${staff.length} Staff`} subtitle="Active Hospital Accounts" icon={UserCheck} color="emerald" />
        <StatCard title="Biometric Sync Status" value="ONLINE" subtitle="Biometric Gateway" icon={Fingerprint} color="sky" />
        <StatCard title="Duty Roster Status" value="PUBLISHED" subtitle="Current Shift Cycle" icon={CalendarDays} color="purple" />
        <StatCard title="Monthly Payroll Status" value="READY" subtitle="Payroll Cycle" icon={DollarSign} color="amber" />
      </div>

      <Card>
        <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <Fingerprint size={18} className="text-sky-400" />
          Real-Time Biometric Attendance Clock-In Log
        </h3>
        <div className="space-y-2 text-xs">
          {staff.length > 0 ? (
            staff.map((st) => (
              <div key={st._id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">{st.name} ({st.role})</p>
                  <p className="text-slate-400">Email: {st.email}</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  ACTIVE
                </span>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-slate-500">No staff members registered.</div>
          )}
        </div>
      </Card>
    </div>
  );
};
