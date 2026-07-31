import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSuperAdminContextStore = create(
  persist(
    (set, get) => ({
      selectedHospitalId: null,
      selectedHospitalName: null,
      hospitals: [],

      setSelectedHospital: (hospitalId, hospitalName = null) => {
        set({ selectedHospitalId: hospitalId, selectedHospitalName: hospitalName });
      },

      clearSelectedHospital: () => {
        set({ selectedHospitalId: null, selectedHospitalName: null });
      },

      setHospitals: (hospitals) => set({ hospitals }),

      getContextHeader: () => {
        const { selectedHospitalId } = get();
        return selectedHospitalId || null;
      },
    }),
    {
      name: 'hpmbs_super_admin_context',
      partialize: (state) => ({
        selectedHospitalId: state.selectedHospitalId,
        selectedHospitalName: state.selectedHospitalName,
      }),
    }
  )
);
