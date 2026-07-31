import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Stethoscope, ConciergeBell, Activity, TestTube, Scan, Pill, CreditCard,
  UserCircle, BedDouble, Users, Calendar, IndianRupee, ShieldAlert, ClipboardList,
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { SuperAdminHospitalContext } from '../../components/superadmin/SuperAdminModuleBridge';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';

const HOSPITAL_DASHBOARD_CARDS = [
  { key: 'doctors', title: 'Total Doctors', icon: Stethoscope, color: 'emerald' },
  { key: 'receptionists', title: 'Total Receptionists', icon: ConciergeBell, color: 'blue' },
  { key: 'nurses', title: 'Total Nurses', icon: Activity, color: 'teal' },
  { key: 'labStaff', title: 'Total Laboratory Staff', icon: TestTube, color: 'indigo' },
  { key: 'radiologyStaff', title: 'Total Radiology Staff', icon: Scan, color: 'purple' },
  { key: 'pharmacyStaff', title: 'Total Pharmacy Staff', icon: Pill, color: 'rose' },
  { key: 'billingStaff', title: 'Total Billing Staff', icon: CreditCard, color: 'amber' },
  { key: 'totalPatients', title: 'Total Patients', icon: UserCircle, color: 'sky' },
  { key: 'opdPatients', title: 'Total OPD Patients', icon: ClipboardList, color: 'blue' },
  { key: 'ipdPatients', title: 'Total IPD Patients', icon: BedDouble, color: 'indigo' },
  { key: 'activeStaff', title: 'Active Staff', icon: Users, color: 'emerald', route: 'staff' },
  { key: 'inactiveStaff', title: 'Inactive Staff', icon: Users, color: 'amber', route: 'staff' },
  { key: 'todayAppointments', title: "Today's Appointments", icon: Calendar, color: 'sky', route: 'appointments' },
  { key: 'todayConsultations', title: "Today's Consultations", icon: Stethoscope, color: 'teal', route: 'doctors' },
  { key: 'todayAdmissions', title: "Today's Admissions", icon: BedDouble, color: 'indigo', route: 'ipd' },
  { key: 'todayDischarges', title: "Today's Discharges", icon: BedDouble, color: 'blue', route: 'ipd' },
  { key: 'todayBills', title: "Today's Bills", icon: CreditCard, color: 'purple', route: 'billing' },
  { key: 'todayRevenue', title: "Today's Revenue", icon: IndianRupee, color: 'emerald', route: 'billing', format: (v) => formatCurrency(v) },
  { key: 'pendingLabReports', title: 'Pending Laboratory Reports', icon: TestTube, color: 'amber', route: 'laboratory' },
  { key: 'pendingRadiologyReports', title: 'Pending Radiology Reports', icon: Scan, color: 'amber', route: 'radiology' },
  { key: 'pendingBilling', title: 'Pending Billing', icon: CreditCard, color: 'red', route: 'billing' },
  { key: 'emergencyCases', title: 'Emergency Cases', icon: ShieldAlert, color: 'red', route: 'emergency' },
];

export const SuperAdminHospitalDashboard = () => {
  const { hospitalId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosClient.get(`/saas/hospitals/${hospitalId}/detail`);
        setDetail(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    if (hospitalId) load();
  }, [hospitalId]);

  if (isLoading) return <div className="text-center py-16 text-slate-500">Loading hospital dashboard...</div>;
  if (!detail) return <div className="text-center py-16 text-red-500">Hospital not found</div>;

  const { hospital, stats } = detail;

  return (
    <SuperAdminHospitalContext hospitalId={hospitalId}>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">{hospital.name}</h2>
            <p className="text-xs text-neutral-500 mt-1">
              Hospital ID: {hospital._id} · {hospital.code} · Admin: {hospital.administrator?.email || hospital.contactEmail}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/hospitals')}>
            Back to All Hospitals
          </Button>
        </div>

        <Card>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div><p className="text-slate-400 font-bold uppercase text-[10px]">Registration</p><p className="font-semibold mt-1">{formatDate(hospital.registrationDate)}</p></div>
            <div><p className="text-slate-400 font-bold uppercase text-[10px]">Subscription</p><p className="font-semibold mt-1">{hospital.subscriptionPlan || hospital.plan}</p></div>
            <div><p className="text-slate-400 font-bold uppercase text-[10px]">Status</p><p className="font-semibold mt-1">{hospital.status}</p></div>
            <div><p className="text-slate-400 font-bold uppercase text-[10px]">Last Login</p><p className="font-semibold mt-1">{formatDateTime(hospital.lastLogin)}</p></div>
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-slate-900 mb-3">Platform access configuration</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div><p className="text-slate-400 uppercase font-bold text-[10px]">Enabled modules</p><p className="mt-1 text-slate-700">{Object.entries(hospital.enabledModules || {}).filter(([, enabled]) => enabled).map(([key]) => key).join(', ') || 'No modules enabled'}</p></div>
            <div><p className="text-slate-400 uppercase font-bold text-[10px]">Staff limits</p><p className="mt-1 text-slate-700">{Object.entries(hospital.staffLimits || {}).map(([key, value]) => `${key}: ${value}`).join(' · ') || 'Not configured'}</p></div>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {HOSPITAL_DASHBOARD_CARDS.map(({ key, title, icon, color, format }) => (
            <StatCard
              key={key}
              title={title}
              value={format ? format(stats[key]) : (stats[key] ?? 0)}
              subtitle="Read-only platform overview"
              icon={icon}
              color={color}
            />
          ))}
        </div>
      </div>
    </SuperAdminHospitalContext>
  );
};
