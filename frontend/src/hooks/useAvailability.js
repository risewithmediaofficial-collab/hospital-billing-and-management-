import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { axiosClient } from '../api/axiosClient';

const DEFAULT_DEPT_AVAILABILITY = {
  DOCTOR: true,
  RECEPTIONIST: true,
  CASHIER: true,
  PHARMACIST: true,
  LAB_TECH: true,
  RADIOLOGIST: true,
  NURSE: true,
  EMERGENCY_STAFF: true,
};

export const useAvailability = () => {
  const { user } = useAuthStore();
  const [isAvailable, setIsAvailable] = useState(() => user?.isAvailable ?? true);
  const [departmentAvailability, setDepartmentAvailability] = useState(() => ({
    ...DEFAULT_DEPT_AVAILABILITY,
    ...(user?.adminDepartmentAvailability || {}),
  }));
  const [isToggling, setIsToggling] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    if (user?.isAvailable !== undefined) {
      setIsAvailable(Boolean(user.isAvailable));
    }
    if (user?.adminDepartmentAvailability) {
      setDepartmentAvailability({
        ...DEFAULT_DEPT_AVAILABILITY,
        ...user.adminDepartmentAvailability,
      });
    }
  }, [user?.isAvailable, user?.adminDepartmentAvailability]);

  const handleToggle = useCallback(async (explicitState = null) => {
    const nextState = explicitState !== null ? Boolean(explicitState) : !isAvailable;
    setIsToggling(true);
    setStatusMessage(null);
    try {
      const targetId = user?.id || user?._id || 'me';
      const res = await axiosClient.patch(`/auth/staff/${targetId}/availability`, {
        isAvailable: nextState,
        adminDepartmentAvailability: departmentAvailability,
      });
      const payload = res.data?.data || res.data;
      const updated = payload?.isAvailable !== undefined ? Boolean(payload.isAvailable) : nextState;

      setIsAvailable(updated);

      if (user) {
        const updatedUser = {
          ...user,
          isAvailable: updated,
          adminDepartmentAvailability: payload?.adminDepartmentAvailability || departmentAvailability,
          additionalRoles: payload?.additionalRoles || user.additionalRoles,
        };
        useAuthStore.setState({ user: updatedUser });
        try { localStorage.setItem('hpmbs_user', JSON.stringify(updatedUser)); } catch (_) {}
      }

      setStatusMessage({
        type: updated ? 'success' : 'warning',
        text: updated
          ? 'Backup Work Mode is now ACTIVE. Active desk assignments will be routed to you.'
          : 'Backup Work Mode is now PAUSED / OFFLINE.',
      });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to update availability. Please try again.' });
    } finally {
      setIsToggling(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  }, [isAvailable, departmentAvailability, user]);

  const handleDepartmentToggle = useCallback(async (deptKey, targetState = null) => {
    const nextDeptState = targetState !== null ? Boolean(targetState) : !departmentAvailability[deptKey];
    const newDeptMap = {
      ...departmentAvailability,
      [deptKey]: nextDeptState,
    };
    setDepartmentAvailability(newDeptMap);
    setIsToggling(true);
    setStatusMessage(null);

    // If turning on a department while overall is offline, also turn overall online
    const nextOverallState = nextDeptState ? true : isAvailable;

    try {
      const targetId = user?.id || user?._id || 'me';
      const res = await axiosClient.patch(`/auth/staff/${targetId}/availability`, {
        isAvailable: nextOverallState,
        adminDepartmentAvailability: newDeptMap,
      });
      const payload = res.data?.data || res.data;

      if (payload?.isAvailable !== undefined) setIsAvailable(Boolean(payload.isAvailable));
      if (payload?.adminDepartmentAvailability) setDepartmentAvailability(payload.adminDepartmentAvailability);

      if (user) {
        const updatedUser = {
          ...user,
          isAvailable: payload?.isAvailable !== undefined ? Boolean(payload.isAvailable) : nextOverallState,
          adminDepartmentAvailability: payload?.adminDepartmentAvailability || newDeptMap,
          additionalRoles: payload?.additionalRoles || user.additionalRoles,
        };
        useAuthStore.setState({ user: updatedUser });
        try { localStorage.setItem('hpmbs_user', JSON.stringify(updatedUser)); } catch (_) {}
      }

      setStatusMessage({
        type: 'success',
        text: `${deptKey.replace(/_/g, ' ')} backup desk is now ${nextDeptState ? 'ACTIVE' : 'PAUSED'}.`,
      });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to update department backup status.' });
    } finally {
      setIsToggling(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  }, [departmentAvailability, isAvailable, user]);

  const handleSetAllDepartments = useCallback(async (enableAll) => {
    const newDeptMap = Object.keys(DEFAULT_DEPT_AVAILABILITY).reduce((acc, k) => {
      acc[k] = enableAll;
      return acc;
    }, {});
    setDepartmentAvailability(newDeptMap);
    setIsToggling(true);
    setStatusMessage(null);

    const nextOverallState = enableAll ? true : isAvailable;

    try {
      const targetId = user?.id || user?._id || 'me';
      const res = await axiosClient.patch(`/auth/staff/${targetId}/availability`, {
        isAvailable: nextOverallState,
        adminDepartmentAvailability: newDeptMap,
      });
      const payload = res.data?.data || res.data;

      if (payload?.isAvailable !== undefined) setIsAvailable(Boolean(payload.isAvailable));
      if (payload?.adminDepartmentAvailability) setDepartmentAvailability(payload.adminDepartmentAvailability);

      if (user) {
        const updatedUser = {
          ...user,
          isAvailable: payload?.isAvailable !== undefined ? Boolean(payload.isAvailable) : nextOverallState,
          adminDepartmentAvailability: payload?.adminDepartmentAvailability || newDeptMap,
          additionalRoles: payload?.additionalRoles || user.additionalRoles,
        };
        useAuthStore.setState({ user: updatedUser });
        try { localStorage.setItem('hpmbs_user', JSON.stringify(updatedUser)); } catch (_) {}
      }

      setStatusMessage({
        type: 'success',
        text: enableAll ? 'All department backup desks enabled.' : 'All department backup desks paused.',
      });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to update backup desks.' });
    } finally {
      setIsToggling(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  }, [isAvailable, user]);

  const clearStatus = useCallback(() => setStatusMessage(null), []);

  return {
    isAvailable,
    departmentAvailability,
    isToggling,
    handleToggle,
    handleDepartmentToggle,
    handleSetAllDepartments,
    statusMessage,
    clearStatus,
  };
};
