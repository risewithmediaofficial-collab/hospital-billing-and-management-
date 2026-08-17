import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { LogOut, Bell, Menu, Shield } from 'lucide-react';
import { Button } from '../ui/Button';
import { NotificationDropdown } from './NotificationDropdown';
import { SuperAdminSidebar } from './SuperAdminSidebar';
import { HospitalSelector } from '../superadmin/HospitalSelector';
import { GlobalSearchBar } from '../superadmin/GlobalSearchBar';
import { useSocket } from '../../providers/SocketProvider';

export const SuperAdminLayout = ({ children, noPadding = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { socket } = useSocket();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const { hospitalId } = useParams();
  const location = useLocation();
  const mainRef = useRef(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    fetchNotifications();
    if (!socket) return;
    const refresh = () => fetchNotifications();
    socket.on('workflow:notification', refresh);
    return () => socket.off('workflow:notification', refresh);
  }, [socket]);

  const isDrilldown = Boolean(hospitalId);

  return (
    <div className="h-screen max-h-screen flex bg-slate-100 text-slate-900 overflow-hidden">
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        drilldownHospitalId={hospitalId || null}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-200 bg-white shrink-0 px-4 sm:px-6 flex items-center justify-between gap-3 shadow-sm z-30">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-slate-500 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Toggle sidebar"
            >
              <Menu size={20} />
            </button>

            <div className="hidden md:flex items-center gap-2 shrink-0">
              <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600 border border-violet-100">
                <Shield size={17} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-800 leading-none">Super Admin Console</h1>
                <span className="text-[11px] text-slate-400 font-medium">Unrestricted Platform Access</span>
              </div>
            </div>

            <div className="hidden lg:block flex-1 max-w-md mx-4">
              <GlobalSearchBar />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <HospitalSelector compact />

            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black bg-amber-500 text-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              <NotificationDropdown isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
            </div>

            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{user?.name}</p>
              <p className="text-[10px] text-violet-600 font-semibold">Super Admin</p>
            </div>

            <Button variant="outline" size="sm" onClick={logout} className="hidden sm:flex">
              <LogOut size={14} /> Logout
            </Button>
          </div>
        </header>

        <div className="lg:hidden px-4 py-2 border-b border-slate-200 bg-white">
          <GlobalSearchBar />
        </div>

        <main ref={mainRef} className={`flex-1 min-h-0 overflow-y-auto ${noPadding ? 'p-0' : 'p-6'}`}>{children}</main>
      </div>

    </div>
  );
};
