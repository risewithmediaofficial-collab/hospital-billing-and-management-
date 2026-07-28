import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { ROLE_NAMES } from '../../utils/constants';
import { LogOut, Bell, Building2, User } from 'lucide-react';
import { Button } from '../ui/Button';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuthStore();

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">
              {user?.branchName || 'Metro General Hospital'}
            </h1>
            <span className="text-[11px] text-slate-400">
              {user?.hospitalName || 'Central Branch'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-sky-500 animate-ping"></span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-200 leading-none">{user?.name}</p>
            <p className="text-[11px] font-medium text-sky-400 mt-1">
              {ROLE_NAMES[user?.role] || user?.role}
            </p>
          </div>

          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md border border-sky-400/30">
            {user?.name ? user.name.charAt(0).toUpperCase() : <User size={18} />}
          </div>

          <Button variant="outline" size="sm" onClick={logout} className="ml-2">
            <LogOut size={16} />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
