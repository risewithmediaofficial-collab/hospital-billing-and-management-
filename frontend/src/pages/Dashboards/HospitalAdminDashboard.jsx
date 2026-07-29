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
      setStaffForm({ name: '', email: '', password: '', role: 'DOCTOR', phone: '', specialization: '' });
      fetchStaff();
    } catch (err) {
      setErrorMsg(err.error?.message || err.message || 'Failed to create staff account');
    } finally {
      setIsLoading(false);
    }
  };

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
      fetchStaff();
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
          <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Hospital Tenant Administration Workstation</h2>
          <p className="text-xs text-neutral-500 mt-1">Authorized Hospital Executive Portal — Staff Provisioning & Role Privileges</p>
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
        <div className="p-3 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-700 text-xs font-bold flex items-center gap-2">
          <CheckCircle size={16} className="text-neutral-600" /> {successMsg}
        </div>
      )}

      {/* Staff Provisioning Table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
            <ShieldCheck size={18} className="text-neutral-600" />
            Provisioned Hospital Staff Accounts ({staffList.length})
          </h3>
          <span className="text-xs text-neutral-500 font-mono">Hospital Internal Roster</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100 text-neutral-600 uppercase tracking-wider text-[10px] border-b border-neutral-200">
              <tr>
                <th className="p-3">Staff Name</th>
                <th className="p-3">Login Email</th>
                <th className="p-3">Assigned Role</th>
                <th className="p-3">Specialization / Dept</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Credentials Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {staffList.length > 0 ? (
                staffList.map((st) => (
                  <tr key={st._id} className="hover:bg-neutral-50">
                    <td className="p-3 font-bold text-neutral-900">{st.name}</td>
                    <td className="p-3 font-mono text-neutral-600">{st.email}</td>
                    <td className="p-3 font-bold text-neutral-700">{st.role}</td>
                    <td className="p-3 text-neutral-500">{st.specialization || 'General'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-100 text-neutral-700 border border-neutral-300 font-bold">
                        {st.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <Button size="sm" variant="outline" className="font-semibold gap-1" onClick={() => handleOpenViewModal(st)}>
                        <Eye size={14} /> View Password
                      </Button>
                      <Button size="sm" variant="outline" className="font-semibold gap-1" onClick={() => handleOpenChangeModal(st)}>
                        <Key size={14} /> Change Password
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-neutral-500">
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
        <div className="modal-overlay animate-fade-in">
          <div className="modal-container max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-600 flex-shrink-0">
                  <Eye size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">View Staff Password</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Staff: <span className="font-bold text-neutral-700">{selectedStaff.name} ({selectedStaff.email})</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="modal-close-btn" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-center gap-2">
                  <AlertCircle size={16} /> {errorMsg}
                </div>
              )}

              {revealedPassword !== null ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-center space-y-2">
                    <p className="text-xs text-neutral-500">Current Assigned Password:</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl font-mono font-extrabold text-neutral-900 tracking-wider">
                        {showRevealedPassword ? revealedPassword : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowRevealedPassword(!showRevealedPassword)}
                        className="text-neutral-500 hover:text-neutral-900 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                        aria-label={showRevealedPassword ? 'Hide password' : 'Show password'}
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
                    placeholder="Enter your admin password"
                    required
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="w-1/2" onClick={() => setIsViewModalOpen(false)}>Cancel</Button>
                    <Button type="submit" variant="primary" className="w-1/2 font-bold" isLoading={isLoading}>Reveal Password</Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Change Staff Password */}
      {isChangeModalOpen && selectedStaff && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-container max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-600 flex-shrink-0">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Change Staff Password</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Target: <span className="font-bold text-neutral-700">{selectedStaff.name} ({selectedStaff.email})</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setIsChangeModalOpen(false)} className="modal-close-btn" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleChangePasswordSubmit} className="space-y-4 text-xs">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-center gap-2">
                    <AlertCircle size={16} /> {errorMsg}
                  </div>
                )}

                <div className="relative">
                  <Input
                    label="Enter New Password for Staff"
                    type={showNewPassword ? 'text' : 'password'}
                    value={changeForm.newPassword}
                    onChange={(e) => setChangeForm({ ...changeForm, newPassword: e.target.value })}
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-8 text-neutral-400 hover:text-neutral-900 p-0.5"
                    aria-label={showNewPassword ? 'Hide' : 'Show'}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    label="Verify Your Hospital Admin Password"
                    type={showAdminPasswordChange ? 'text' : 'password'}
                    value={changeForm.adminPassword}
                    onChange={(e) => setChangeForm({ ...changeForm, adminPassword: e.target.value })}
                    placeholder="Enter your admin password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPasswordChange(!showAdminPasswordChange)}
                    className="absolute right-3 top-8 text-neutral-400 hover:text-neutral-900 p-0.5"
                    aria-label={showAdminPasswordChange ? 'Hide' : 'Show'}
                  >
                    {showAdminPasswordChange ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" className="w-1/2" onClick={() => setIsChangeModalOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" className="w-1/2 font-bold" isLoading={isLoading}>Confirm & Update Password</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Create Staff */}
      {isCreateModalOpen && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-container max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-600 flex-shrink-0">
                  <UserPlus size={18} />
                </div>
                <h3 className="text-base font-bold text-neutral-900">Create Hospital Staff User</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="modal-close-btn" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-center gap-2">
                    <AlertCircle size={16} /> {errorMsg}
                  </div>
                )}

                <Input label="Full Staff Name" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} placeholder="e.g. Dr. Madhu Narayan" required />
                <Input label="Staff Work Email (Login ID)" type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} placeholder="e.g. narayanamadhu93@gmail.com" required />
                <Input label="Specialization / Department (Optional)" value={staffForm.specialization} onChange={(e) => setStaffForm({ ...staffForm, specialization: e.target.value })} placeholder="e.g. Cardiology, Pediatrics, General OPD" />
                <Input label="Phone Number (Optional)" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} placeholder="e.g. +91 9876543210" />

                <div>
                  <label className="block text-neutral-700 font-bold mb-1.5 uppercase tracking-wider text-[10px]">Assign Hospital Role</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                    className="w-full glass-input rounded-lg px-3.5 py-2 text-sm text-neutral-900 font-medium"
                  >
                    <option value="DOCTOR">Doctor / Consultant (OPD & IPD Clinical Practitioner)</option>
                    <option value="LAB_TECH">Lab Technician / Pathologist (CBC, Urine Analysis, Blood, Culture, Biopsy)</option>
                    <option value="RADIOLOGIST">Radiologist / PACS Specialist (CT Scan, MRI, X-Ray, USG / Ultrasound)</option>
                    <option value="RECEPTIONIST">Receptionist / Front Desk (Patient Registration & OPD Token Calling)</option>
                    <option value="CASHIER">Cashier / Billing Desk (Invoices & Thermal Payment Receipts)</option>
                    <option value="PHARMACIST">Pharmacist (FEFO E-Prescription Dispense & Stock Manager)</option>
                    <option value="NURSE">Ward Nurse (Live Bed Matrix & In-Bed Care Requests)</option>
                    <option value="NURSE_INCHARGE">Nurse In-Charge (Bed Allocations & Shift Duty Roster)</option>
                    <option value="INVENTORY_MANAGER">Inventory Manager (Central Stores & Supply Indents)</option>
                    <option value="HR_MANAGER">HR / Payroll Manager (Staff Roster & Biometric Attendance)</option>
                  </select>
                </div>

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
                    className="absolute right-3 top-8 text-neutral-400 hover:text-neutral-900 p-0.5"
                    aria-label={showCreatePassword ? 'Hide' : 'Show'}
                  >
                    {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" className="w-1/2" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" className="w-1/2 font-bold" isLoading={isLoading}>Create Staff Account</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
