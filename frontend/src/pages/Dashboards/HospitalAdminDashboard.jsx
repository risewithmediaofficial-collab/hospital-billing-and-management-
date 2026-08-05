import React, { useState, useEffect } from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useSocket } from '../../providers/SocketProvider';
import { ROLES, ROLE_NAMES, DEPARTMENTS, MODULE_ACTION_MATRIX } from '../../utils/constants';
import { Users, UserPlus, ShieldCheck, Stethoscope, Receipt, TestTube, CheckCircle, AlertCircle, Key, Eye, EyeOff, X, Edit, Copy, RotateCcw, CheckSquare, Square, SlidersHorizontal, UserCog } from 'lucide-react';
import { SubscriptionDashboardWidget } from '../../components/subscription/SubscriptionDashboardWidget';
import { SubscriptionRenewalModal } from '../../components/subscription/SubscriptionRenewalModal';

const ROLE_OPTIONS = [
  { code: 'DOCTOR', label: 'Doctor / Consultant' },
  { code: 'NURSE', label: 'Nurse / Ward Staff' },
  { code: 'NURSE_INCHARGE', label: 'Nurse In-Charge' },
  { code: 'RECEPTIONIST', label: 'Receptionist / Front Desk' },
  { code: 'CASHIER', label: 'Billing Cashier' },
  { code: 'BILLING_STAFF', label: 'Billing Staff' },
  { code: 'LAB_TECH', label: 'Lab Technician / Pathologist' },
  { code: 'LABORATORY_STAFF', label: 'Laboratory Staff' },
  { code: 'RADIOLOGIST', label: 'Radiologist' },
  { code: 'RADIOLOGY_STAFF', label: 'Radiology Staff' },
  { code: 'PHARMACIST', label: 'Pharmacist' },
  { code: 'PHARMACY_STAFF', label: 'Pharmacy Staff' },
  { code: 'OPD_STAFF', label: 'OPD Staff' },
  { code: 'IPD_STAFF', label: 'IPD Staff' },
  { code: 'EMERGENCY_STAFF', label: 'Emergency Response Staff' },
  { code: 'DEPARTMENT_MANAGER', label: 'Department Manager' },
  { code: 'SUPPORT_STAFF', label: 'Support Staff' },
  { code: 'CUSTOM_ROLE', label: 'Custom Role' },
];

