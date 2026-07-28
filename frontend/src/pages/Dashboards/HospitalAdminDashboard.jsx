import React, { useState, useEffect } from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { Users, UserPlus, ShieldCheck, Stethoscope, Receipt, TestTube, CheckCircle, AlertCircle, Key, Eye, EyeOff, X } from 'lucide-react';

export const HospitalAdminDashboard = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  useScrollLock(isCreateModalOpen || isViewModalOpen || isChangeModalOpen);

  const [viewAdminPassword, setViewAdminPassword] = useState('');
  const [revealedPassword, setRevealedPassword] = useState(null);
  const [showRevealedPassword, setShowRevealedPassword] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(true);

  const [changeForm, setChangeForm] = useState({
    newPassword: '',
    adminPassword: '',
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showAdminPasswordChange, setShowAdminPasswordChange] = useState(false);

  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'DOCTOR',
    phone: '',
    specialization: '',
  });

  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await axiosClient.get('/auth/staff');
      // Strictly exclude SUPER_ADMIN accounts (Developer/Platform accounts) from Hospital Admin view
      const hospitalStaffOnly = (res.data || []).filter(
        (st) => st.role !== 'SUPER_ADMIN' && st.email !== 'superadmin@gmail.com'
      );
      setStaffList(hospitalStaffOnly);
    } catch (err) {
      console.error('Failed to load hospital staff:', err);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await axiosClient.post('/auth/staff', staffForm);
      setSuccessMsg(`New ${staffForm.role} '${staffForm.name}' created with email ${staffForm.email}!`);
      setIsCreateModalOpen(false);
      setStaffForm({
        name: '',
        email: '',
        password: '',
        role: 'DOCTOR',
        phone: '',
        specialization: '',
      });
      fetchStaff();
    } catch (err) {
      setErrorMsg(err.error?.message || err.message || 'Failed to create staff account');
    } finally {
      setIsLoading(false);
    }
  };

  // Button 1: Open View Password Modal
  const handleOpenViewModal = (staff) => {
    setSelectedStaff(staff);
    setViewAdminPassword('');
    setRevealedPassword(null);
    setShowRevealedPassword(false);
    setErrorMsg(null);
    setIsViewModalOpen(true);
  };

  const handleFetchPassword = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await axiosClient.post(`/auth/staff/${selectedStaff._id}/view-password`, {
        adminPassword: viewAdminPassword,
      });
      setRevealedPassword(res.data.assignedPassword);
    } catch (err) {
      setErrorMsg(err.error?.message || err.message || 'Invalid Admin Password verification');
    } finally {
      setIsLoading(false);
    }
  };

  // Button 2: Open Change Password Modal
  const handleOpenChangeModal = (staff) => {
    setSelectedStaff(staff);
    setChangeForm({ newPassword: '', adminPassword: '' });
    setShowNewPassword(false);
    setShowAdminPasswordChange(false);
    setErrorMsg(null);
    setIsChangeModalOpen(true);
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await axiosClient.patch(`/auth/staff/${selectedStaff._id}/password`, changeForm);
      setSuccessMsg(`Password for ${selectedStaff.name} (${selectedStaff.email}) updated successfully!`);
      setIsChangeModalOpen(false);
      setSelectedStaff(null);
      setChangeForm({ newPassword: '', adminPassword: '' });
    } catch (err) {
      setErrorMsg(err.error?.message || err.message || 'Invalid Admin Password verification');
    } finally {
      setIsLoading(false);
    }
  };

  const doctorsCount = staffList.filter((s) => s.role === 'DOCTOR').length;
  const cashiersCount = staffList.filter((s) => s.role === 'CASHIER' || s.role === 'RECEPTIONIST').length;
  const techsCount = staffList.filter((s) => s.role === 'LAB_TECH' || s.role === 'RADIOLOGIST').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Hospital Tenant Administration Workstation</h2>
          <p className="text-xs text-slate-400 mt-1">Authorized Hospital Executive Portal — Staff Provisioning & Role Privileges</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
          <UserPlus size={16} /> Create Hospital Staff Account
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Hospital Staff" value={`${staffList.length} Active`} subtitle="Doctors, Nurses, Reception" icon={Users} color="sky" />
        <StatCard title="Active Clinical Doctors" value={`${doctorsCount} Physicians`} subtitle="OPD & IPD Consultations" icon={Stethoscope} color="emerald" />
        <StatCard title="Billing & Front Desk" value={`${cashiersCount} Staff`} subtitle="Receipt Printers Sync" icon={Receipt} color="purple" />
        <StatCard title="Diagnostic Specialists" value={`${techsCount} Techs`} subtitle="Pathology & PACS RIS" icon={TestTube} color="amber" />
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {/* Staff Provisioning Table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-sky-400" />
            Provisioned Hospital Staff Accounts ({staffList.length})
          </h3>
          <span className="text-xs text-slate-400 font-mono">Hospital Internal Roster</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Staff Name</th>
                <th className="p-3">Login Email</th>
                <th className="p-3">Assigned Role</th>
                <th className="p-3">Specialization / Dept</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Credentials Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {staffList.length > 0 ? (
                staffList.map((st) => (
                  <tr key={st._id} className="hover:bg-slate-900/40">
                    <td className="p-3 font-bold text-white">{st.name}</td>
                    <td className="p-3 font-mono text-sky-400">{st.email}</td>
                    <td className="p-3 font-bold text-purple-400">{st.role}</td>
                    <td className="p-3 text-slate-400">{st.specialization || 'General'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        {st.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {/* BUTTON 1: View Current Password */}
                      <Button size="sm" variant="outline" className="font-semibold gap-1" onClick={() => handleOpenViewModal(st)}>
                        <Eye size={14} className="text-sky-400" /> View Password
                      </Button>

                      {/* BUTTON 2: Change Password */}
                      <Button size="sm" variant="outline" className="font-semibold gap-1" onClick={() => handleOpenChangeModal(st)}>
                        <Key size={14} className="text-amber-400" /> Change Password
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-500">
                    No hospital staff accounts created yet. Click 'Create Hospital Staff Account' to add your doctors, nurses, cashiers, and receptionists!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL 1: View Current Password */}
      {isViewModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full glass-panel rounded-2xl p-6 relative border border-sky-500/30">
            <button onClick={() => setIsViewModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X size={20} />
            </button>

            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="text-sky-400" size={22} />
                <div>
                  <h3 className="text-lg font-bold text-white">View Staff Password</h3>
                  <p className="text-[11px] text-slate-400">Staff: <span className="text-sky-400 font-bold">{selectedStaff.name} ({selectedStaff.email})</span></p>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
                  <AlertCircle size={16} /> {errorMsg}
                </div>
              )}

              {revealedPassword !== null ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
                    <p className="text-xs text-slate-400">Current Assigned Password:</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl font-mono font-extrabold text-emerald-400 tracking-wider">
                        {showRevealedPassword ? revealedPassword : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowRevealedPassword(!showRevealedPassword)}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        {showRevealedPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <Button variant="primary" className="w-full font-bold" onClick={() => setIsViewModalOpen(false)}>
                    Close Password View
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleFetchPassword} className="space-y-4">
                  <Input
                    label="Enter Your Hospital Admin Password to Reveal Credentials"
                    type="password"
                    value={viewAdminPassword}
                    onChange={(e) => setViewAdminPassword(e.target.value)}
                    placeholder="Enter your admin password (e.g. HospitalAdmin123!)"
                    required
                  />

                  <div className="pt-2 flex gap-2">
                    <Button type="button" variant="outline" className="w-1/2" onClick={() => setIsViewModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" className="w-1/2 font-bold" isLoading={isLoading}>
                      Reveal Password
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Change Staff Password */}
      {isChangeModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full glass-panel rounded-2xl p-6 relative border border-amber-500/30">
            <button onClick={() => setIsChangeModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X size={20} />
            </button>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4 text-xs">
              <div className="flex items-center gap-2 mb-2">
                <Key className="text-amber-400" size={22} />
                <div>
                  <h3 className="text-lg font-bold text-white">Change Staff Password</h3>
                  <p className="text-[11px] text-slate-400">Target: <span className="text-amber-400 font-bold">{selectedStaff.name} ({selectedStaff.email})</span></p>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
                  <AlertCircle size={16} /> {errorMsg}
                </div>
              )}

              {/* New Password */}
              <div className="relative">
                <Input
                  label="Enter New Password for Staff"
                  type={showNewPassword ? 'text' : 'password'}
                  value={changeForm.newPassword}
                  onChange={(e) => setChangeForm({ ...changeForm, newPassword: e.target.value })}
                  placeholder="Enter new password (e.g. 0001)"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-8 text-slate-400 hover:text-white"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Admin Verification Password */}
              <div className="relative">
                <Input
                  label="Verify Your Hospital Admin Password"
                  type={showAdminPasswordChange ? 'text' : 'password'}
                  value={changeForm.adminPassword}
                  onChange={(e) => setChangeForm({ ...changeForm, adminPassword: e.target.value })}
                  placeholder="Enter your admin password (e.g. HospitalAdmin123!)"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPasswordChange(!showAdminPasswordChange)}
                  className="absolute right-3 top-8 text-slate-400 hover:text-white"
                >
                  {showAdminPasswordChange ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="pt-2 flex gap-2">
                <Button type="button" variant="outline" className="w-1/2" onClick={() => setIsChangeModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="warning" className="w-1/2 font-bold" isLoading={isLoading}>
                  Confirm & Update Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Creating Staff */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full glass-panel rounded-2xl p-6 relative border border-sky-500/30">
            <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X size={20} />
            </button>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="text-sky-400" size={22} />
                <h3 className="text-lg font-bold text-white">Create Hospital Staff User</h3>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
                  <AlertCircle size={16} /> {errorMsg}
                </div>
              )}

              <Input
                label="Full Staff Name"
                value={staffForm.name}
                onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                placeholder="e.g. Dr. Madhu Narayan"
                required
              />

              <Input
                label="Staff Work Email (Login ID)"
                type="email"
                value={staffForm.email}
                onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                placeholder="e.g. narayanamadhu93@gmail.com"
                required
              />

              <Input
                label="Specialization / Department (Optional)"
                value={staffForm.specialization}
                onChange={(e) => setStaffForm({ ...staffForm, specialization: e.target.value })}
                placeholder="e.g. Cardiology, Pediatrics, General OPD"
              />

              <Input
                label="Phone Number (Optional)"
                value={staffForm.phone}
                onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                placeholder="e.g. +91 9876543210"
              />

              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[10px]">Assign Hospital Role</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  className="w-full glass-input rounded-lg p-2 text-white font-bold text-xs"
                >
                  <option value="DOCTOR" className="bg-slate-900">Doctor / Consultant</option>
                  <option value="RECEPTIONIST" className="bg-slate-900">Receptionist / Front Desk</option>
                  <option value="CASHIER" className="bg-slate-900">Cashier / Billing Desk</option>
                  <option value="PHARMACIST" className="bg-slate-900">Pharmacist</option>
                  <option value="LAB_TECH" className="bg-slate-900">Lab Technician</option>
                  <option value="RADIOLOGIST" className="bg-slate-900">Radiologist</option>
                  <option value="NURSE" className="bg-slate-900">Ward Nurse</option>
                  <option value="NURSE_INCHARGE" className="bg-slate-900">Nurse In-Charge</option>
                  <option value="INVENTORY_MANAGER" className="bg-slate-900">Inventory Manager</option>
                  <option value="HR_MANAGER" className="bg-slate-900">HR Manager</option>
                </select>
              </div>

              {/* Password field with Eye Toggle */}
              <div className="relative">
                <Input
                  label="Assign Initial Password"
                  type={showCreatePassword ? 'text' : 'password'}
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  placeholder="e.g. 0001"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                  className="absolute right-3 top-8 text-slate-400 hover:text-white"
                >
                  {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="pt-2 flex gap-2">
                <Button type="button" variant="outline" className="w-1/2" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="w-1/2 font-bold" isLoading={isLoading}>
                  Create Staff Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
