import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, ShieldCheck, Users, Stethoscope, ConciergeBell, Activity,
  TestTube, Scan, Pill, CreditCard, UserCircle, BedDouble, ClipboardList,
  Calendar, IndianRupee, AlertTriangle, ShieldAlert, Clock, FileText, ScrollText,
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { axiosClient } from '../../api/axiosClient';
import { STAT_CARD_ROUTES } from '../../utils/superAdminNavigation';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const DASHBOARD_CARDS = [
  { key: 'totalHospitals', title: 'Total Hospitals', icon: Building2, color: 'sky', format: (m) => m.totalHospitals },
  { key: 'activeHospitals', title: 'Active Hospitals', icon: ShieldCheck, color: 'emerald', format: (m) => m.activeHospitals },
  { key: 'inactiveHospitals', title: 'Inactive Hospitals', icon: Building2, color: 'amber', format: (m) => m.inactiveHospitals },
  { key: 'hospitalAdmins', title: 'Total Hospital Administrators', icon: ShieldCheck, color: 'purple', format: (m) => m.hospitalAdmins },
  { key: 'doctors', title: 'Total Doctors', icon: Stethoscope, color: 'emerald', format: (m) => m.doctors },
  { key: 'receptionists', title: 'Total Receptionists', icon: ConciergeBell, color: 'blue', format: (m) => m.receptionists },
  { key: 'nurses', title: 'Total Nurses', icon: Activity, color: 'teal', format: (m) => m.nurses },
  { key: 'labStaff', title: 'Total Laboratory Staff', icon: TestTube, color: 'indigo', format: (m) => m.labStaff },
  { key: 'radiologyStaff', title: 'Total Radiology Staff', icon: Scan, color: 'purple', format: (m) => m.radiologyStaff },
  { key: 'pharmacyStaff', title: 'Total Pharmacy Staff', icon: Pill, color: 'rose', format: (m) => m.pharmacyStaff },
  { key: 'billingStaff', title: 'Total Billing Staff', icon: CreditCard, color: 'amber', format: (m) => m.billingStaff },
  { key: 'totalPatients', title: 'Total Patients', icon: UserCircle, color: 'sky', format: (m) => m.totalPatients },
  { key: 'opdPatients', title: 'Total OPD Patients', icon: ClipboardList, color: 'blue', format: (m) => m.opdPatients },
  { key: 'ipdPatients', title: 'Total IPD Patients', icon: BedDouble, color: 'indigo', format: (m) => m.ipdPatients },
  { key: 'totalStaff', title: 'Total Staff', icon: Users, color: 'purple', format: (m) => m.totalStaff },
  { key: 'todayRegistrations', title: "Today's Registrations", icon: UserCircle, color: 'emerald', format: (m) => m.todayRegistrations },
  { key: 'todayAppointments', title: "Today's Appointments", icon: Calendar, color: 'sky', format: (m) => m.todayAppointments },
  { key: 'todayConsultations', title: "Today's Consultations", icon: Stethoscope, color: 'teal', format: (m) => m.todayConsultations },
  { key: 'todayAdmissions', title: "Today's Admissions", icon: BedDouble, color: 'indigo', format: (m) => m.todayAdmissions },
  { key: 'todayDischarges', title: "Today's Discharges", icon: BedDouble, color: 'blue', format: (m) => m.todayDischarges },
  { key: 'todayRevenue', title: "Today's Revenue", icon: IndianRupee, color: 'emerald', format: (m) => formatCurrency(m.todayRevenue) },
  { key: 'pendingLabReports', title: 'Pending Laboratory Reports', icon: TestTube, color: 'amber', format: (m) => m.pendingLabReports },
  { key: 'pendingRadiologyReports', title: 'Pending Radiology Reports', icon: Scan, color: 'amber', format: (m) => m.pendingRadiologyReports },
  { key: 'pendingBilling', title: 'Pending Billing', icon: CreditCard, color: 'red', format: (m) => m.pendingBilling },
  { key: 'emergencyCases', title: 'Emergency Cases', icon: ShieldAlert, color: 'red', format: (m) => m.emergencyCases },
];

export const SuperAdminDashboardPage = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosClient.get('/saas/platform/metrics');
        setMetrics(res.data);
      } catch (err) {
        console.error('Failed to load platform metrics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const navigateTo = (key) => {
    const path = STAT_CARD_ROUTES[key];
    if (path) navigate(path);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Loading platform dashboard...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Super Admin Dashboard</h2>
        <p className="text-xs text-neutral-500 mt-1">Complete overview of the entire Hospital Billing & Management platform</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {DASHBOARD_CARDS.map(({ key, title, icon, color, format }) => (
          <StatCard
            key={key}
            title={title}
            value={metrics ? format(metrics) : '—'}
            subtitle="Click to view details"
            icon={icon}
            color={color}
            onClick={() => navigateTo(key)}
          />
        ))}
        <StatCard
          title="Recent Hospital Registrations"
          value={metrics?.recentHospitalRegistrations?.length || 0}
          subtitle="Click to manage hospitals"
          icon={Building2}
          color="sky"
          onClick={() => navigate('/admin/hospitals')}
        />
        <StatCard
          title="Recent Activities"
          value={metrics?.recentActivities?.length || 0}
          subtitle="Click to view audit trail"
          icon={Clock}
          color="purple"
          onClick={() => navigate('/admin/audit-logs')}
        />
        <StatCard
          title="System Logs"
          value="View All"
          subtitle="Platform audit & security logs"
          icon={ScrollText}
          color="indigo"
          onClick={() => navigate('/admin/audit-logs')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <Building2 size={18} className="text-neutral-600" />
            Recent Hospital Registrations
          </h3>
          <div className="space-y-2">
            {(metrics?.recentHospitalRegistrations || []).length > 0 ? (
              metrics.recentHospitalRegistrations.map((h) => (
                <button
                  key={h._id}
                  type="button"
                  onClick={() => navigate(`/admin/hospital/${h._id}/dashboard`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-100 text-left transition-colors"
                >
                  <div>
                    <p className="font-bold text-sm text-slate-800">{h.name}</p>
                    <p className="text-xs text-slate-500">{h.contactEmail} · {h.plan}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    h.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {h.status}
                  </span>
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No recent registrations</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <FileText size={18} className="text-neutral-600" />
            Recent Activities
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(metrics?.recentActivities || []).length > 0 ? (
              metrics.recentActivities.map((a) => (
                <div key={a.id} className="p-3 rounded-lg border border-slate-100 text-xs">
                  <div className="flex justify-between gap-2">
                    <p className="font-bold text-slate-800">{a.action}</p>
                    <span className="text-slate-400 shrink-0">{formatDateTime(a.timestamp)}</span>
                  </div>
                  <p className="text-slate-500 mt-0.5">{a.hospitalName} · {a.userName} ({a.module})</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No recent activity logged</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
