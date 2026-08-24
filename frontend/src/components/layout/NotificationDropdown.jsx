import React, { useRef, useEffect, useState } from 'react';
import { useNotificationStore, isUnauthorizedForRole } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Clock, FileCheck2, ChevronRight, Inbox, X, Trash2, CheckCircle2,
  AlertTriangle, Flame, ShieldAlert, Sparkles, ExternalLink, Check
} from 'lucide-react';

export const NotificationDropdown = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const {
    notifications,
    historyNotifications,
    unreadCount,
    activeCount,
    historyCount,
    activeTab,
    setActiveTab,
    fetchNotifications,
    fetchHistory,
    markAsRead,
    markAsCompleted,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
  } = useNotificationStore();
  const { user } = useAuthStore();
  const dropdownRef = useRef(null);

  // Default dashboard per role as fallback
  const defaultRoleDashboard = {
    PHARMACIST: '/pharmacy/dashboard',
    PHARMACY_STAFF: '/pharmacy/dashboard',
    LAB_TECH: '/laboratory/dashboard',
    LABORATORY_STAFF: '/laboratory/dashboard',
    RADIOLOGIST: '/radiology/dashboard',
    RADIOLOGY_STAFF: '/radiology/dashboard',
    CASHIER: '/billing/dashboard',
    BILLING_STAFF: '/billing/dashboard',
    NURSE: '/nursing/requests',
    NURSE_INCHARGE: '/nurse-incharge/dashboard',
    RECEPTIONIST: '/reception/tokens',
    OPD_STAFF: '/reception/tokens',
    DOCTOR: '/doctor/dashboard?tab=DEPT_RESPONSES',
    GUARDIAN: '/guardian-portal/dashboard',
    PATIENT: '/patient-portal',
    HOSPITAL_ADMIN: '/admin/dashboard',
    SUPER_ADMIN: '/admin/hospitals',
  };

  const formatTenantPath = (path) => {
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
  };

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Fetch live notifications on opening dropdown & close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onCloseRef.current?.();
      }
    };
    if (isOpen) {
      fetchNotifications(activeTab === 'HISTORY' ? 'history' : 'active');
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleNotificationClick = async (notif) => {
    await markAsRead(notif.id);
    onClose();
    const isGuardianView = window.location.pathname.includes('/guardian') || user?.role === 'GUARDIAN';
    if (isGuardianView) {
      navigate('/guardian-portal/dashboard');
      return;
    }

    // Build the target path — start from linkedPath or targetRoute stored in DB
    let target = notif.linkedPath || notif.targetRoute || notif.link || '';

    // Enrich with entity IDs from metadata so the target page can auto-select the record
    if (target) {
      const meta = notif.metadata || {};
      const params = new URLSearchParams();

      // Preserve any existing query params already in the target path
      const [basePath, existingQuery] = target.split('?');
      if (existingQuery) {
        new URLSearchParams(existingQuery).forEach((v, k) => params.set(k, v));
      }

      // Append entity IDs from metadata or top-level fields
      const orderId = meta.orderId || notif.relatedTaskId;
      const patientId = meta.patientId || notif.relatedPatientId;
      const appointmentId = meta.appointmentId;
      const invoiceId = meta.invoiceId;
      const taskId = meta.taskId;
      const substitutionId = meta.substitutionId;

      if (orderId && !params.has('orderId')) params.set('orderId', orderId);
      if (patientId && !params.has('patientId')) params.set('patientId', patientId);
      if (appointmentId && !params.has('appointmentId')) params.set('appointmentId', appointmentId);
      if (invoiceId && !params.has('invoiceId')) params.set('invoiceId', invoiceId);
      if (taskId && !params.has('taskId')) params.set('taskId', taskId);
      if (substitutionId && !params.has('substitutionId')) params.set('substitutionId', substitutionId);

      const queryStr = params.toString();
      target = queryStr ? `${basePath}?${queryStr}` : basePath;
    }

    const userRole = user?.role || 'GUEST';
    const userRoles = [
      userRole,
      ...(Array.isArray(user?.additionalRoles) ? user.additionalRoles : []),
    ].filter(Boolean);

    // Verify target path matches any of user's active/additional role prefixes
    const rolePrefixes = {
      PHARMACIST: ['/pharmacy', '/emergency'],
      PHARMACY_STAFF: ['/pharmacy', '/emergency'],
      LAB_TECH: ['/laboratory', '/emergency'],
      LABORATORY_STAFF: ['/laboratory', '/emergency'],
      RADIOLOGIST: ['/radiology', '/emergency'],
      RADIOLOGY_STAFF: ['/radiology', '/emergency'],
      CASHIER: ['/billing', '/emergency'],
      BILLING_STAFF: ['/billing', '/emergency'],
      NURSE: ['/nursing', '/nurse-incharge', '/emergency'],
      NURSE_INCHARGE: ['/nursing', '/nurse-incharge', '/emergency'],
      RECEPTIONIST: ['/reception', '/emergency'],
      OPD_STAFF: ['/reception', '/emergency'],
      DOCTOR: ['/doctor', '/emergency', '/reception'],
      HOSPITAL_ADMIN: ['/admin', '/hospital-admin', '/doctor', '/reception', '/billing', '/pharmacy', '/laboratory', '/radiology', '/nursing', '/nurse-incharge', '/emergency'],
      SUPER_ADMIN: ['/admin', '/hospital-admin', '/emergency'],
    };

    const allowedPrefixes = userRoles.flatMap((r) => rolePrefixes[r] || ['/']);
    const isAllowedPath = target && allowedPrefixes.some((prefix) => target.includes(prefix));

    if (isAllowedPath) {
      navigate(formatTenantPath(target));
    } else {
      const fallback = defaultRoleDashboard[userRole] || '/';
      navigate(formatTenantPath(fallback));
    }
  };

  const currentList = activeTab === 'HISTORY' ? historyNotifications : notifications;

  // Filter unauthorized and deduplicate
  const displayNotifications = currentList.filter((notif, index, self) => {
    if (isUnauthorizedForRole(notif, user?.role, user?.additionalRoles)) {
      return false;
    }
    const key = `${notif.title || ''}|${notif.message || ''}|${notif.relatedTaskId || ''}|${notif.createdAt ? new Date(notif.createdAt).getMinutes() : ''}`;
    return index === self.findIndex((t) => (
      t.id === notif.id || `${t.title || ''}|${t.message || ''}|${t.relatedTaskId || ''}|${t.createdAt ? new Date(t.createdAt).getMinutes() : ''}` === key
    ));
  });

  const getDeptBadge = (item) => {
    const target = (item.linkedPath || item.targetRoute || item.link || '').toLowerCase();
    const type = String(item.type || item.notificationType || '').toUpperCase();
    const title = String(item.title || '').toUpperCase();

    if (target.includes('/emergency') || type.includes('EMERGENCY') || title.includes('EMERGENCY')) {
      return { label: 'EMERGENCY', color: 'bg-rose-100 text-rose-800 border-rose-200' };
    }
    if (target.includes('/laboratory') || type.includes('LAB') || title.includes('LAB')) {
      return { label: 'LABORATORY', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' };
    }
    if (target.includes('/radiology') || type.includes('RADIOLOGY') || title.includes('SCAN')) {
      return { label: 'RADIOLOGY', color: 'bg-teal-100 text-teal-800 border-teal-200' };
    }
    if (target.includes('/pharmacy') || type.includes('PHARMACY') || title.includes('PRESCRIPTION') || title.includes('MEDICINE')) {
      return { label: 'PHARMACY', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
    if (target.includes('/billing') || type.includes('BILL') || title.includes('BILL') || title.includes('INVOICE') || title.includes('PAYMENT')) {
      return { label: 'CENTRAL BILLING', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }
    if (target.includes('/nurse') || target.includes('/nursing') || type.includes('NURSE') || title.includes('NURSE') || title.includes('ADMISSION')) {
      return { label: 'INPATIENT / NURSING', color: 'bg-pink-100 text-pink-800 border-pink-200' };
    }
    if (target.includes('/doctor') || type.includes('PATIENT_QUEUED') || title.includes('PATIENT')) {
      return { label: 'CLINICAL EMR', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
    }
    if (target.includes('/reception') || title.includes('RECEPTION') || title.includes('TOKEN')) {
      return { label: 'RECEPTION', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    }
    return { label: 'DEPARTMENT ALERT', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  const getPriorityBadge = (priority) => {
    const p = String(priority || 'NORMAL').toUpperCase();
    if (p === 'EMERGENCY') {
      return <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-600 text-white animate-pulse">EMERGENCY</span>;
    }
    if (p === 'URGENT' || p === 'HIGH') {
      return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-white">URGENT</span>;
    }
    return null;
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-12 w-84 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fade-in text-slate-900 flex flex-col max-h-[85vh]"
    >
      {/* Header */}
      <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
            <Bell size={16} />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
              {user?.role === 'SUPER_ADMIN' ? 'Platform Control Center' : 'Notification & Task Center'}
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white">
                  {unreadCount} New
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Targeted workflow tasks & clinical alerts
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Dual Tab Switcher */}
      <div className="p-2 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5">
        <button
          onClick={() => {
            setActiveTab('ACTIVE');
            fetchNotifications('active');
          }}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'ACTIVE'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Sparkles size={13} className={activeTab === 'ACTIVE' ? 'text-indigo-600' : 'text-slate-400'} />
          Active Tasks
          {activeCount > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === 'ACTIVE' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {activeCount}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('HISTORY');
            fetchHistory();
          }}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'HISTORY'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Clock size={13} className={activeTab === 'HISTORY' ? 'text-indigo-600' : 'text-slate-400'} />
          Activity History
          {historyCount > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === 'HISTORY' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {historyCount}
            </span>
          )}
        </button>
      </div>

      {/* Action Toolbar */}
      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px]">
        <span className="text-slate-500 font-semibold">
          {activeTab === 'ACTIVE' ? `${displayNotifications.length} Active Tasks` : `${displayNotifications.length} Past Activity Logs`}
        </span>
        <div className="flex items-center gap-2">
          {activeTab === 'ACTIVE' && unreadCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                markAllAsRead();
              }}
              className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Mark all read
            </button>
          )}
          {displayNotifications.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearAllNotifications();
              }}
              className="font-bold text-rose-600 hover:text-rose-800 flex items-center gap-0.5 transition-colors"
            >
              <Trash2 size={11} /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="overflow-y-auto divide-y divide-slate-100 flex-1 max-h-96">
        {displayNotifications.length > 0 ? (
          displayNotifications.map((notif) => {
            const isSuperAdmin = user?.role === 'SUPER_ADMIN';
            const hasValidPatient = notif.patientName && notif.patientName !== 'Patient' && notif.patientName !== 'undefined' && notif.uhid && notif.uhid !== 'N/A';
            const deptBadge = getDeptBadge(notif);
            const priorityBadge = getPriorityBadge(notif.priority);

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 cursor-pointer transition-all hover:bg-indigo-50/50 flex flex-col gap-2 ${
                  !notif.isRead ? 'bg-indigo-50/25' : 'bg-white'
                }`}
              >
                {/* Top row: Badges, Title, Priority & Dismiss */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-black tracking-wide border ${deptBadge.color}`}>
                      {deptBadge.label}
                    </span>
                    {priorityBadge}
                    <span className="font-extrabold text-slate-900 text-xs truncate">
                      {notif.title}
                    </span>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Unread" />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearNotification(notif.id);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 -mt-1 -mr-1"
                    title="Dismiss"
                    aria-label="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Patient Information if available */}
                {!isSuperAdmin && hasValidPatient && (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100/70 px-2 py-0.5 rounded-md w-fit">
                    <span>Patient:</span>
                    <span className="text-slate-900 font-bold">{notif.patientName}</span>
                    <span className="text-slate-500 font-mono text-[10px]">({notif.uhid})</span>
                  </div>
                )}

                {/* Message Body */}
                {notif.message && (
                  <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">
                    {notif.message}
                  </p>
                )}

                {/* Card Footer: Timestamp & Action Controls */}
                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-medium border-t border-slate-100/80">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {notif.timestamp ? new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {activeTab === 'ACTIVE' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleNotificationClick(notif)}
                          className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center gap-1 transition-colors border border-indigo-200"
                        >
                          <ExternalLink size={10} /> Take Action
                        </button>
                        <button
                          type="button"
                          onClick={() => markAsCompleted(notif.id)}
                          className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center gap-1 transition-colors border border-emerald-200"
                          title="Mark task completed"
                        >
                          <Check size={10} /> Done
                        </button>
                      </>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] flex items-center gap-1 border border-emerald-200">
                        <CheckCircle2 size={10} /> Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <Inbox size={32} className="mx-auto text-slate-300" />
            <p className="font-bold text-xs text-slate-700">
              {activeTab === 'ACTIVE' ? 'All Caught Up!' : 'No Activity History'}
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              {activeTab === 'ACTIVE'
                ? 'You have no pending tasks or unread clinical alerts.'
                : 'Completed workflow milestones and archived events will appear here.'}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
        <span className="text-[10px] text-slate-400 font-medium">
          {user?.name} &bull; {user?.role}
        </span>
        <button
          onClick={onClose}
          className="text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          Close
        </button>
      </div>
    </div>
  );
};
