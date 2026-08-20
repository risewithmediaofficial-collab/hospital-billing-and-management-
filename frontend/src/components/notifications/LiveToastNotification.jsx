import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../providers/SocketProvider';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';
import {
  Bell,
  Syringe,
  Pill,
  TestTube,
  Receipt,
  BedDouble,
  ShieldAlert,
  X,
  ExternalLink,
} from 'lucide-react';

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

const getNotificationIcon = (item) => {
  const type = String(item.type || item.event || '').toUpperCase();
  const title = String(item.title || '').toUpperCase();

  if (type.includes('EMERGENCY') || title.includes('EMERGENCY') || title.includes('CODE BLUE')) {
    return <ShieldAlert size={20} className="text-rose-500 shrink-0" />;
  }
  if (type.includes('NURSE') || title.includes('INJECTION') || title.includes('NURSE') || title.includes('PROCEDURE')) {
    return <Syringe size={20} className="text-pink-500 shrink-0" />;
  }
  if (type.includes('PHARMACY') || type.includes('PRESCRIPTION') || title.includes('PRESCRIPTION') || title.includes('MEDICINE')) {
    return <Pill size={20} className="text-amber-500 shrink-0" />;
  }
  if (type.includes('LAB') || type.includes('RADIOLOGY') || title.includes('LAB') || title.includes('SCAN') || title.includes('INVESTIGATION')) {
    return <TestTube size={20} className="text-cyan-500 shrink-0" />;
  }
  if (type.includes('BILL') || type.includes('INVOICE') || type.includes('PAYMENT') || title.includes('BILL') || title.includes('INVOICE')) {
    return <Receipt size={20} className="text-emerald-500 shrink-0" />;
  }
  if (type.includes('ADMISSION') || title.includes('ADMISSION') || title.includes('BED')) {
    return <BedDouble size={20} className="text-indigo-500 shrink-0" />;
  }
  return <Bell size={20} className="text-indigo-500 shrink-0" />;
};

const getDepartmentMeta = (item) => {
  const type = String(item.type || item.event || '').toUpperCase();
  const title = String(item.title || '').toUpperCase();
  const linked = String(item.linkedPath || item.targetRoute || item.link || '').toLowerCase();

  if (type.includes('EMERGENCY') || title.includes('EMERGENCY') || title.includes('CODE BLUE')) {
    return { name: 'Emergency', badgeClass: 'bg-rose-500 text-white' };
  }
  if (type.includes('LAB') || title.includes('LAB') || linked.includes('/laboratory')) {
    return { name: 'Laboratory', badgeClass: 'bg-cyan-500 text-white' };
  }
  if (type.includes('RADIOLOGY') || title.includes('SCAN') || title.includes('RADIOLOGY') || linked.includes('/radiology')) {
    return { name: 'Radiology', badgeClass: 'bg-teal-500 text-white' };
  }
  if (type.includes('PHARMACY') || type.includes('PRESCRIPTION') || title.includes('PRESCRIPTION') || title.includes('MEDICINE') || linked.includes('/pharmacy')) {
    return { name: 'Pharmacy', badgeClass: 'bg-amber-500 text-white' };
  }
  if (type.includes('BILL') || type.includes('INVOICE') || type.includes('PAYMENT') || title.includes('BILL') || title.includes('INVOICE') || linked.includes('/billing')) {
    return { name: 'Central Billing', badgeClass: 'bg-emerald-500 text-white' };
  }
  if (type.includes('NURSE') || title.includes('INJECTION') || title.includes('NURSE') || title.includes('PROCEDURE') || title.includes('ADMISSION') || linked.includes('/nurse') || linked.includes('/nursing')) {
    return { name: 'Inpatient & Ward', badgeClass: 'bg-pink-500 text-white' };
  }
  if (type.includes('PATIENT_QUEUED') || title.includes('PATIENT') || linked.includes('/doctor')) {
    return { name: 'Clinical EMR', badgeClass: 'bg-indigo-500 text-white' };
  }
  if (linked.includes('/reception') || title.includes('RECEPTION') || title.includes('TOKEN')) {
    return { name: 'Reception & Queue', badgeClass: 'bg-blue-500 text-white' };
  }
  return { name: 'Department Alert', badgeClass: 'bg-slate-700 text-slate-200' };
};

