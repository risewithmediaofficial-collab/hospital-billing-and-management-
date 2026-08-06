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
import { Button } from '../ui/Button';

export const AvailabilityBanner = ({
  role = 'Staff',
  isAvailable,
  isToggling = false,
  onToggle,
  pendingCount = 0,
}) => {
  if (isAvailable) {
    // Subtle online indicator
    return (
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
          </span>
          <p className="text-xs font-bold text-emerald-700">
            You are <strong>ONLINE</strong> — You will receive new assignments and tasks.
          </p>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
              {pendingCount} pending
            </span>
          )}
        </div>
        <Button
          size="xs"
          variant="outline"
          className="text-[11px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50 gap-1.5"
          isLoading={isToggling}
          onClick={onToggle}
        >
          <WifiOff size={12} />
          Go Offline
        </Button>
      </div>
    );
  }

  // Offline — prominent warning
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-sm animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center flex-shrink-0">
          <Lock size={18} className="text-rose-600" />
        </div>
        <div>
          <p className="font-extrabold text-rose-800 text-sm flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-600 inline-block" />
            You are OFFLINE — No new work will be assigned to you as {role}
          </p>
          <p className="text-xs text-rose-600 mt-0.5">
            {pendingCount > 0 ? (
              <>
                <AlertTriangle size={12} className="inline mr-1" />
                You have <strong>{pendingCount} pending item(s)</strong> from before going offline. Please attend to them or contact your supervisor.
              </>
            ) : (
              'No new tasks, prescriptions, or requests will be routed to you while offline. Go online when you are ready.'
            )}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="success"
        className="font-bold gap-2 text-xs shadow-sm shrink-0"
        isLoading={isToggling}
        onClick={onToggle}
      >
        <Wifi size={14} />
        Go Online Now
      </Button>
    </div>
  );
};
