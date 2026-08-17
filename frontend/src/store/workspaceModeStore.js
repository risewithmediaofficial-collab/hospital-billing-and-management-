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
  // Hospital Admins, Super Admins, or any staff with multiple cross-roles
  isDualModeEligible: (user) => {
    if (!user) return false;
    if (user.role === 'HOSPITAL_ADMIN' || user.role === 'SUPER_ADMIN') return true;
    const additional = Array.isArray(user.additionalRoles) ? user.additionalRoles : [];
    return additional.length > 0;
  },
}));
