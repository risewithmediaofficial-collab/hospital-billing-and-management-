import React, { useState, useEffect } from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { HeartPulse, Bed, Bell, AlertOctagon, CheckCircle2, Clock, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { useSocket } from '../../providers/SocketProvider';
import { useAuthStore } from '../../store/authStore';
import { axiosClient } from '../../api/axiosClient';

export const NurseDashboard = () => {
  const { socket } = useSocket();
  const { user } = useAuthStore();
  const [requests, setRequests] = useState([]);
  const [beds, setBeds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');

  useEffect(() => {
    fetchRequests();
    fetchBeds();
  }, [filterCategory]);

  const fetchRequests = async () => {
    try {
      const url = filterCategory !== 'ALL' ? `/requests?category=${filterCategory}` : '/requests';
      const res = await axiosClient.get(url);
      setRequests(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
    }
  };

  const fetchBeds = async () => {
    try {
      const res = await axiosClient.get('/beds');
      setBeds(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load beds:', err);
    }
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    setIsLoading(true);
    try {
      await axiosClient.put(`/requests/${requestId}/status`, { status: newStatus });
      fetchRequests();
    } catch (err) {
      console.error(`Failed to update request status to ${newStatus}:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestCodeBlueTrigger = () => {
    if (socket) {
      socket.emit('trigger_code_blue_demo');
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'SUBMITTED' || r.status === 'PENDING').length;
  const activeCount = requests.filter((r) => r.status === 'ACCEPTED' || r.status === 'IN_PROGRESS').length;
  const emergencyCount = requests.filter((r) => r.requestType === 'EMERGENCY' && r.status !== 'COMPLETED').length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Ward Nursing Station & Care Monitor</h2>
          <p className="text-xs text-slate-500 mt-0.5">Live In-Bed Patient Care Requests & Emergency Dispatch Queue</p>
        </div>
        <Button variant="danger" size="sm" onClick={handleTestCodeBlueTrigger} className="font-extrabold shadow-md shadow-rose-600/30 gap-1.5">
          <AlertOctagon size={16} /> Test Code Blue Alert
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Ward Beds Occupied" value={`${beds.filter(b => b.status === 'OCCUPIED').length} Beds`} subtitle="Inpatient Ward Beds" icon={Bed} color="sky" />
        <StatCard title="Pending Patient Requests" value={`${pendingCount} Requests`} subtitle="Awaiting Acceptance" icon={Bell} color="amber" />
        <StatCard title="In-Progress Care Tasks" value={`${activeCount} Tasks`} subtitle="Being Attended" icon={HeartPulse} color="emerald" />
        <StatCard title="Active Emergencies" value={`${emergencyCount} Code Blue`} subtitle="High Priority Alerts" icon={ShieldAlert} color="purple" />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
        {['ALL', 'NURSE', 'CARETAKER', 'EMERGENCY'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              filterCategory === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat === 'ALL' ? 'All Requests' : `${cat} Queue`}
          </button>
        ))}
      </div>

      {/* Live Care Requests Queue */}
      <Card>
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bell size={18} className="text-indigo-600" />
            In-Bed Patient Requests & Response Queue
          </span>
          <span className="text-xs text-slate-500 font-mono">Auto-Escalation Enabled</span>
        </h3>

        <div className="space-y-3 text-xs">
          {requests.length > 0 ? (
            requests.map((req) => (
              <div
                key={req._id}
                className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  req.requestType === 'EMERGENCY'
                    ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
                    : req.status === 'SUBMITTED' || req.status === 'PENDING'
                    ? 'bg-amber-50/50 border-amber-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm">{req.requestType}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      req.requestCategory === 'EMERGENCY' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                      req.requestCategory === 'CARETAKER' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                      'bg-indigo-100 text-indigo-800 border-indigo-300'
                    }`}>
                      {req.requestCategory}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-bold">
                      Priority: {req.priority}
                    </span>
                  </div>

                  <p className="text-slate-600 mt-1 font-medium">
                    Patient: <strong>{req.patientId?.firstName} {req.patientId?.lastName}</strong> • Location: <strong>Bed {req.bedId?.bedNumber || '1'} (Room {req.bedId?.roomNumber || '101'}, {req.bedId?.wardName || 'General Ward'})</strong>
                  </p>

                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Submitted: {new Date(req.submittedAt || req.createdAt).toLocaleTimeString()}
                    {req.acceptedBy && ` • Accepted by: ${req.acceptedBy.name}`}
                    {req.completedBy && ` • Completed by: ${req.completedBy.name}`}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {req.status === 'SUBMITTED' || req.status === 'PENDING' ? (
                    <Button
                      size="sm"
                      variant="primary"
                      className="font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                      isLoading={isLoading}
                      onClick={() => handleUpdateStatus(req._id, 'ACCEPTED')}
                    >
                      Accept Request
                    </Button>
                  ) : req.status === 'ACCEPTED' ? (
                    <Button
                      size="sm"
                      variant="success"
                      className="font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      isLoading={isLoading}
                      onClick={() => handleUpdateStatus(req._id, 'COMPLETED')}
                    >
                      Mark Completed
                    </Button>
                  ) : req.status === 'COMPLETED' ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      ✓ Completed
                    </span>
                  ) : null}

                  {req.status !== 'COMPLETED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-bold text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                      isLoading={isLoading}
                      onClick={() => handleUpdateStatus(req._id, 'ESCALATED')}
                    >
                      <ArrowUpRight size={14} /> Escalate
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-400">No active patient care requests in queue.</div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default NurseDashboard;
