/**
 * AvailabilityBanner — Reusable offline warning + toggle for all staff dashboards.
 *
 * Shows a prominent RED banner when a staff member is offline (isAvailable=false)
 * with a clear message and a one-click "Go Online" button.
 * Shows a subtle green banner when online confirming status.
 *
 * Usage:
 *   <AvailabilityBanner
 *     role="Nurse"
 *     isAvailable={isAvailable}
 *     isToggling={isToggling}
 *     onToggle={handleToggle}
 *     pendingCount={pendingTasksCount}
 *   />
 */
import React from 'react';
import { Lock, Power, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

export const AvailabilityBanner = ({
  role = 'Staff',
  isAvailable,
  isToggling = false,
  onToggle,
  pendingCount = 0,
}) => {
  if (isAvailable) {
    // Subtle online indicator with high-contrast, properly styled button
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 px-4 py-3 sm:px-5 sm:py-3 rounded-2xl bg-emerald-50/90 border-2 border-emerald-200 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 shrink-0 border border-emerald-300 shadow-2xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-extrabold text-emerald-950 text-sm tracking-tight">You are ONLINE</span>
            <span className="text-slate-300 hidden sm:inline">&bull;</span>
            <span className="text-emerald-800 font-medium">You will receive new patient assignments and workflow tasks</span>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black shadow-2xs">
                {pendingCount} pending
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={isToggling}
          onClick={onToggle}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border-2 border-rose-200 hover:border-rose-300 shadow-sm transition-all active:scale-[0.97] cursor-pointer disabled:opacity-50 shrink-0 self-end sm:self-auto"
          title="Mark yourself as unavailable / offline"
        >
          {isToggling ? (
            <span className="inline-block animate-spin w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full" />
          ) : (
            <Power size={14} className="text-rose-600 shrink-0" />
          )}
          <span>Go Offline</span>
        </button>
      </div>
    );
  }

  // Offline — prominent warning with high-contrast button
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-rose-50 via-rose-50/90 to-amber-50/40 border-2 border-rose-200 shadow-sm animate-fade-in">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-rose-100/90 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
          <Lock size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
            <p className="font-black text-rose-900 text-sm tracking-tight">
              You are OFFLINE &bull; Unavailable for new {role} assignments
            </p>
          </div>
          <p className="text-xs text-rose-700/90 font-medium mt-0.5">
            {pendingCount > 0 ? (
              <>
                <AlertTriangle size={12} className="inline mr-1 text-amber-600 font-bold" />
                You have <strong className="text-rose-900 font-extrabold">{pendingCount} pending item(s)</strong> from before going offline. Please attend to them or contact your supervisor.
              </>
            ) : (
              'No new tasks, prescriptions, or requests will be routed to you while offline. Go online when you are ready.'
            )}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={isToggling}
        onClick={onToggle}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md transition-all active:scale-[0.97] cursor-pointer disabled:opacity-50 shrink-0 self-end sm:self-auto"
      >
        {isToggling ? (
          <span className="inline-block animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
        ) : (
          <Wifi size={14} className="shrink-0" />
        )}
        <span>Go Online Now</span>
      </button>
    </div>
  );
};