const DEFAULT_ROLE_PERMISSIONS = {
  DOCTOR: {
    dashboard: ['view'],
    doctorConsultation: ['view', 'startConsultation', 'diagnose', 'prescribe', 'requestLab', 'requestRadiology', 'addTreatment', 'finalize', 'viewCompletedVisits'],
    patients: ['view'],
    tokens: ['view'],
    diagnosis: ['view', 'create', 'edit'],
    prescription: ['view', 'create', 'edit'],
    treatment: ['view', 'create', 'edit'],
    laboratory: ['view', 'requestTest'],
    radiology: ['view', 'requestTest'],
    notifications: ['view'],
  },
  NURSE: {
    dashboard: ['view'],
    nursing: ['view', 'viewInstructions', 'viewTreatment', 'viewMedicineSchedule', 'updateVitals', 'addNotes', 'administerInjection', 'manageTasks', 'handleRequests', 'respondEmergency'],
    patients: ['view'],
    notifications: ['view'],
  },
  NURSE_INCHARGE: {
    dashboard: ['view'],
    nursing: ['view', 'viewInstructions', 'viewTreatment', 'viewMedicineSchedule', 'updateVitals', 'addNotes', 'administerInjection', 'manageTasks', 'handleRequests', 'respondEmergency', 'manageWardAssignments'],
    ipd: ['view', 'manage'],
    notifications: ['view'],
  },
  RECEPTIONIST: {
    dashboard: ['view'],
    patientRegistration: ['view', 'create', 'edit'],
    patients: ['view', 'create', 'edit'],
    tokens: ['view', 'create', 'edit', 'cancel', 'assign', 'moveQueue', 'print', 'markCompleted'],
    appointments: ['view', 'create', 'edit', 'cancel', 'book', 'doctorAvailability'],
    notifications: ['view'],
  },
  CASHIER: {
    dashboard: ['view'],
    billing: ['view', 'create', 'addCharges', 'editCharges', 'receivePayment', 'generateInvoice', 'printReceipt'],
    notifications: ['view'],
  },
  BILLING_STAFF: {
    dashboard: ['view'],
    billing: ['view', 'create', 'addCharges', 'editCharges', 'receivePayment', 'generateInvoice', 'printReceipt'],
    notifications: ['view'],
  },
  LAB_TECH: {
    dashboard: ['view'],
    laboratory: ['view', 'accept', 'edit', 'upload', 'print'],
    notifications: ['view'],
  },
  LABORATORY_STAFF: {
    dashboard: ['view'],
    laboratory: ['view', 'accept', 'edit', 'upload', 'print'],
    notifications: ['view'],
  },
  RADIOLOGIST: {
    dashboard: ['view'],
    radiology: ['view', 'accept', 'edit', 'upload', 'print'],
    notifications: ['view'],
  },
  RADIOLOGY_STAFF: {
    dashboard: ['view'],
    radiology: ['view', 'accept', 'edit', 'upload', 'print'],
    notifications: ['view'],
  },
  PHARMACIST: {
    dashboard: ['view'],
    pharmacy: ['view', 'create', 'edit', 'dispense', 'print'],
    notifications: ['view'],
  },
  PHARMACY_STAFF: {
    dashboard: ['view'],
    pharmacy: ['view', 'create', 'edit', 'dispense', 'print'],
    notifications: ['view'],
  },
  OPD_STAFF: {
    dashboard: ['view'],
    opd: ['view', 'manage'],
    tokens: ['view', 'create', 'edit'],
    notifications: ['view'],
  },
  IPD_STAFF: {
    dashboard: ['view'],
    ipd: ['view', 'manage'],
    nursing: ['view', 'updateVitals'],
    notifications: ['view'],
  },
  EMERGENCY_STAFF: {
    dashboard: ['view'],
    emergency: ['view', 'create', 'respond', 'resolve'],
    notifications: ['view'],
  },
  DEPARTMENT_MANAGER: {
    dashboard: ['view'],
    departments: ['view', 'manage'],
    reports: ['view', 'generate'],
    notifications: ['view'],
  },
  SUPPORT_STAFF: {
    dashboard: ['view'],
    notifications: ['view'],
  },
  CUSTOM_ROLE: {
    dashboard: ['view'],
  },
};

const computeCombinedRoleDefaults = (primaryRole, additionalRoles = []) => {
  const roles = [primaryRole, ...additionalRoles].filter(Boolean);
  const combined = {};

  roles.forEach((r) => {
    const defaults = DEFAULT_ROLE_PERMISSIONS[r] || {};
    Object.entries(defaults).forEach(([mod, actions]) => {
      if (!combined[mod]) combined[mod] = [];
      actions.forEach((act) => {
        if (!combined[mod].includes(act)) {
          combined[mod].push(act);
        }
      });
    });
  });

  return combined;
};

