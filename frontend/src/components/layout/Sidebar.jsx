import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../providers/SocketProvider';
import { useNotificationStore } from '../../store/notificationStore';
import { axiosClient } from '../../api/axiosClient';
import { ROLE_NAVIGATION, ROLE_NAMES } from '../../utils/constants';
import * as Icons from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const { unreadCount, addNotification, fetchInitialNotifications } = useNotificationStore();
  const location = useLocation();
  const menuItems = user?.role ? ROLE_NAVIGATION[user.role] || [] : [];

  const [totalReceiptsCount, setTotalReceiptsCount] = useState(0);

  useEffect(() => {
    if (user?.role !== 'DOCTOR') return;

    fetchInitialNotifications();

    if (socket) {
      const handleReportReady = (data) => {
        addNotification({
          orderId: data.orderId,
          patientId: data.patientId,
          patientName: data.patientName,
          uhid: data.uhid,
          testName: data.testName,
          status: data.status || 'COMPLETED',
          title: `Report Ready: ${data.testName || 'Diagnostic Scan'}`,
          message: data.reportSummary || `Diagnostic scan results ready for ${data.patientName || 'patient'}.`,
        });
      };

      socket.on('diagnostics:report_ready', handleReportReady);
      socket.on('investigation:status_updated', handleReportReady);
      return () => {
        socket.off('diagnostics:report_ready', handleReportReady);
        socket.off('investigation:status_updated', handleReportReady);
      };
    }
  }, [user, socket, addNotification, fetchInitialNotifications]);

  useEffect(() => {
    if (!user?.role || !['CASHIER', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(user.role)) return;

    const fetchReceiptsCount = async () => {
      try {
        const res = await axiosClient.get('/billing/receipts');
        const receipts = res.data || [];
        setTotalReceiptsCount(receipts.length);
      } catch (err) {}
    };

    fetchReceiptsCount();

    if (socket) {
      socket.on('billing:invoice_created', fetchReceiptsCount);
      return () => socket.off('billing:invoice_created', fetchReceiptsCount);
    }
  }, [user, socket]);

  const isItemActive = (itemPath) => {
    const [itemPathname, itemSearch] = itemPath.split('?');
    const currentSearch = location.search.replace('?', '');
    if (itemSearch) {
      return location.pathname === itemPathname && currentSearch === itemSearch;
    }
    return location.pathname === itemPathname && !location.search.includes('tab=');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 shadow-lg lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200 flex-shrink-0 bg-white">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0 shadow-sm">
            H
          </div>
          <div className="min-w-0">
            <span className="font-extrabold text-slate-800 text-sm tracking-tight leading-none block">
              HPMBS
            </span>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
              Enterprise SaaS
            </span>
          </div>
        </div>

        {/* Role Identity Badge */}
        <div className="px-3 pt-3 pb-1">
          <div className="px-3 py-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-xs">
            <p className="text-indigo-400 uppercase tracking-wider text-[10px] font-bold">
              Active Role
            </p>
            <p className="font-bold text-indigo-700 mt-0.5 truncate text-sm">
              {ROLE_NAMES[user?.role] || user?.role}
            </p>
          </div>
        </div>

        {/* Divider label */}
        <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Navigation
        </p>

        {/* Navigation Links */}
        <nav
          className="flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto"
          aria-label="Sidebar navigation"
        >
          {menuItems.map((item) => {
            const IconComponent = Icons[item.icon] || Icons.Circle;
            const label = item.title || item.name || 'Navigation Item';
            const active = isItemActive(item.path);
            const isDeptResponses = item.path.includes('tab=DEPT_RESPONSES');
            const isReceiptsHistory = item.path.includes('tab=RECEIPTS') || item.path.includes('/billing/receipts');
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 border-l-2 ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 font-semibold border-l-indigo-500'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <IconComponent
                    size={16}
                    className={`shrink-0 ${active ? 'text-indigo-500' : 'text-slate-400'}`}
                  />
                  <span className="truncate">{label}</span>
                </div>
                {isDeptResponses && unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-xs animate-pulse">
                    {unreadCount}
                  </span>
                )}
                {isReceiptsHistory && totalReceiptsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-2xs">
                    {totalReceiptsCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex-shrink-0 bg-slate-50">
          <p className="text-[11px] text-slate-400 font-medium text-center">
            HPMBS v1.0.0 &mdash; HIPAA Compliant
          </p>
        </div>
      </aside>
    </>
  );
};
