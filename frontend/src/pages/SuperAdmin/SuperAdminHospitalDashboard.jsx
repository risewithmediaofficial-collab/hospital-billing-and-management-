import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Stethoscope, ConciergeBell, Activity, TestTube, Scan, Pill, CreditCard,
  UserCircle, BedDouble, Users, Calendar, IndianRupee, ShieldAlert, ClipboardList,
  Eye, EyeOff, Search, Key, Edit, CheckCircle2, Lock, X, ArrowDown
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { SuperAdminHospitalContext } from '../../components/superadmin/SuperAdminModuleBridge';
import { useSuperAdminContextStore } from '../../store/superAdminContextStore';
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
  const { setSelectedHospital } = useSuperAdminContextStore();
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active Tab & Role Filter State
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'patients' | 'revenue'
  const [roleFilter, setRoleFilter] = useState('DOCTOR'); // Default to DOCTOR as requested
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState({});

  // Password Change Modal State
  const [selectedStaffForPassword, setSelectedStaffForPassword] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState('');
  const [passwordUpdateError, setPasswordUpdateError] = useState('');

  const detailsTableRef = useRef(null);

  const fetchData = async () => {
    try {
      const res = await axiosClient.get(`/saas/hospitals/${hospitalId}/detail`);
      setDetail(res.data);
      if (res.data?.hospital) {
        setSelectedHospital(hospitalId, res.data.hospital.name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hospitalId) fetchData();
  }, [hospitalId]);

  if (isLoading) return <div className="text-center py-16 text-slate-500">Loading hospital overview...</div>;
  if (!detail) return <div className="text-center py-16 text-red-500">Hospital not found</div>;

  const { hospital, stats, staffList = [], patientList = [] } = detail;

  const toggleShowPassword = (id) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Clicking ANY card box filters staff/patient table directly on this page & scrolls down smoothly
  const handleCardClick = (card) => {
    if (card.viewTab) {
      setActiveTab(card.viewTab);
    } else if (card.roleFilter) {
      setActiveTab('staff');
      setRoleFilter(card.roleFilter);
    }
    if (detailsTableRef.current) {
      detailsTableRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenPasswordModal = (staff) => {
    setSelectedStaffForPassword(staff);
    setNewPasswordInput('');
    setPasswordUpdateSuccess('');
    setPasswordUpdateError('');
  };

  const handleSavePassword = async () => {
    if (!newPasswordInput || newPasswordInput.trim().length < 4) {
      setPasswordUpdateError('Password must be at least 4 characters long');
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordUpdateError('');
    setPasswordUpdateSuccess('');

    try {
      await axiosClient.patch(`/auth/staff/${selectedStaffForPassword._id}/password`, {
        newPassword: newPasswordInput.trim()
      });

      setDetail((prev) => {
        if (!prev) return prev;
        const updatedStaffList = (prev.staffList || []).map((s) => {
          if (s._id === selectedStaffForPassword._id) {
            return { ...s, credentialHint: newPasswordInput.trim(), assignedPasswordHint: newPasswordInput.trim() };
          }
          return s;
        });
        return { ...prev, staffList: updatedStaffList };
      });

      setPasswordUpdateSuccess(`Password updated successfully for ${selectedStaffForPassword.name}`);
      setTimeout(() => {
        setSelectedStaffForPassword(null);
      }, 1200);
    } catch (err) {
      console.error(err);
      setPasswordUpdateError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
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
        staff.role?.toLowerCase().includes(term) ||
        staff.specialization?.toLowerCase().includes(term)
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

  // Header Title Generator based on Selected Role Filter
  const getTableTitle = () => {
    if (roleFilter === 'DOCTOR') return { title: `Doctor Performance & Consultation Reports (${filteredStaff.length})`, icon: Stethoscope, color: 'text-emerald-600' };
    if (roleFilter === 'RECEPTIONIST') return { title: `Receptionist Staff Credentials & Duty Reports (${filteredStaff.length})`, icon: ConciergeBell, color: 'text-blue-600' };
    if (roleFilter === 'NURSE') return { title: `Nursing Staff Credentials & Ward Reports (${filteredStaff.length})`, icon: Activity, color: 'text-teal-600' };
    if (roleFilter === 'LAB_TECH') return { title: `Laboratory Staff Credentials & Pathology Reports (${filteredStaff.length})`, icon: TestTube, color: 'text-indigo-600' };
    if (roleFilter === 'RADIOLOGIST') return { title: `Radiology Staff Credentials & RIS Reports (${filteredStaff.length})`, icon: Scan, color: 'text-purple-600' };
    if (roleFilter === 'PHARMACIST') return { title: `Pharmacy Staff Credentials & Inventory Reports (${filteredStaff.length})`, icon: Pill, color: 'text-rose-600' };
    if (roleFilter === 'CASHIER') return { title: `Billing Cashier Credentials & Invoice Reports (${filteredStaff.length})`, icon: CreditCard, color: 'text-amber-600' };
    return { title: `Hospital Staff Credentials & Access Control (${filteredStaff.length})`, icon: Users, color: 'text-indigo-600' };
  };

  const tableHeader = getTableTitle();
  const TableHeaderIcon = tableHeader.icon;

  return (
    <SuperAdminHospitalContext hospitalId={hospitalId}>
      <div className="space-y-6 animate-fade-in pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">{hospital.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {hospital.code}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Super Admin Control Console · Hospital ID: {hospital._id} · Primary Admin: <strong>{hospital.administrator?.email || hospital.contactEmail}</strong>
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

        {/* Interactive Dashboard Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users size={18} className="text-indigo-600" />
              Hospital Overview Dashboard Cards (Click any box to view staff, email & passwords below)
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {HOSPITAL_DASHBOARD_CARDS.map((card) => {
              const { key, title, icon, color, format } = card;
              return (
                <div
                  key={key}
                  onClick={() => handleCardClick(card)}
                  className="cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md group relative"
                  title={`Click to view ${title} list, email, and passwords below`}
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 text-white p-1 rounded-full text-[10px] shadow-sm">
                    <ArrowDown size={12} />
                  </div>
                  <StatCard
                    title={title}
                    value={format ? format(stats[key]) : (stats[key] ?? 0)}
                    subtitle="Click to show staff email & passwords below"
                    icon={icon}
                    color={color}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Staff Credentials Table Matching User Screenshot */}
        <div ref={detailsTableRef}>
          <Card className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('staff')}
                  className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${activeTab === 'staff' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  Staff Email, Passwords & Access ({filteredStaff.length})
                </button>
                <button
                  onClick={() => setActiveTab('patients')}
                  className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${activeTab === 'patients' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  Patient Directory ({filteredPatients.length})
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
                    placeholder="Search doctor, email, specialization..."
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
                    <option value="ALL">All Staff Roles ({staffList.length})</option>
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

            {/* Header matched to user's screenshot */}
            {activeTab === 'staff' && (
              <div className="pt-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
                  <TableHeaderIcon size={20} className={tableHeader.color} />
                  {tableHeader.title}
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">{roleFilter === 'DOCTOR' ? 'DOCTOR NAME' : 'STAFF NAME'}</th>
                        <th className="p-3">SPECIALIZATION</th>
                        <th className="p-3">LOGIN EMAIL</th>
                        <th className="p-3">ASSIGNED PASSWORD / CREDENTIAL</th>
                        <th className="p-3">OPD CABIN / WARD</th>
                        <th className="p-3">DUTY STATUS</th>
                        <th className="p-3 text-right">SUPER ADMIN ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStaff.map((staff) => {
                        const isShown = showPasswords[staff._id];
                        const pwdHint = staff.credentialHint || staff.assignedPasswordHint || `${staff.role.charAt(0) + staff.role.slice(1).toLowerCase()}123!`;

                        return (
                          <tr key={staff._id} className="hover:bg-slate-50">
                            <td className="p-3">
                              <p className="font-bold text-slate-900">{staff.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{staff.phone || 'No Phone'}</p>
                            </td>
                            <td className="p-3 font-semibold text-slate-700">
                              {staff.specialization || (staff.role === 'DOCTOR' ? 'General Physician' : staff.role)}
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-700">{staff.email}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 w-max">
                                <Key size={13} className="text-amber-500 shrink-0" />
                                <span className="font-mono font-bold text-slate-900 selection:bg-amber-100">
                                  {isShown === false ? '••••••••••••' : pwdHint}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleShowPassword(staff._id)}
                                  className="text-slate-400 hover:text-slate-700 ml-1"
                                  title="Toggle Mask"
                                >
                                  {isShown === false ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                              </div>
                            </td>
                            <td className="p-3 font-mono font-bold text-indigo-700">
                              {staff.cabinNo || 'Cabin 101'}
                            </td>
                            <td className="p-3">
                              <span className={`px-2.5 py-0.5 rounded font-bold text-[10px] ${staff.isAvailable !== false && staff.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {staff.isAvailable !== false && staff.isActive ? 'ON DUTY' : 'OFF DUTY'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[11px] font-bold bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                                onClick={() => handleOpenPasswordModal(staff)}
                              >
                                <Edit size={12} className="mr-1" /> Change Password
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {filteredStaff.length === 0 && (
                    <div className="p-8 text-center text-slate-500 text-xs">No staff members found matching criteria.</div>
                  )}
                </div>
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

        {/* Change Password Modal for Super Admin */}
        {selectedStaffForPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Lock size={20} className="text-indigo-600" />
                  <h3 className="font-bold text-slate-900">Change Staff Password</h3>
                </div>
                <button
                  onClick={() => setSelectedStaffForPassword(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <p className="text-xs text-slate-500">Updating credentials for:</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedStaffForPassword.name}</p>
                <p className="text-xs font-mono text-indigo-700">{selectedStaffForPassword.email} ({selectedStaffForPassword.role})</p>
              </div>

              {passwordUpdateError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {passwordUpdateError}
                </div>
              )}

              {passwordUpdateSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  {passwordUpdateSuccess}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">New Password</label>
                <input
                  type="text"
                  placeholder="Enter new password (e.g. Doctor123!)"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedStaffForPassword(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-indigo-600 text-white font-bold"
                  disabled={isUpdatingPassword}
                  onClick={handleSavePassword}
                >
                  {isUpdatingPassword ? 'Saving Password...' : 'Save Password'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminHospitalContext>
  );
};
