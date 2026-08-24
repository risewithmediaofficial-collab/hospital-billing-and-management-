import { create } from 'zustand';

export const OPERATIONAL_ROLES = [
  'DOCTOR', 'NURSE', 'NURSE_INCHARGE', 'IPD_STAFF', 'RECEPTIONIST', 'OPD_STAFF',
  'PHARMACIST', 'PHARMACY_STAFF', 'LAB_TECH', 'LABORATORY_STAFF', 'RADIOLOGIST',
  'RADIOLOGY_STAFF', 'CASHIER', 'BILLING_STAFF', 'INVENTORY_MANAGER', 'HR_MANAGER',
  'EMERGENCY_STAFF',
];

export const CLINIC_OWNER_WORK_ROLES = [
  'RECEPTIONIST', 'CASHIER', 'NURSE_INCHARGE', 'IPD_STAFF',
  'PHARMACIST', 'LAB_TECH', 'RADIOLOGIST', 'EMERGENCY_STAFF',
  'INVENTORY_MANAGER', 'HR_MANAGER',
];

export const getOperationalRoles = (user) => {
  if (!user) return [];
  return [user.role, ...(Array.isArray(user.additionalRoles) ? user.additionalRoles : [])]
    .filter((role) => OPERATIONAL_ROLES.includes(role));
};

export const getDefaultWorkRoute = (user) => {
  const roles = getOperationalRoles(user);
  const routes = {
    DOCTOR: '/doctor/dashboard',
    NURSE: '/nurse-incharge/dashboard?tab=TASKS',
    NURSE_INCHARGE: '/nurse-incharge/dashboard',
    IPD_STAFF: '/nurse-incharge/dashboard',
    RECEPTIONIST: '/reception/registered-patients',
    OPD_STAFF: '/reception/registered-patients',
    PHARMACIST: '/pharmacy/dashboard',
    PHARMACY_STAFF: '/pharmacy/dashboard',
    LAB_TECH: '/laboratory/dashboard',
    LABORATORY_STAFF: '/laboratory/dashboard',
    RADIOLOGIST: '/radiology/dashboard',
    RADIOLOGY_STAFF: '/radiology/dashboard',
    CASHIER: '/billing/dashboard',
    BILLING_STAFF: '/billing/dashboard',
    INVENTORY_MANAGER: '/inventory/dashboard',
    HR_MANAGER: '/hr/dashboard',
    EMERGENCY_STAFF: '/emergency',
  };
  return routes[roles[0]] || null;
};

export const useWorkspaceModeStore = create((set, get) => ({
  // 'WORK' | 'ADMIN'
  currentMode: (() => {
    try {
      const saved = localStorage.getItem('hpmbs_workspace_mode');
      if (saved === 'WORK' || saved === 'ADMIN') return saved;
      return 'WORK'; // Default to WORK mode for practical daily clinic workflow
    } catch {
      return 'WORK';
    }
  })(),

  setMode: (mode) => {
    if (mode !== 'WORK' && mode !== 'ADMIN') return;
    try {
      localStorage.setItem('hpmbs_workspace_mode', mode);
    } catch (e) {
      console.warn('Failed to save workspace mode to localStorage:', e);
    }
    set({ currentMode: mode });
  },

  toggleMode: () => {
    const nextMode = get().currentMode === 'WORK' ? 'ADMIN' : 'WORK';
    get().setMode(nextMode);
    return nextMode;
  },

  // Admin mode is governance. Work mode is offered only when the same account
  // has an explicitly assigned operational role.
  isDualModeEligible: (user) => {
    if (!user) return false;
    if (user.role === 'HOSPITAL_ADMIN') return true;
    const isPrimaryAdmin = user.role === 'HOSPITAL_ADMIN' || user.role === 'SUPER_ADMIN';
    const additional = Array.isArray(user.additionalRoles) ? user.additionalRoles : [];
    const hasAdminInAdditional = additional.includes('HOSPITAL_ADMIN') || additional.includes('SUPER_ADMIN');
    return (isPrimaryAdmin || hasAdminInAdditional) && getOperationalRoles(user).length > 0;
  },
}));
