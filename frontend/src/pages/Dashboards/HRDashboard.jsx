import React, { useState, useEffect } from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { UserCheck, CalendarDays, Fingerprint, IndianRupee } from 'lucide-react';
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
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">HR Roster & Payroll Command Center</h2>
        <p className="text-xs text-slate-500 mt-1">{user?.name || 'HR Manager'} — HR & Workforce Manager Desk</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Staff On Duty Today" value={`${staff.length} Staff`} subtitle="Active Hospital Accounts" icon={UserCheck} color="emerald" />
        <StatCard title="Staff On Duty Today" value={`${staff.length} Staff`} subtitle="Active Hospital Accounts" icon={UserCheck} color="indigo" />
        <StatCard title="Biometric Sync Status" value="ONLINE" subtitle="Biometric Gateway" icon={Fingerprint} color="sky" />
        <StatCard title="Duty Roster Status" value="PUBLISHED" subtitle="Current Shift Cycle" icon={CalendarDays} color="purple" />
        <StatCard title="Monthly Payroll Status" value="READY" subtitle="Payroll Cycle" icon={IndianRupee} color="amber" />
      </div>

      <Card>
        <h3 className="text-base font-bold text-neutral-900 mb-3 flex items-center gap-2">
          <Fingerprint size={18} className="text-indigo-500" />
          Real-Time Biometric Attendance Clock-In Log
        </h3>
        <div className="space-y-2 text-xs">
          {staff.length > 0 ? (
            staff.map((st) => (
              <div key={st._id} className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900">{st.name} ({st.role})</p>
                  <p className="text-neutral-500">Email: {st.email}</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[10px]">
                  ACTIVE
                </span>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-neutral-500">No staff members registered.</div>
          )}
        </div>
      </Card>
    </div>
  );
};