export const HospitalAdminDashboard = () => {
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  const [activeFormTab, setActiveFormTab] = useState('DETAILS'); // 'DETAILS' | 'PERMISSIONS'

  useScrollLock(isStaffModalOpen || isViewModalOpen || isChangeModalOpen);

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

  const initialStaffForm = {
    id: null,
    name: '',
    email: '',
    phone: '',
    password: '',
    employeeId: '',
    designation: '',
    shiftDetails: 'MORNING (08:00 AM - 04:00 PM)',
    assignedUnit: 'General OPD',
    specialization: '',
    role: 'DOCTOR',
    additionalRoles: [],
    departmentId: 'General Medicine',
    additionalDepartments: [],
    status: 'ACTIVE',
    permissions: computeCombinedRoleDefaults('DOCTOR', []),
    revokedPermissions: {},
  };

  const [staffForm, setStaffForm] = useState(initialStaffForm);
  const [copyFromStaffId, setCopyFromStaffId] = useState('');

  const { socket } = useSocket();
  const [staffList, setStaffList] = useState([]);
  const [hospitalData, setHospitalData] = useState(null);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    fetchStaff();
    fetchHospitalInfo();
  }, []);

  const fetchHospitalInfo = async () => {
    try {
      const meRes = await axiosClient.get('/auth/me');
      if (meRes.data?.data?.hospitalId) {
        const hId = meRes.data.data.hospitalId._id || meRes.data.data.hospitalId;
        const hospRes = await axiosClient.get(`/saas/hospitals/${hId}/detail`).catch(() => null);
        if (hospRes?.data?.hospital) {
          setHospitalData(hospRes.data.hospital);
        }
      }
    } catch (err) {
      console.error('Failed to load hospital subscription detail:', err);
    }
  };

  useEffect(() => {
    if (!socket) return;
    const handleDoctorAvailability = (data) => {
      setStaffList((prev) =>
        prev.map((s) =>
          String(s._id) === String(data.id || data._id)
            ? { ...s, isAvailable: data.isAvailable !== undefined ? data.isAvailable : s.isAvailable, cabinNo: data.cabinNo || s.cabinNo }
            : s
        )
      );
    };
    socket.on('doctor:availability_changed', handleDoctorAvailability);
    return () => {
      socket.off('doctor:availability_changed', handleDoctorAvailability);
    };
  }, [socket]);

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

  const handleOpenCreateModal = () => {
    setStaffForm(initialStaffForm);
    setActiveFormTab('DETAILS');
    setErrorMsg(null);
    setIsStaffModalOpen(true);
  };

  const handleOpenEditModal = (staff) => {
    setSelectedStaff(staff);
    const primRole = staff.role || 'DOCTOR';
    const addRoles = Array.isArray(staff.additionalRoles) ? staff.additionalRoles : [];
    
    let currentPerms = staff.permissions || {};
    if (Object.keys(currentPerms).length === 0) {
      currentPerms = computeCombinedRoleDefaults(primRole, addRoles);
    }

    setStaffForm({
      id: staff._id,
      name: staff.name || '',
      email: staff.email || '',
      phone: staff.phone || '',
      password: '',
      employeeId: staff.employeeId || '',
      designation: staff.designation || '',
      shiftDetails: staff.shiftDetails || 'MORNING (08:00 AM - 04:00 PM)',
      assignedUnit: staff.assignedUnit || '',
      specialization: staff.specialization || '',
      role: primRole,
      additionalRoles: addRoles,
      departmentId: staff.departmentId || 'General Medicine',
      additionalDepartments: Array.isArray(staff.additionalDepartments) ? staff.additionalDepartments : [],
      status: staff.status || (staff.isActive ? 'ACTIVE' : 'INACTIVE'),
      permissions: currentPerms,
      revokedPermissions: staff.revokedPermissions || {},
    });

    setActiveFormTab('DETAILS');
    setErrorMsg(null);
    setIsStaffModalOpen(true);
  };

  const handleRoleChange = (newPrimaryRole) => {
    setStaffForm((prev) => {
      const defaults = computeCombinedRoleDefaults(newPrimaryRole, prev.additionalRoles);
      return {
        ...prev,
        role: newPrimaryRole,
        permissions: defaults,
      };
    });
  };

  const handleAdditionalRoleToggle = (roleCode) => {
    setStaffForm((prev) => {
      const isSelected = prev.additionalRoles.includes(roleCode);
      const nextAdditional = isSelected
        ? prev.additionalRoles.filter((r) => r !== roleCode)
        : [...prev.additionalRoles, roleCode];
      const defaults = computeCombinedRoleDefaults(prev.role, nextAdditional);
      return {
        ...prev,
        additionalRoles: nextAdditional,
        permissions: defaults,
      };
    });
  };


  const handleActionToggle = (moduleKey, actionKey) => {
    setStaffForm((prev) => {
      const currentModActions = prev.permissions[moduleKey] || [];
      const isEnabled = currentModActions.includes(actionKey);
      const nextActions = isEnabled
        ? currentModActions.filter((a) => a !== actionKey)
        : [...currentModActions, actionKey];

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [moduleKey]: nextActions,
        },
      };
    });
  };

  const handleSelectAllModuleActions = (moduleKey) => {
    const modConfig = MODULE_ACTION_MATRIX[moduleKey];
    if (!modConfig) return;
    const allActions = Object.keys(modConfig.actions);
    setStaffForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleKey]: allActions,
      },
    }));
  };

  const handleClearModuleActions = (moduleKey) => {
    setStaffForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleKey]: [],
      },
    }));
  };

  const handleSelectAllPermissions = () => {
    const allPerms = {};
    Object.entries(MODULE_ACTION_MATRIX).forEach(([modKey, modConfig]) => {
      allPerms[modKey] = Object.keys(modConfig.actions);
    });
    setStaffForm((prev) => ({ ...prev, permissions: allPerms }));
  };

  const handleClearAllPermissions = () => {
    setStaffForm((prev) => ({ ...prev, permissions: {} }));
  };

  const handleResetToRoleDefaults = () => {
    const defaults = computeCombinedRoleDefaults(staffForm.role, staffForm.additionalRoles);
    setStaffForm((prev) => ({ ...prev, permissions: defaults }));
  };

  const handleCopyPermissionsFromStaff = (sourceStaffId) => {
    if (!sourceStaffId) return;
    const sourceStaff = staffList.find((s) => s._id === sourceStaffId);
    if (!sourceStaff) return;
    const copiedPerms = sourceStaff.permissions || computeCombinedRoleDefaults(sourceStaff.role, sourceStaff.additionalRoles);
    setStaffForm((prev) => ({
      ...prev,
      permissions: { ...copiedPerms },
      revokedPermissions: { ...(sourceStaff.revokedPermissions || {}) },
    }));
  };

  const handleSaveStaffForm = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!staffForm.name || !staffForm.name.trim()) {
      setErrorMsg('Full Name is required to create a staff account.');
      return;
    }
    if (!staffForm.email || !staffForm.email.trim()) {
      setErrorMsg('Email Address is required to create a staff account.');
      return;
    }
    if (!staffForm.id && (!staffForm.password || !staffForm.password.trim())) {
      setErrorMsg('Password is required for creating a new staff account.');
      return;
    }

    setIsLoading(true);
    try {
      if (staffForm.id) {
        // Edit existing staff
        await axiosClient.patch(`/auth/staff/${staffForm.id}`, staffForm);
        setSuccessMsg(`Staff account configuration for '${staffForm.name}' updated successfully!`);
      } else {
        // Create new staff
        await axiosClient.post('/auth/staff', staffForm);
        setSuccessMsg(`New staff account '${staffForm.name}' created with email ${staffForm.email}!`);
      }
      setIsStaffModalOpen(false);
      fetchStaff();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.error?.message || err.message || 'Failed to save staff access configuration');
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

  const doctorsCount = staffList.filter((s) => s.role === 'DOCTOR' || (s.additionalRoles && s.additionalRoles.includes('DOCTOR'))).length;
  const nursingCount = staffList.filter((s) => s.role === 'NURSE' || s.role === 'NURSE_INCHARGE' || (s.additionalRoles && (s.additionalRoles.includes('NURSE') || s.additionalRoles.includes('NURSE_INCHARGE')))).length;
  const cashiersCount = staffList.filter((s) => ['CASHIER', 'BILLING_STAFF', 'RECEPTIONIST'].includes(s.role) || (s.additionalRoles && s.additionalRoles.some((r) => ['CASHIER', 'BILLING_STAFF', 'RECEPTIONIST'].includes(r)))).length;
  const techsCount = staffList.filter((s) => ['LAB_TECH', 'LABORATORY_STAFF', 'RADIOLOGIST', 'RADIOLOGY_STAFF'].includes(s.role) || (s.additionalRoles && s.additionalRoles.some((r) => ['LAB_TECH', 'LABORATORY_STAFF', 'RADIOLOGIST', 'RADIOLOGY_STAFF'].includes(r)))).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <UserCog className="text-indigo-600" size={26} />
            Flexible Staff Roles & Module Permissions Workbench
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Configure Multi-Role Assignments, Department Allocations & Fine-Grained Module Action Privileges
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenCreateModal} className="w-full sm:w-auto text-xs shrink-0 whitespace-normal text-center sm:text-left py-2.5 sm:py-2">
          <UserPlus size={16} className="shrink-0" />
          <span className="sm:hidden">Create Staff Account</span>
          <span className="hidden sm:inline">Create Staff Account & Access Configuration</span>
        </Button>
      </div>

      {/* SaaS Subscription & 7-Day Trial Dashboard Widget */}
      {hospitalData && (
        <SubscriptionDashboardWidget
          hospital={hospitalData}
          stats={{ totalStaff: staffList.length, doctors: doctorsCount }}
          onOpenRenewalModal={() => setIsRenewalModalOpen(true)}
        />
      )}

      {/* Subscription Lockout & Plan Renewal Modal */}
      <SubscriptionRenewalModal
        isOpen={isRenewalModalOpen || hospitalData?.trialStatus === 'TRIAL_EXPIRED' || hospitalData?.status === 'EXPIRED'}
        onClose={() => setIsRenewalModalOpen(false)}
        hospital={hospitalData}
        isLocked={hospitalData?.trialStatus === 'TRIAL_EXPIRED' || hospitalData?.status === 'EXPIRED'}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Hospital Roster" value={`${staffList.length} Staff`} subtitle="Flexible Access Accounts" icon={Users} color="sky" />
        <StatCard title="Clinical Doctors" value={`${doctorsCount} Physicians`} subtitle="Primary & Cross-Role Doctors" icon={Stethoscope} color="emerald" />
        <StatCard title="Nursing Practitioners" value={`${nursingCount} Nurses`} subtitle="Bed Matrix & Vitals Access" icon={CheckCircle} color="indigo" />
        <StatCard title="Front Desk & Billing" value={`${cashiersCount} Staff`} subtitle="Tokens, Reception & Receipts" icon={Receipt} color="purple" />
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-600" /> {successMsg}
        </div>
      )}

      {/* Staff Roster Table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
            <ShieldCheck size={18} className="text-indigo-600" />
            Configured Staff Accounts ({staffList.length})
          </h3>
          <span className="text-xs text-neutral-500 font-mono">Dynamic Permission Matrix Roster</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100 text-neutral-600 uppercase tracking-wider text-[10px] border-b border-neutral-200">
              <tr>
                <th className="p-3">Staff Details</th>
                <th className="p-3">Primary Role & Additional Roles</th>
                <th className="p-3">Department Assignments</th>
                <th className="p-3">Designation / Shift</th>
                <th className="p-3">Account Status</th>
                <th className="p-3 text-right">Access Controls & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {staffList.length > 0 ? (
                staffList.map((st) => {
                  const primRoleLabel = ROLE_NAMES[st.role] || st.role;
                  const addRolesList = (st.additionalRoles || []).map((r) => ROLE_NAMES[r] || r);
                  const primDept = st.departmentId?.name || st.departmentId || 'General Medicine';
                  const addDepts = st.additionalDepartments || [];
                  const isUserActive = st.status === 'ACTIVE' || st.isActive !== false;
                  const isDoctor = st.role === 'DOCTOR' || (Array.isArray(st.additionalRoles) && st.additionalRoles.includes('DOCTOR'));
                  const isAvailable = st.isAvailable !== false;

                  return (
                    <tr key={st._id} className="hover:bg-neutral-50">
                      <td className="p-3">
                        <p className="font-bold text-neutral-900">{st.name}</p>
                        <p className="font-mono text-[11px] text-neutral-500">{st.email}</p>
                        {st.employeeId && <p className="text-[10px] text-indigo-600 font-semibold">ID: {st.employeeId}</p>}
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-neutral-800">{primRoleLabel}</p>
                        {addRolesList.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {addRolesList.map((r, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                + {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-neutral-700">{primDept}</p>
                        {addDepts.length > 0 && (
                          <p className="text-[10px] text-neutral-500 mt-0.5">
                            Extra: {addDepts.join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-neutral-700">{st.designation || 'Staff Member'}</p>
                        <p className="text-[10px] text-neutral-400">{st.shiftDetails || 'Rotational Shift'}</p>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isUserActive && (!isDoctor || isAvailable !== false) ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-rose-50 text-rose-700 border-rose-300'}`}>
                          {isUserActive && (!isDoctor || isAvailable !== false) ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="primary"
                            className="font-bold gap-1 text-[11px] px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs rounded-lg"
                            onClick={() => handleOpenEditModal(st)}
                          >
                            <Edit size={13} /> Edit Access
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="font-semibold gap-1 text-[11px] px-2.5 py-1 text-slate-700 bg-white border-slate-200 hover:bg-slate-50 hover:text-indigo-600 rounded-lg"
                            onClick={() => handleOpenViewModal(st)}
                            title="View Stored Password Hint"
                          >
                            <Eye size={13} /> Password
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="font-semibold gap-1 text-[11px] px-2.5 py-1 text-slate-700 bg-white border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 rounded-lg"
                            onClick={() => handleOpenChangeModal(st)}
                            title="Reset Password"
                          >
                            <Key size={13} /> Reset
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-neutral-500">
                    No hospital staff accounts created yet. Click 'Create Staff Account & Access Configuration' to configure staff roles, departments, and module action permissions!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MAIN MODAL: Create / Edit Complete Staff Access Configuration */}
      {isStaffModalOpen && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-container max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 rounded-lg bg-indigo-100 border border-indigo-200 text-indigo-700 flex-shrink-0">
                  <UserCog size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-neutral-900 leading-snug break-words">
                    {staffForm.id ? `Edit Staff: ${staffForm.name}` : 'Create Staff Account & Permissions'}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5 hidden sm:block">
                    Assign Roles, Departments, Module Navigation & Action-Level Permissions
                  </p>
                </div>
              </div>
              <button onClick={() => setIsStaffModalOpen(false)} className="modal-close-btn shrink-0" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs Header */}
            <div className="flex border-b border-neutral-200 bg-neutral-50 px-3 sm:px-6 pt-2 flex-shrink-0 overflow-x-auto whitespace-nowrap scrollbar-none">
              <button
                type="button"
                className={`px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
                  activeFormTab === 'DETAILS'
                    ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
                onClick={() => setActiveFormTab('DETAILS')}
              >
                <Users size={15} />
                <span className="hidden sm:inline">1. Staff Profile, Roles & Departments</span>
                <span className="sm:hidden">1. Profile & Roles</span>
              </button>
              <button
                type="button"
                className={`px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
                  activeFormTab === 'PERMISSIONS'
                    ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
                onClick={() => setActiveFormTab('PERMISSIONS')}
              >
                <SlidersHorizontal size={15} />
                <span className="hidden sm:inline">2. Module & Action Permissions Matrix ({Object.values(staffForm.permissions).flat().length} Actions Granted)</span>
                <span className="sm:hidden">2. Permissions ({Object.values(staffForm.permissions).flat().length})</span>
              </button>
            </div>

            <form onSubmit={handleSaveStaffForm} className="flex-1 flex flex-col overflow-hidden">
              <div className="modal-body flex-1 overflow-y-auto p-6 space-y-6">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={16} /> {errorMsg}
                  </div>
                )}

                {/* TAB 1: Profile, Roles & Departments */}
                {activeFormTab === 'DETAILS' && (
                  <div className="space-y-6 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Full Staff Name"
                        value={staffForm.name}
                        onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                        placeholder="e.g. Dr. Madhu Narayan"
                        required
                      />
                      <Input
                        label="Employee ID / Staff Code"
                        value={staffForm.employeeId}
                        onChange={(e) => setStaffForm({ ...staffForm, employeeId: e.target.value })}
                        placeholder="e.g. EMP-2026-042"
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
                        label="Mobile / Phone Number"
                        value={staffForm.phone}
                        onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                        placeholder="e.g. +91 9876543210"
                      />
                    </div>

                    {!staffForm.id && (
                      <div className="relative">
                        <Input
                          label="Assign Password or Temporary Password"
                          type={showCreatePassword ? 'text' : 'password'}
                          value={staffForm.password}
                          onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                          placeholder="e.g. HospitalDoctor123!"
                          required={!staffForm.id}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCreatePassword(!showCreatePassword)}
                          className="absolute right-3 top-8 text-neutral-400 hover:text-neutral-900 p-0.5"
                          aria-label="Toggle Password Visibility"
                        >
                          {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input
                        label="Designation / Title"
                        value={staffForm.designation}
                        onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })}
                        placeholder="e.g. Senior Registrar / Staff Nurse"
                      />
                      <Input
                        label="Shift / Roster Pattern"
                        value={staffForm.shiftDetails}
                        onChange={(e) => setStaffForm({ ...staffForm, shiftDetails: e.target.value })}
                        placeholder="e.g. Morning Shift (08:00 AM - 04:00 PM)"
                      />
                      <Input
                        label="Assigned Ward or Unit"
                        value={staffForm.assignedUnit}
                        onChange={(e) => setStaffForm({ ...staffForm, assignedUnit: e.target.value })}
                        placeholder="e.g. OPD Block A, ICU, Ward 3"
                      />
                    </div>

                    {/* Account Status Toggle */}
                    <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-neutral-900">Account Operational Status</p>
                        <p className="text-[11px] text-neutral-500">Enable or disable staff login and operational permissions</p>
                      </div>
                      <select
                        value={staffForm.status}
                        onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value })}
                        className="glass-input rounded-lg px-3 py-1.5 text-xs font-bold text-neutral-900"
                      >
                        <option value="ACTIVE">ACTIVE (Enabled & Authorized)</option>
                        <option value="INACTIVE">INACTIVE (Deactivated Account)</option>
                      </select>
                    </div>

                    {/* Primary Role & Additional Roles Selection */}
                    <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-4 space-y-4">
                      <div>
                        <label className="block text-indigo-900 font-extrabold uppercase tracking-wider text-[11px] mb-1.5">
                          1. Select Primary Role (Required)
                        </label>
                        <select
                          value={staffForm.role}
                          onChange={(e) => handleRoleChange(e.target.value)}
                          className="w-full glass-input rounded-lg px-3.5 py-2 text-sm text-neutral-900 font-bold bg-white"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.code} value={r.code}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-indigo-600 mt-1 font-medium">
                          Selecting a role automatically merges default module permissions.
                        </p>
                      </div>

                      <div>
                        <label className="block text-indigo-900 font-extrabold uppercase tracking-wider text-[11px] mb-2">
                          2. Select Additional Roles (Cross-Role Responsibilities)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white p-3 rounded-lg border border-indigo-100 max-h-36 overflow-y-auto">
                          {ROLE_OPTIONS.filter((r) => r.code !== staffForm.role).map((r) => {
                            const isChecked = staffForm.additionalRoles.includes(r.code);
                            return (
                              <label key={r.code} className="flex items-center gap-2 cursor-pointer text-xs select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleAdditionalRoleToggle(r.code)}
                                  className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className={isChecked ? 'font-bold text-indigo-700' : 'text-neutral-700'}>
                                  {r.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>


                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => setActiveFormTab('PERMISSIONS')}
                        className="gap-2 font-bold"
                      >
                        Next: Configure Module Permissions Matrix &rarr;
                      </Button>
                    </div>
                  </div>
                )}

                {/* TAB 2: Module & Action Permissions Matrix */}
                {activeFormTab === 'PERMISSIONS' && (
                  <div className="space-y-4 text-xs">
                    {/* Quick Controls Bar */}
                    <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button type="button" size="sm" variant="outline" onClick={handleSelectAllPermissions} className="gap-1 font-semibold">
                          <CheckSquare size={13} /> Select All Actions
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={handleClearAllPermissions} className="gap-1 font-semibold">
                          <Square size={13} /> Clear All
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={handleResetToRoleDefaults} className="gap-1 font-semibold text-indigo-700 bg-indigo-50 border-indigo-200">
                          <RotateCcw size={13} /> Apply Combined Role Defaults
                        </Button>
                      </div>

                      {/* Clone / Copy Permissions Dropdown */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-neutral-500 font-medium">Copy Permissions:</span>
                        <select
                          value={copyFromStaffId}
                          onChange={(e) => {
                            setCopyFromStaffId(e.target.value);
                            handleCopyPermissionsFromStaff(e.target.value);
                          }}
                          className="glass-input text-xs rounded-lg px-2.5 py-1 text-neutral-900 font-semibold bg-white"
                        >
                          <option value="">-- Copy from staff --</option>
                          {staffList.filter((s) => s._id !== staffForm.id).map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.name} ({ROLE_NAMES[s.role] || s.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Permissions Matrix Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(MODULE_ACTION_MATRIX).map(([modKey, modConfig]) => {
                        const grantedActions = staffForm.permissions[modKey] || [];
                        const actionKeys = Object.keys(modConfig.actions);
                        const isAllSelected = actionKeys.length > 0 && grantedActions.length === actionKeys.length;

                        return (
                          <div key={modKey} className="border border-neutral-200 rounded-xl p-3.5 bg-white shadow-2xs hover:border-indigo-300 transition-colors">
                            <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-2">
                              <div>
                                <h4 className="font-bold text-neutral-900">{modConfig.label}</h4>
                                <p className="text-[10px] text-neutral-400 font-mono">module: {modKey}</p>
                              </div>
                              <button
                                type="button"
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-900"
                                onClick={() => isAllSelected ? handleClearModuleActions(modKey) : handleSelectAllModuleActions(modKey)}
                              >
                                {isAllSelected ? 'Clear Module' : 'Select All'}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {Object.entries(modConfig.actions).map(([actKey, actLabel]) => {
                                const isChecked = grantedActions.includes(actKey);
                                return (
                                  <label key={actKey} className="flex items-center gap-2 cursor-pointer text-xs select-none">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleActionToggle(modKey, actKey)}
                                      className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className={isChecked ? 'font-bold text-neutral-900' : 'text-neutral-600'}>
                                      {actLabel}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="modal-footer flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-neutral-200 p-3 sm:p-4 bg-neutral-50 flex-shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsStaffModalOpen(false)} className="w-full sm:w-auto order-2 sm:order-1">
                  Cancel
                </Button>

                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto order-1 sm:order-2">
                  {activeFormTab === 'PERMISSIONS' ? (
                    <Button type="button" variant="outline" onClick={() => setActiveFormTab('DETAILS')} className="w-full sm:w-auto">
                      &larr; Back to Profile
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => setActiveFormTab('PERMISSIONS')} className="w-full sm:w-auto">
                      Next: Permissions &rarr;
                    </Button>
                  )}
                  <Button type="submit" variant="primary" className="font-bold gap-2 w-full sm:w-auto justify-center" isLoading={isLoading}>
                    <CheckCircle size={16} />
                    <span className="sm:hidden">Save Account</span>
                    <span className="hidden sm:inline">Save Staff Configuration</span>
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: View Current Password */}
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
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center gap-2">
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

      {/* MODAL 3: Change Staff Password */}
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
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center gap-2">
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
    </div>
  );
};
