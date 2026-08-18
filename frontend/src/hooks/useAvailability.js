/**
 * useAvailability — Hook for managing staff availability toggle.
 *
 * Provides:
 *   - isAvailable: current state
 *   - isToggling: loading state
 *   - handleToggle: async function to flip availability
 *   - statusMessage: success/error message
 *   - clearStatus: clear the status message
 *
 * Works for any staff role (DOCTOR, NURSE, LAB_TECH, PHARMACIST, RADIOLOGIST, etc.)
 * Emits the WorkflowEvent STAFF_WENT_OFFLINE / STAFF_CAME_ONLINE through the backend.
 */
import { useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { axiosClient } from '../api/axiosClient';

export const useAvailability = () => {
  const { user } = useAuthStore();
  const [isAvailable, setIsAvailable] = useState(() => user?.isAvailable ?? true);
  const [isToggling, setIsToggling] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleToggle = useCallback(async () => {
    const nextState = !isAvailable;
    setIsToggling(true);
    setStatusMessage(null);
    try {
      const targetId = user?.id || user?._id || 'me';
      const res = await axiosClient.patch(`/auth/staff/${targetId}/availability`, {
        isAvailable: nextState,
      });
      const payload = res.data?.data || res.data;
      const updated = payload?.isAvailable !== undefined ? Boolean(payload.isAvailable) : nextState;

      setIsAvailable(updated);

      // Sync auth store + localStorage
      if (user) {
        const updatedUser = { ...user, isAvailable: updated };
        useAuthStore.setState({ user: updatedUser });
        try { localStorage.setItem('hpmbs_user', JSON.stringify(updatedUser)); } catch (_) {}
      }

      setStatusMessage({
        type: updated ? 'success' : 'warning',
        text: updated
          ? 'You are now ONLINE. New assignments will be routed to you.'
          : 'You are now OFFLINE. No new work will be sent to you.',
      });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to update availability. Please try again.' });
    } finally {
      setIsToggling(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  }, [isAvailable, user]);

  const clearStatus = useCallback(() => setStatusMessage(null), []);

  return { isAvailable, isToggling, handleToggle, statusMessage, clearStatus, setIsAvailable };
};
