import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Stethoscope, ConciergeBell, Activity, TestTube, Scan, Pill, CreditCard,
  UserCircle, BedDouble, Users, Calendar, IndianRupee, ShieldAlert, ClipboardList,
  Eye, EyeOff, Search, Key, ShieldCheck, Lock, CheckCircle2, DollarSign, Filter
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { SuperAdminHospitalContext } from '../../components/superadmin/SuperAdminModuleBridge';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';

const HOSPITAL_DASHBOARD_CARDS = [
  { key: 'doctors', title: 'TOTAL DOCTORS', icon: Stethoscope, color: 'emerald', roleFilter: 'DOCTOR' },
  { key: 'receptionists', title: 'TOTAL RECEPTIONISTS', icon: ConciergeBell, color: 'blue', roleFilter: 'RECEPTIONIST' },
  { key: 'nurses', title: 'TOTAL NURSES', icon: Activity, color: 'teal', roleFilter: 'NURSE' },
  { key: 'labStaff', title: 'TOTAL LABORATORY STAFF', icon: TestTube, color: 'indigo', roleFilter: 'LAB_TECH' },
  { key: 'radiologyStaff', title: 'TOTAL RADIOLOGY STAFF', icon: Scan, color: 'purple', roleFilter: 'RADIOLOGIST' },
  { key: 'pharmacyStaff', title: 'TOTAL PHARMACY STAFF', icon: Pill, color: 'rose', roleFilter: 'PHARMACIST' },
  { key: 'billingStaff', title: 'TOTAL BILLING STAFF', icon: CreditCard, color: 'amber', roleFilter: 'CASHIER' },
  { key: 'totalPatients', title: 'TOTAL PATIENTS', icon: UserCircle, color: 'sky', viewTab: 'patients' },
  { key: 'opdPatients', title: 'TOTAL OPD PATIENTS', icon: ClipboardList, color: 'blue', viewTab: 'patients' },
  { key: 'ipdPatients', title: 'TOTAL IPD PATIENTS', icon: BedDouble, color: 'indigo', viewTab: 'patients' },
  { key: 'activeStaff', title: 'ACTIVE STAFF', icon: Users, color: 'emerald', roleFilter: 'ALL_ACTIVE' },
  { key: 'inactiveStaff', title: 'INACTIVE STAFF', icon: Users, color: 'amber', roleFilter: 'ALL_INACTIVE' },
];

