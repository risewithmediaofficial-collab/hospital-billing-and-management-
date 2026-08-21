import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useSocket } from '../../providers/SocketProvider';
import { useAvailability } from '../../hooks/useAvailability';
import { useWorkspaceModeStore } from '../../store/workspaceModeStore';
import { ROLE_NAMES } from '../../utils/constants';
import { LogOut, Bell, Building2, User, Menu, Wifi, WifiOff, Stethoscope, StickyNote, ChevronDown, MessageSquare, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';
import { NotificationDropdown } from './NotificationDropdown';
import { UserProfilePopover } from './UserProfilePopover';
import { useTeamChatStore } from '../../store/teamChatStore';

export const Navbar = ({ onToggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { currentMode, setMode, isDualModeEligible } = useWorkspaceModeStore();
  const isGuardianView = location.pathname.includes('/guardian') || user?.role === 'GUARDIAN';
  const { socket } = useSocket();
  const { unreadCount, notifications, fetchNotifications } = useNotificationStore();
  // Bell badge = number of UNREAD notifications only. 0 = nothing to read.
  const notificationCount = unreadCount || 0;
  const { isAvailable, isToggling, handleToggle } = useAvailability();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const canSetAvailability = user && !['PATIENT', 'GUARDIAN', 'SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(user.role);

  const handleSwitchMode = (targetMode) => {
    setMode(targetMode);
    const domainFromPath = location.pathname.split('/')[1];
    const isKnownNonTenant = ['admin', 'hospital-admin', 'doctor', 'reception', 'billing', 'pharmacy', 'laboratory', 'radiology', 'nursing', '403', 'login', 'reset-password'].includes(domainFromPath);
    const domain = user?.hospitalDomain || (!isKnownNonTenant && domainFromPath ? domainFromPath : null);

    if (targetMode === 'WORK') {
      const target = domain ? `/${domain}/doctor/dashboard` : '/doctor/dashboard';
      navigate(target);
    } else if (targetMode === 'ADMIN') {
      if (user?.role === 'SUPER_ADMIN') {
        navigate('/admin/dashboard');
      } else {
        const target = domain ? `/${domain}/admin/dashboard` : '/hospital-admin/dashboard';
        navigate(target);
      }
    }
  };

  useEffect(() => {
    if (!user?.id && !user?._id) return;
    fetchNotifications();
    if (!socket) return;
    const refresh = () => fetchNotifications();
    socket.on('workflow:notification', refresh);
    socket.on('workflow:new_nurse_tasks', refresh);
    socket.on('nurse_task:created', refresh);
    socket.on('nurse_task:updated', refresh);
    socket.on('investigation:new_request', refresh);
    socket.on('opd_queue:status_changed', refresh);
    socket.on('notification:created', refresh);
    socket.on('notification:cleared', refresh);
    socket.on('notification:read', refresh);
    socket.on('queue:patient_added', refresh);
    socket.on('token:generated', refresh);
    socket.on('appointment:created', refresh);
    socket.on('patient_request:created', refresh);
    socket.on('patient_request:updated', refresh);
    socket.on('workflow:pending_changed', refresh);
    return () => {
      socket.off('workflow:notification', refresh);
      socket.off('workflow:new_nurse_tasks', refresh);
      socket.off('nurse_task:created', refresh);
      socket.off('nurse_task:updated', refresh);
      socket.off('investigation:new_request', refresh);
      socket.off('opd_queue:status_changed', refresh);
      socket.off('notification:created', refresh);
      socket.off('notification:cleared', refresh);
      socket.off('notification:read', refresh);
      socket.off('queue:patient_added', refresh);
      socket.off('token:generated', refresh);
      socket.off('appointment:created', refresh);
      socket.off('patient_request:created', refresh);
      socket.off('patient_request:updated', refresh);
      socket.off('workflow:pending_changed', refresh);
    };
  }, [user?.id, user?._id, socket]);

  const hasNotificationsPermission = (() => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.role === 'HOSPITAL_ADMIN') return true;
    const permissions = user.permissions || {};
    if (permissions['*']?.includes('*') || permissions['*']?.includes('view')) return true;
    const notif = permissions.notifications;
    if (Array.isArray(notif) && notif.length > 0) return true;
    if (typeof notif === 'object' && notif !== null && (notif.view || notif['*'])) return true;
    // By default, all authenticated hospital staff have notification access
    return !['PATIENT', 'GUARDIAN'].includes(user.role);
  })();

  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-sm">
      {/* Left: Hamburger + Hospital & Branch Switcher Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden text-slate-500 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        {user?.role === 'SUPER_ADMIN' ? (
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex-shrink-0">
              <Building2 size={17} />
            </div>
            <div className="hidden sm:block min-w-0">
              <h1 className="text-sm font-bold text-slate-800 leading-none truncate max-w-[180px] lg:max-w-xs">
                Super Admin Console
              </h1>
              <span className="text-[11px] text-slate-400 font-medium truncate block">
                Platform Control
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 p-1.5 -ml-1.5 rounded-xl text-left">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex-shrink-0">
              <Building2 size={17} />
            </div>
            <div className="hidden sm:block min-w-0">
              <h1 className="text-sm font-bold text-slate-800 leading-none truncate max-w-[180px] lg:max-w-xs">
                {user?.hospitalName || 'Healthcare System'}
              </h1>
              <span className="text-[11px] text-slate-400 font-medium truncate block">
                Hospital Portal
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Center: Dual-Mode Switcher for Multi-Role / Hospital Admin */}
      {isDualModeEligible(user) && (
        <div className="flex items-center p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl shadow-2xs">
          <button
            type="button"
            onClick={() => handleSwitchMode('WORK')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
              currentMode === 'WORK'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title="Switch to Clinical, Front Desk & Billing Workstations"
          >
            <Stethoscope size={14} className={currentMode === 'WORK' ? 'text-white' : 'text-indigo-600'} />
            <span className="hidden sm:inline">Work Mode</span>
            <span className="sm:hidden">Work</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchMode('ADMIN')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
              currentMode === 'ADMIN'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title="Switch to Hospital Admin, Staff Roles & Tariffs"
          >
            <Building2 size={14} className={currentMode === 'ADMIN' ? 'text-white' : 'text-slate-600'} />
            <span className="hidden sm:inline">Admin Mode</span>
            <span className="sm:hidden">Admin</span>
          </button>
        </div>
      )}

      {/* Right: Notifications + User Info + Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {canSetAvailability && (
          <button
            type="button"
            onClick={handleToggle}
            disabled={isToggling}
            className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg border text-[11px] font-bold transition-colors disabled:opacity-60 ${isAvailable ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200' : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'}`}
            title={isAvailable ? 'Available — click to go offline' : 'Unavailable — click to go online'}
          >
            {isAvailable ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className="hidden sm:inline">{isToggling ? 'Updating…' : (isAvailable ? 'Available' : 'Unavailable')}</span>
          </button>
        )}


        {/* Rapid Emergency Trigger Button */}
        {user && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('open-emergency-modal'))}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[11px] font-extrabold shadow-sm transition-all cursor-pointer border border-rose-500"
            title="Raise Emergency / Code Blue Broadcast"
          >
            <ShieldAlert size={14} className="animate-pulse" />
            <span className="hidden sm:inline">Emergency</span>
          </button>
        )}

        {/* Hospital Staff Team Chat Button */}
        {user && !['PATIENT', 'GUARDIAN'].includes(user.role) && (
          <button
            type="button"
            onClick={() => useTeamChatStore.getState().toggleOpen()}
            className="relative p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all duration-150 flex items-center justify-center cursor-pointer"
            aria-label="Hospital Team Chat"
            title="Hospital Staff Team Chat & Communication"
          >
            <MessageSquare size={18} />
            {useTeamChatStore.getState().unreadTotal > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                {useTeamChatStore.getState().unreadTotal}
              </span>
            )}
          </button>
        )}

        {/* Notification Bell */}
        {hasNotificationsPermission && (
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all duration-150 flex items-center justify-center"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={18} />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black bg-amber-500 text-white flex items-center justify-center shadow-xs animate-pulse">
                  {notificationCount}
                </span>
              )}
            </button>

            <NotificationDropdown isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
          </div>
        )}

        {/* User Identity & Profile Popover Trigger */}
        <div className="relative flex items-center pl-2.5 border-l border-slate-200">
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-slate-100 transition-colors group cursor-pointer text-left select-none"
            title="Click to view user profile, assigned roles & status"
          >
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-slate-800 leading-none group-hover:text-indigo-600 transition-colors">
                {user?.name}
              </p>
              <p className="text-[11px] font-semibold text-indigo-500 mt-0.5">
                {isGuardianView ? 'Guardian Portal' : (ROLE_NAMES[user?.role] || user?.role)}
              </p>
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-indigo-600 group-hover:bg-indigo-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm transition-transform group-hover:scale-105">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
            </div>

            <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-700 transition-transform hidden sm:block" />
          </button>

          {/* Profile Popover */}
          <UserProfilePopover isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

          {/* Quick Logout Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="hidden sm:flex items-center gap-1.5 ml-2"
          >
            <LogOut size={14} />
            <span className="hidden md:inline">Logout</span>
          </Button>

          {/* Mobile-only icon logout */}
          <button
            onClick={logout}
            className="sm:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors ml-1"
            aria-label="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
