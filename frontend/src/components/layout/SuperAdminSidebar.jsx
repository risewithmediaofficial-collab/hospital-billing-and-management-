import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { SUPER_ADMIN_NAVIGATION, HOSPITAL_DRILLDOWN_NAVIGATION } from '../../utils/superAdminNavigation';
import { useSuperAdminContextStore } from '../../store/superAdminContextStore';

export const SuperAdminSidebar = ({ isOpen, onClose, drilldownHospitalId = null }) => {
  const location = useLocation();
  const { selectedHospitalName } = useSuperAdminContextStore();

  const menuItems = drilldownHospitalId
    ? HOSPITAL_DRILLDOWN_NAVIGATION(drilldownHospitalId)
    : SUPER_ADMIN_NAVIGATION;

  const isItemActive = (itemPath) => {
    const [itemPathname, itemSearch] = itemPath.split('?');
    const currentSearch = location.search.replace('?', '');
    if (itemSearch) {
      return location.pathname === itemPathname && currentSearch === itemSearch;
    }
    return location.pathname === itemPathname || location.pathname.startsWith(`${itemPathname}/`);
  };

  return (
    <>
      {isOpen && (
        <div onClick={onClose} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" aria-hidden="true" />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 shadow-lg lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200 flex-shrink-0 bg-white">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0 shadow-sm">
            SA
          </div>
          <div className="min-w-0">
            <span className="font-extrabold text-slate-800 text-sm tracking-tight leading-none block">Super Admin</span>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Platform Control</span>
          </div>
        </div>

        {drilldownHospitalId && (
          <div className="px-3 pt-3 pb-1">
            <div className="px-3 py-2.5 rounded-lg bg-violet-50 border border-violet-100 text-xs">
              <p className="text-violet-400 uppercase tracking-wider text-[10px] font-bold">Hospital Context</p>
              <p className="font-bold text-violet-700 mt-0.5 truncate text-sm">{selectedHospitalName || 'Hospital'}</p>
            </div>
          </div>
        )}

        <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Navigation</p>

        <nav className="flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto" aria-label="Super Admin navigation">
          {menuItems.map((item) => {
            const IconComponent = Icons[item.icon] || Icons.Circle;
            const active = isItemActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 border-l-2 ${
                  active
                    ? 'bg-violet-50 text-violet-700 font-semibold border-l-violet-500'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-transparent'
                }`}
              >
                <IconComponent size={16} className={`shrink-0 ${active ? 'text-violet-500' : 'text-slate-400'}`} />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 flex-shrink-0 bg-slate-50">
          <p className="text-[11px] text-slate-400 font-medium text-center">HPMBS Super Admin · Full Access</p>
        </div>
      </aside>
    </>
  );
};
