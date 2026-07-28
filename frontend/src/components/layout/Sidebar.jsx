import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ROLE_NAVIGATION, ROLE_NAMES } from '../../utils/constants';
import * as Icons from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const location = useLocation();
  const menuItems = user?.role ? ROLE_NAVIGATION[user.role] || [] : [];

  // Determine active item: match full path + search string
  const isItemActive = (itemPath) => {
    const [itemPathname, itemSearch] = itemPath.split('?');
    const currentSearch = location.search.replace('?', '');
    if (itemSearch) {
      // Item has a query string — match both pathname AND query string exactly
      return location.pathname === itemPathname && currentSearch === itemSearch;
    }
    // No query string on item — active only when pathname matches AND no tab param is set
    return location.pathname === itemPathname && !location.search.includes('tab=');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
        ></div>
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-sky-500/25">
              H
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight leading-none block">HPMBS</span>
              <span className="text-[10px] text-sky-400 font-semibold tracking-wider uppercase">Enterprise SaaS</span>
            </div>
          </div>
        </div>

        {/* Role Identity Badge */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
          <p className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Active Role</p>
          <p className="font-bold text-sky-400 mt-0.5 truncate">{ROLE_NAMES[user?.role] || user?.role}</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const IconComponent = Icons[item.icon] || Icons.Circle;
            const labelText = item.title || item.name || 'Navigation Item';
            const active = isItemActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-md shadow-sky-500/10 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <IconComponent size={18} className="shrink-0" />
                <span className="truncate">{labelText}</span>
              </Link>
            );
          })}
        </nav>

        {/* System Version Footer */}
        <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-500 text-center">
          <p>HPMBS v1.0.0 Enterprise</p>
          <p className="mt-0.5 text-[10px]">HIPAA & GDPR Compliant</p>
        </div>
      </aside>
    </>
  );
};