export const SuperAdminHospitalDashboard = () => {
  const { hospitalId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & tab controls for Staff / Patients / Revenue Tables
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'patients' | 'revenue'
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState({});

  const fetchData = async () => {
    try {
      const res = await axiosClient.get(`/saas/hospitals/${hospitalId}/detail`);
      setDetail(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hospitalId) fetchData();
  }, [hospitalId]);

  if (isLoading) return <div className="text-center py-16 text-slate-500">Loading hospital dashboard...</div>;
  if (!detail) return <div className="text-center py-16 text-red-500">Hospital not found</div>;

  const { hospital, stats, staffList = [], patientList = [] } = detail;

  const toggleShowPassword = (id) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredStaff = staffList.filter((staff) => {
    if (roleFilter === 'ALL_ACTIVE' && !staff.isActive) return false;
    if (roleFilter === 'ALL_INACTIVE' && staff.isActive) return false;
    if (roleFilter !== 'ALL' && roleFilter !== 'ALL_ACTIVE' && roleFilter !== 'ALL_INACTIVE' && staff.role !== roleFilter) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        staff.name?.toLowerCase().includes(term) ||
        staff.email?.toLowerCase().includes(term) ||
        staff.role?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const filteredPatients = patientList.filter((patient) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        patient.firstName?.toLowerCase().includes(term) ||
        patient.lastName?.toLowerCase().includes(term) ||
        patient.uhid?.toLowerCase().includes(term) ||
        patient.phone?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const totalRevenue = stats.totalHospitalRevenue || hospital.totalHospitalRevenue || 0;

  return (
    <SuperAdminHospitalContext hospitalId={hospitalId}>
      <div className="space-y-6 animate-fade-in pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">{hospital.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {hospital.code}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Super Admin Console · Hospital ID: {hospital._id} · Primary Admin: <strong>{hospital.administrator?.email || hospital.contactEmail}</strong>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/hospitals')}>
            Back to All Hospitals
          </Button>
        </div>

        {/* Overview Info Cards */}
        <Card>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
            <div><p className="text-slate-400 font-bold uppercase text-[10px]">Registration Date</p><p className="font-semibold text-slate-900 mt-1">{formatDate(hospital.registrationDate)}</p></div>
            <div><p className="text-slate-400 font-bold uppercase text-[10px]">Plan & Subscription</p><p className="font-semibold text-slate-900 mt-1">{hospital.subscriptionPlan || hospital.plan}</p></div>
            <div><p className="text-slate-400 font-bold uppercase text-[10px]">Hospital Status</p><p className="font-semibold text-emerald-700 mt-1">{hospital.status}</p></div>
            <div><p className="text-slate-400 font-bold uppercase text-[10px]">Total Staff Created</p><p className="font-bold text-indigo-600 mt-1">{staffList.length} Members</p></div>
            <div><p className="text-slate-400 font-bold uppercase text-[10px]">Total All-Time Revenue</p><p className="font-extrabold text-emerald-600 mt-1 font-mono">{formatCurrency(totalRevenue)}</p></div>
          </div>
        </Card>

        {/* Stat Cards Grid (Clickable Filters) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {HOSPITAL_DASHBOARD_CARDS.map(({ key, title, icon, color, roleFilter: cardRoleFilter, viewTab }) => (
            <div
              key={key}
              onClick={() => {
                if (viewTab) {
                  setActiveTab(viewTab);
                } else if (cardRoleFilter) {
                  setActiveTab('staff');
                  setRoleFilter(cardRoleFilter);
                }
              }}
              className="cursor-pointer transition-transform hover:scale-[1.02]"
            >
              <StatCard
                title={title}
                value={stats[key] ?? 0}
                subtitle="Click to view details & credentials"
                icon={icon}
                color={color}
              />
            </div>
          ))}
        </div>

        {/* Main Content Tabs & Filter Section */}
        <Card className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('staff')}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${activeTab === 'staff' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Staff Credentials & Access ({staffList.length})
              </button>
              <button
                onClick={() => setActiveTab('patients')}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${activeTab === 'patients' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Patient Directory ({patientList.length})
              </button>
              <button
                onClick={() => setActiveTab('revenue')}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${activeTab === 'revenue' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Revenue & Performance Ledger
              </button>
            </div>

            {/* Search & Role Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff, email, UHID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border rounded-lg text-xs w-56 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {activeTab === 'staff' && (
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-1.5 border rounded-lg text-xs bg-white font-semibold text-slate-700"
                >
                  <option value="ALL">All Roles ({staffList.length})</option>
                  <option value="DOCTOR">Doctors ({staffList.filter(s => s.role === 'DOCTOR').length})</option>
                  <option value="NURSE">Nurses ({staffList.filter(s => s.role === 'NURSE' || s.role === 'NURSE_INCHARGE').length})</option>
                  <option value="RECEPTIONIST">Receptionists ({staffList.filter(s => s.role === 'RECEPTIONIST').length})</option>
                  <option value="LAB_TECH">Lab Techs ({staffList.filter(s => s.role === 'LAB_TECH' || s.role === 'LABORATORY_STAFF').length})</option>
                  <option value="RADIOLOGIST">Radiologists ({staffList.filter(s => s.role === 'RADIOLOGIST' || s.role === 'RADIOLOGY_STAFF').length})</option>
                  <option value="PHARMACIST">Pharmacists ({staffList.filter(s => s.role === 'PHARMACIST' || s.role === 'PHARMACY_STAFF').length})</option>
                  <option value="CASHIER">Billing Cashiers ({staffList.filter(s => s.role === 'CASHIER' || s.role === 'BILLING_STAFF').length})</option>
                  <option value="HOSPITAL_ADMIN">Hospital Admins ({staffList.filter(s => s.role === 'HOSPITAL_ADMIN').length})</option>
                  <option value="ALL_ACTIVE">Active Staff Only</option>
                  <option value="ALL_INACTIVE">Inactive Staff Only</option>
                </select>
              )}
            </div>
          </div>

          {/* TAB 1: STAFF CREDENTIALS & ACCESS DETAILS TABLE */}
          {activeTab === 'staff' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Staff Name</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Login Email / Username</th>
                    <th className="p-3">Assigned Credentials / Password</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Patients Handled</th>
                    <th className="p-3">Revenue Generated</th>
                    <th className="p-3">Last Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.map((staff) => {
                    const isShown = showPasswords[staff._id];
                    return (
                      <tr key={staff._id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{staff.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{staff.phone || 'No Phone'}</p>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {staff.role}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700">{staff.email}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded border border-slate-200 w-max">
                            <Key size={13} className="text-amber-500 shrink-0" />
                            <span className="font-mono font-bold text-slate-900">
                              {isShown ? staff.credentialHint : '••••••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleShowPassword(staff._id)}
                              className="text-slate-400 hover:text-slate-700"
                              title="Toggle Password Visibility"
                            >
                              {isShown ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${staff.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                            {staff.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-indigo-700">{staff.patientsHandled || 0} Patients</td>
                        <td className="p-3 font-bold text-emerald-700">{formatCurrency(staff.revenueGenerated || 0)}</td>
                        <td className="p-3 text-slate-500 font-mono">{staff.lastLoginAt ? formatDateTime(staff.lastLoginAt) : 'Never'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredStaff.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">No staff members found matching criteria.</div>
              )}
            </div>
          )}

          {/* TAB 2: PATIENTS DIRECTORY */}
          {activeTab === 'patients' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Patient Name</th>
                    <th className="p-3">UHID</th>
                    <th className="p-3">Contact Phone</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Gender & Age</th>
                    <th className="p-3">Registration Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map((pat) => (
                    <tr key={pat._id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{pat.firstName} {pat.lastName}</td>
                      <td className="p-3 font-mono font-bold text-indigo-700">{pat.uhid}</td>
                      <td className="p-3 text-slate-700">{pat.phone}</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">{pat.category || 'GENERAL'}</span></td>
                      <td className="p-3 text-slate-600">{pat.gender || 'M'} • {pat.age ? `${pat.age} Yrs` : 'Adult'}</td>
                      <td className="p-3 text-slate-500 font-mono">{formatDate(pat.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredPatients.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">No patients found.</div>
              )}
            </div>
          )}

          {/* TAB 3: REVENUE & PERFORMANCE LEDGER */}
          {activeTab === 'revenue' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-emerald-50/50 border-emerald-200">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Total Hospital All-Time Revenue</span>
                  <p className="text-2xl font-black text-emerald-700 font-mono mt-1">{formatCurrency(totalRevenue)}</p>
                </Card>
                <Card className="bg-indigo-50/50 border-indigo-200">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Today's Collected Revenue</span>
                  <p className="text-2xl font-black text-indigo-700 font-mono mt-1">{formatCurrency(stats.todayRevenue || 0)}</p>
                </Card>
                <Card className="bg-purple-50/50 border-purple-200">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Active Staff Contributors</span>
                  <p className="text-2xl font-black text-purple-700 mt-1">{staffList.filter(s => (s.revenueGenerated || 0) > 0).length} Members</p>
                </Card>
              </div>

              <h4 className="font-bold text-slate-900 pt-2">Staff Revenue Breakdown</h4>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Staff Name</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Patients Handled</th>
                    <th className="p-3">Total Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffList.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{s.name} ({s.email})</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{s.role}</span></td>
                      <td className="p-3 font-bold text-indigo-700">{s.patientsHandled || 0} Patients</td>
                      <td className="p-3 font-bold text-emerald-700">{formatCurrency(s.revenueGenerated || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </SuperAdminHospitalContext>
  );
};
