import React from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { HeartPulse, Bed, Bell, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { useSocket } from '../../providers/SocketProvider';
import { useAuthStore } from '../../store/authStore';

export const NurseDashboard = () => {
  const { socket } = useSocket();
  const { user } = useAuthStore();

  const handleTestCodeBlueTrigger = () => {
    if (socket) {
      socket.emit('trigger_code_blue_demo');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Ward Nursing Station & Care Monitor</h2>
          <p className="text-xs text-slate-400 mt-1">Inpatient Ward — Care Requests & Vitals Station</p>
        </div>
        <Button variant="danger" size="sm" onClick={handleTestCodeBlueTrigger}>
          <AlertOctagon size={16} />
          Test Emergency Code Blue Alert
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Assigned Ward Beds" value="0 Beds" subtitle="Occupied by Patients" icon={Bed} color="sky" />
        <StatCard title="Active Care Requests" value="0 Pending" subtitle="Water, Medicine, IV Drip" icon={Bell} color="amber" />
        <StatCard title="Medications Due (MAR)" value="0 Patients" subtitle="Next 1 Hour Shift" icon={HeartPulse} color="emerald" />
        <StatCard title="Shift Status" value="ON DUTY" subtitle={`Nurse ${user?.name || ''}`} icon={CheckCircle2} color="purple" />
      </div>

      {/* Visual Ward Bed Matrix */}
      <Card>
        <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bed size={18} className="text-sky-400" />
            Live Bed Matrix & Care Request Timers
          </span>
          <span className="text-xs text-slate-400 font-mono">Auto-Escalation Enabled</span>
        </h3>

        <div className="p-8 text-center text-slate-500 text-sm">
          No active admitted patients in ward beds. Admitted IPD patients will appear here in real time!
        </div>
      </Card>
    </div>
  );
};
