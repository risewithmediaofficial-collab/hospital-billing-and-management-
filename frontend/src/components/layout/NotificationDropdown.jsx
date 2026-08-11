import React, { useRef, useEffect } from 'react';
import { useDepartmentNotificationStore } from '../../store/departmentNotificationStore';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Clock, FileCheck2, ChevronRight, Inbox
} from 'lucide-react';

export const NotificationDropdown = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { notifications, unreadCount } = useDepartmentNotificationStore();
  const dropdownRef = useRef(null);

  // Close when clicking outside dropdown container
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentNotifs = notifications;

  const handleNotificationClick = (notif) => {
    onClose();
    const isGuardianView = window.location.pathname.includes('/guardian') || (notif.targetRole === 'GUARDIAN');
    if (isGuardianView) {
      navigate('/guardian-portal/dashboard');
      return;
    }
    if (notif.linkedPath && !notif.linkedPath.includes('/admin') && !notif.linkedPath.includes('/doctor')) {
      navigate(notif.linkedPath);
    } else if (notif.linkedPath) {
      navigate(notif.linkedPath);
    } else {
      navigate('/doctor/dashboard?tab=DEPT_RESPONSES');
    }
  };

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
            <h3 className="font-bold text-sm leading-tight">Notifications Center</h3>
            <p className="text-[10px] text-slate-300">Real-time department responses & diagnostic alerts</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-xs">
            {unreadCount} New
          </span>
        )}
      </div>

      {/* Pending work summary */}
      <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
        <span className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xs">
          Pending work ({notifications.length})
        </span>
        <span className="text-[10px] text-slate-500 font-medium">Clears only when work is processed</span>
      </div>

      {/* Notification List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
        {currentNotifs.length > 0 ? (
          currentNotifs.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-3.5 cursor-pointer transition-all hover:bg-indigo-50/50 flex items-start justify-between gap-3 text-xs ${
                !notif.isRead ? 'bg-indigo-50/30' : 'bg-white'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  !notif.isRead ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  <FileCheck2 size={16} />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-900 text-xs truncate">{notif.title}</span>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                    )}
                  </div>
                  <p className="font-semibold text-slate-700 text-[11px] truncate">
                    Patient: {notif.patientName} ({notif.uhid})
                  </p>
                  {notif.message && (
                    <p className="text-slate-500 text-[10px] line-clamp-2">{notif.message}</p>
                  )}
                  <p className="text-[9px] text-slate-400 font-medium flex items-center gap-1 pt-0.5">
                    <Clock size={10} />
                    {notif.timestamp ? new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </p>
                </div>
              </div>

              <ChevronRight size={14} className="text-slate-400 shrink-0 self-center" />
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <Inbox size={28} className="mx-auto text-slate-300" />
            <p className="font-bold text-xs text-slate-600">
              No Pending Work
            </p>
            <p className="text-[10px]">
              All assigned work has been processed.
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
