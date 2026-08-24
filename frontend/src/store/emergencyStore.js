import { create } from 'zustand';
import { axiosClient } from '../api/axiosClient';

// Helper: check if a string is a valid MongoDB ObjectId (24 hex chars)
const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id));

export const useEmergencyStore = create((set, get) => ({
  emergencies: [],
  activeCount: 0,
  resolvingIds: new Set(), // track which IDs are currently being resolved

  addEmergency: (data) => {
    if (!data || typeof data !== 'object') return;
    const { emergencies } = get();
    const emgId = data.emergencyId || data._id || data.id || `emg_${Date.now()}`;
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
    const rawId = String(id);

    // Guard: don't send API call with a temp/invalid ID — instead fetch fresh from server
    if (!isValidObjectId(rawId)) {
      console.warn('[EmergencyStore] resolveEmergency called with a non-MongoDB ID:', rawId, '— refreshing active list from server.');
      await get().fetchActiveEmergencies();
      return;
    }

    // Guard: prevent duplicate resolving
    const { resolvingIds } = get();
    if (resolvingIds.has(rawId)) return;
    set({ resolvingIds: new Set([...resolvingIds, rawId]) });

    try {
      await axiosClient.patch(`/emergency/${rawId}/resolve`, { resolutionNotes: notes });

      const { emergencies } = get();
      const updated = emergencies.map((e) => {
        if (String(e._id || e.emergencyId || e.id) === rawId) {
          return { ...e, status: 'RESOLVED', resolvedAt: new Date() };
        }
        return e;
      });

      const active = updated.filter((e) => e.status === 'ACTIVE').length;
      set({ emergencies: updated, activeCount: active });
    } catch (err) {
      console.error('Failed to resolve emergency on server:', err);
      // Re-fetch to get the true state
      await get().fetchActiveEmergencies();
    } finally {
      const { resolvingIds: current } = get();
      const next = new Set(current);
      next.delete(rawId);
      set({ resolvingIds: next });
    }
  },

  isResolving: (id) => get().resolvingIds.has(String(id)),

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
