import React, { useRef, useEffect } from 'react';
import { useNotificationStore, isUnauthorizedForRole } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Clock, FileCheck2, ChevronRight, Inbox, X, Trash2
} from 'lucide-react';

export const NotificationDropdown = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, clearNotification, clearAllNotifications } = useNotificationStore();
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
      useNotificationStore.getState().fetchNotifications();
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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

      if (orderId && !params.has('orderId')) params.set('orderId', orderId);
      if (patientId && !params.has('patientId')) params.set('patientId', patientId);
      if (appointmentId && !params.has('appointmentId')) params.set('appointmentId', appointmentId);
      if (invoiceId && !params.has('invoiceId')) params.set('invoiceId', invoiceId);

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

  // Deduplicate notifications by ID and content signature, and exclude unauthorized items for role
  const uniqueNotifications = notifications.filter((notif, index, self) => {
    if (isUnauthorizedForRole(notif, user?.role, user?.additionalRoles)) {
      return false;
    }

    const key = `${notif.title || ''}|${notif.message || ''}|${notif.relatedTaskId || ''}|${notif.createdAt ? new Date(notif.createdAt).getMinutes() : ''}`;
    return index === self.findIndex((t) => (
      t.id === notif.id || `${t.title || ''}|${t.message || ''}|${t.relatedTaskId || ''}|${t.createdAt ? new Date(t.createdAt).getMinutes() : ''}` === key
    ));
  });

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fade-in text-slate-900"
    >
      {/* Header */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
            <Bell size={16} />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">
              {user?.role === 'SUPER_ADMIN' ? 'Platform Control Center' : 'Notifications Center'}
            </h3>
            <p className="text-[10px] text-slate-300">
              {user?.role === 'SUPER_ADMIN' ? 'Hospital subscriptions, platform revenue & logins' : 'Real-time department responses & diagnostic alerts'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-xs">
            {unreadCount} New
          </span>
        )}
      </div>

      {/* Bell history controls. Pending-work badges are managed independently. */}
      <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
        <span className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xs">
          Notifications ({uniqueNotifications.length})
        </span>
        {uniqueNotifications.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearAllNotifications();
            }}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded border border-rose-200 transition-colors"
            title="Clear all notifications"
          >
            <Trash2 size={12} /> Clear All
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
        {uniqueNotifications.length > 0 ? (
          uniqueNotifications.map((notif) => {
            const isSuperAdmin = user?.role === 'SUPER_ADMIN';
            const hasValidPatient = notif.patientName && notif.patientName !== 'Patient' && notif.patientName !== 'undefined' && notif.uhid && notif.uhid !== 'N/A';

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

            const deptBadge = getDeptBadge(notif);

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 cursor-pointer transition-all hover:bg-indigo-50/50 flex items-start justify-between gap-2 text-xs ${
                  !notif.isRead ? 'bg-indigo-50/30' : 'bg-white'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    !notif.isRead ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <FileCheck2 size={16} />
                  </div>
                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-black tracking-wide border ${deptBadge.color}`}>
                        {deptBadge.label}
                      </span>
                      <span className="font-extrabold text-slate-900 text-xs truncate">{notif.title}</span>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                      )}
                    </div>
                    {!isSuperAdmin && hasValidPatient && (
                      <p className="font-semibold text-slate-700 text-[11px] truncate">
                        Patient: {notif.patientName} ({notif.uhid})
                      </p>
                    )}
                    {notif.message && (
                      <p className="text-slate-500 text-[10px] line-clamp-2">{notif.message}</p>
                    )}
                    <p className="text-[9px] text-slate-400 font-medium flex items-center gap-1 pt-0.5">
                      <Clock size={10} />
                      {notif.timestamp ? new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </p>
                  </div>
                </div>

              <div className="flex items-center gap-1 shrink-0 self-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearNotification(notif.id);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Dismiss notification"
                  aria-label="Dismiss notification"
                >
                  <X size={15} />
                </button>
                <ChevronRight size={14} className="text-slate-300" />
              </div>
            </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <Inbox size={28} className="mx-auto text-slate-300" />
            <p className="font-bold text-xs text-slate-600">
              No Notifications
            </p>
            <p className="text-[10px]">
              You have no new activity notifications.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
        <button
          onClick={onClose}
          className="text-xs font-bold text-slate-500 hover:text-slate-800"
        >
          Close Panel
        </button>
      </div>
    </div>
  );
};
