import { create } from 'zustand';
import { axiosClient } from '../api/axiosClient';

export const useEmergencyStore = create((set, get) => ({
  emergencies: [],
  activeCount: 0,

  addEmergency: (data) => {
    const { emergencies } = get();
    const emgId = data.emergencyId || data.id || data._id || `emg_${Date.now()}`;
    const exists = emergencies.some((e) => String(e._id || e.emergencyId || e.id) === String(emgId));

    if (exists) return;

    const newEmergency = {
      _id: emgId,
      emergencyId: emgId,
      emergencyType: data.emergencyType || 'CODE_BLUE',
      severity: data.severity || 'CRITICAL',
      location: data.location || 'Hospital Ward',
      patientName: data.patientName || 'Unknown / Unidentified',
      uhid: data.uhid || 'N/A',
      raisedByUserName: data.raisedBy || data.raisedByUserName || 'Hospital Staff',
      raisedByDept: data.raisedByDept || 'RECEPTION',
      description: data.description || 'Immediate emergency medical response required!',
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      status: 'ACTIVE',
    };

    const updated = [newEmergency, ...emergencies];
    const active = updated.filter((e) => e.status === 'ACTIVE').length;

    set({ emergencies: updated, activeCount: active });
  },

  resolveEmergency: async (id, notes = '') => {
    try {
      await axiosClient.patch(`/emergency/${id}/resolve`, { resolutionNotes: notes });

      const { emergencies } = get();
      const updated = emergencies.map((e) => {
        if (String(e._id || e.emergencyId || e.id) === String(id)) {
          return { ...e, status: 'RESOLVED', resolvedAt: new Date() };
        }
        return e;
      });

      const active = updated.filter((e) => e.status === 'ACTIVE').length;
      set({ emergencies: updated, activeCount: active });
    } catch (err) {
      console.error('Failed to resolve emergency on server:', err);
    }
  },

  fetchActiveEmergencies: async () => {
    try {
      const res = await axiosClient.get('/emergency/active');
      const activeList = res.data || [];
      const activeCount = activeList.length;
      set({ emergencies: activeList, activeCount });
    } catch (err) {
      console.error('Failed to fetch active emergencies:', err);
    }
  },
}));