export const LiveToastNotification = () => {
  const { socket } = useSocket();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);

  const formatTenantPath = useCallback((path) => {
    if (!path) return path;
    if (user?.role === 'SUPER_ADMIN') return path;
    const domain = user?.hospitalDomain || window.location.pathname.split('/')[1];
    const isReserved = ['admin', 'hospital-admin', 'login', 'doctor', 'nurse', 'nursing', 'reception', 'billing', 'pharmacy', 'laboratory', 'radiology', '403', '404'].includes(domain);
    const tenantDomain = user?.hospitalDomain || (!isReserved && domain ? domain : null);

    let cleanPath = path;
    if (tenantDomain && cleanPath.startsWith('/hospital-admin')) {
      cleanPath = cleanPath.replace(/^\/hospital-admin/, '/admin');
    }

    if (!tenantDomain) return cleanPath;
    if (cleanPath.startsWith(`/${tenantDomain}`)) return cleanPath;
    return `/${tenantDomain}${cleanPath}`;
  }, [user]);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addToast = useCallback((payload) => {
    if (!payload || (!payload.title && !payload.message)) return;

    const id = payload.id || `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast = {
      id,
      title: payload.title || 'Notification',
      message: payload.message || '',
      type: payload.type || 'WORKFLOW',
      linkedPath: payload.linkedPath || payload.targetRoute || payload.link || '',
      createdAt: new Date(),
    };

    playNotificationSound();
    useNotificationStore.getState().fetchNotifications();

    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);

    setTimeout(() => {
      removeToast(id);
    }, 7000);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleWorkflowNotification = (data) => {
      addToast(data);
    };

    const handleNewNurseTasks = (data) => {
      addToast({
        title: 'New Nurse / Injection Task',
        message: `Task assigned for patient ${data.patientName || 'Patient'} (UHID: ${data.uhid || '—'})`,
        type: 'NURSE_TASKS',
        linkedPath: '/nurse-incharge/dashboard?tab=TASKS',
      });
    };

    const handleInvestigationNew = (data) => {
      addToast({
        title: 'New Diagnostic Investigation Ordered',
        message: `Order #${data.orderNumber || ''} created for ${data.patientName || 'Patient'}`,
        type: 'LAB_ORDER_CREATED',
        linkedPath: data.testCategory === 'RADIOLOGY' ? '/radiology/dashboard' : '/laboratory/dashboard',
      });
    };

    const handleDoctorQueueUpdated = (data) => {
      if (data?.title) {
        addToast(data);
      }
    };

    socket.on('workflow:notification', handleWorkflowNotification);
    socket.on('workflow:new_nurse_tasks', handleNewNurseTasks);
    socket.on('investigation:new_request', handleInvestigationNew);
    socket.on('opd_queue:status_changed', handleDoctorQueueUpdated);

    return () => {
      socket.off('workflow:notification', handleWorkflowNotification);
      socket.off('workflow:new_nurse_tasks', handleNewNurseTasks);
      socket.off('investigation:new_request', handleInvestigationNew);
      socket.off('opd_queue:status_changed', handleDoctorQueueUpdated);
    };
  }, [socket, addToast]);

  const handleToastClick = (toast) => {
    if (toast.linkedPath) {
      navigate(formatTenantPath(toast.linkedPath));
    }
    removeToast(toast.id);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3">
      {toasts.map((toast) => {
        const deptMeta = getDepartmentMeta(toast);

        return (
          <div
            key={toast.id}
            className="pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl transition-all duration-300 transform hover:scale-[1.02] flex items-start gap-3 animate-fade-in cursor-pointer group"
            onClick={() => handleToastClick(toast)}
          >
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 mt-0.5">
              {getNotificationIcon(toast)}
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${deptMeta.badgeClass}`}>
                    {deptMeta.name}
                  </span>
                  <h4 className="text-xs font-black text-white truncate tracking-tight group-hover:text-indigo-300 transition-colors">
                    {toast.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeToast(toast.id);
                  }}
                  className="text-slate-400 hover:text-white p-0.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug line-clamp-2">
                {toast.message}
              </p>
              {toast.linkedPath && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-indigo-400 group-hover:text-indigo-300">
                  <span>Open {deptMeta.name} Desk</span>
                  <ExternalLink size={10} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LiveToastNotification;
