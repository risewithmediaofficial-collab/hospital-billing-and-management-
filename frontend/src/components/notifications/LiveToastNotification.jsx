import React, { useEffect } from 'react';
import { useSocket } from '../../providers/SocketProvider';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (_) {}
};

export const LiveToastNotification = () => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const user = useAuthStore.getState().user;
    const userRole = user?.role;

    const handleWorkflowNotification = (data) => {
      if (!data) return;
      playNotificationSound();
      useNotificationStore.getState().addNotification(data);
    };

    const handleNewNurseTasks = (data) => {
      if (userRole !== 'NURSE' && userRole !== 'NURSE_INCHARGE') return;
      playNotificationSound();
      useNotificationStore.getState().addNotification({
        title: 'New Nurse / Injection Task',
        message: `Task assigned for patient ${data?.patientName || 'Patient'} (UHID: ${data?.uhid || '—'})`,
        type: 'NURSE_TASKS',
        linkedPath: data?.targetRoute || data?.linkedPath || `/nurse-incharge/dashboard?tab=TASKS${data?.taskId ? `&taskId=${encodeURIComponent(data.taskId)}` : ''}`,
      });
    };

    const handleInvestigationNew = (data) => {
      const isRadiologyCategory = String(data?.testCategory || '').toUpperCase() === 'RADIOLOGY';
      if (isRadiologyCategory && !['RADIOLOGIST', 'RADIOLOGY_STAFF'].includes(userRole)) return;
      if (!isRadiologyCategory && !['LAB_TECH', 'LABORATORY_STAFF'].includes(userRole)) return;

      playNotificationSound();
      useNotificationStore.getState().addNotification({
        title: isRadiologyCategory ? 'New Radiology Investigation Ordered' : 'New Diagnostic Lab Request',
        message: `Order #${data?.orderNumber || ''} created for ${data?.patientName || 'Patient'}`,
        type: isRadiologyCategory ? 'RADIOLOGY_ORDER_CREATED' : 'LAB_ORDER_CREATED',
        linkedPath: isRadiologyCategory ? '/radiology/dashboard' : '/laboratory/dashboard',
      });
    };

    const handleDoctorQueueUpdated = (data) => {
      if (data?.title || data?.message) {
        playNotificationSound();
        useNotificationStore.getState().addNotification(data);
      }
    };

    const handleGeneralNotification = (data) => {
      if (data) {
        useNotificationStore.getState().addNotification(data);
      }
    };

    socket.on('workflow:notification', handleWorkflowNotification);
    socket.on('workflow:new_nurse_tasks', handleNewNurseTasks);
    socket.on('investigation:new_request', handleInvestigationNew);
    socket.on('opd_queue:status_changed', handleDoctorQueueUpdated);
    socket.on('notification:created', handleGeneralNotification);
    socket.on('queue:patient_added', handleGeneralNotification);
    socket.on('appointment:created', handleGeneralNotification);
    socket.on('token:generated', handleGeneralNotification);

    return () => {
      socket.off('workflow:notification', handleWorkflowNotification);
      socket.off('workflow:new_nurse_tasks', handleNewNurseTasks);
      socket.off('investigation:new_request', handleInvestigationNew);
      socket.off('opd_queue:status_changed', handleDoctorQueueUpdated);
      socket.off('notification:created', handleGeneralNotification);
      socket.off('queue:patient_added', handleGeneralNotification);
      socket.off('appointment:created', handleGeneralNotification);
      socket.off('token:generated', handleGeneralNotification);
    };
  }, [socket]);

  // Completely hidden on screen — notifications live strictly inside the Bell icon dropdown with badge count
  return null;
};

export default LiveToastNotification;

