import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { ROLE_NAMES } from '../../utils/constants';
import { LogOut, Bell, Building2, User, Menu } from 'lucide-react';
import { Button } from '../ui/Button';
import { NotificationDropdown } from './NotificationDropdown';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-sm">
      {/* Left: Hamburger + Hospital Name */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden text-slate-500 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex-shrink-0">
            <Building2 size={17} />
          </div>
          <div className="hidden sm:block min-w-0">
            <h1 className="text-sm font-bold text-slate-800 leading-none truncate max-w-[180px] lg:max-w-xs">
              {user?.branchName || 'Metro General Hospital'}
            </h1>
            <span className="text-[11px] text-slate-400 font-medium truncate block">
              {user?.hospitalName || 'Central Branch'}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Notifications + User Info + Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all duration-150 flex items-center justify-center"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black bg-amber-500 text-white flex items-center justify-center shadow-xs animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          <NotificationDropdown isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
        </div>

        {/* User Identity */}
        <div className="flex items-center gap-2.5 pl-2.5 border-l border-slate-200">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-slate-800 leading-none">{user?.name}</p>
            <p className="text-[11px] font-semibold text-indigo-500 mt-0.5">
              {ROLE_NAMES[user?.role] || user?.role}
            </p>
          </div>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
          </div>

          {/* Logout */}
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="hidden sm:flex items-center gap-1.5"
          >
            <LogOut size={14} />
            <span className="hidden md:inline">Logout</span>
          </Button>

          {/* Mobile-only icon logout */}
          <button
            onClick={logout}
            className="sm:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
