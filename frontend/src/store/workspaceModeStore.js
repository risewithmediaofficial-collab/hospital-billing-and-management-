import { create } from 'zustand';

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

  // Helper to check if a user is eligible for dual-mode toggle
  // STRICT RULE: Only Hospital Administrators (HOSPITAL_ADMIN / SUPER_ADMIN) have Admin Mode access.
  // Standard clinical and departmental staff (Doctors, Nurses, Receptionists, Lab Techs, etc.) NEVER receive Admin access.
  isDualModeEligible: (user) => {
    if (!user) return false;
    const isPrimaryAdmin = user.role === 'HOSPITAL_ADMIN' || user.role === 'SUPER_ADMIN';
    const additional = Array.isArray(user.additionalRoles) ? user.additionalRoles : [];
    const hasAdminInAdditional = additional.includes('HOSPITAL_ADMIN') || additional.includes('SUPER_ADMIN');
    return isPrimaryAdmin || hasAdminInAdditional;
  },
}));
