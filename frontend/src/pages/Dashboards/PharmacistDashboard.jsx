import React, { useEffect, useState } from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Pill, Boxes, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { axiosClient } from '../../api/axiosClient';
import { useSocket } from '../../providers/SocketProvider';
import { Button } from '../../components/ui/Button';
import { useDepartmentNotificationStore } from '../../store/departmentNotificationStore';

export const PharmacistDashboard = () => {
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const refreshPendingWork = useDepartmentNotificationStore((state) => state.fetchPendingWork);
  const [prescriptions, setPrescriptions] = useState([]);

  const fetchPrescriptions = async () => {
    try {
      const response = await axiosClient.get('/pharmacy/prescriptions');
      setPrescriptions(response.data || []);
    } catch (error) {
      console.error('Failed to load prescriptions:', error);
    }
  };

  useEffect(() => { fetchPrescriptions(); }, []);
  useEffect(() => {
    if (!socket) return;
    const refresh = () => { fetchPrescriptions(); refreshPendingWork(); };
    socket.on('workflow:notification', refresh);
    socket.on('workflow:pending_changed', refresh);
    return () => {
      socket.off('workflow:notification', refresh);
      socket.off('workflow:pending_changed', refresh);
    };
  }, [socket, refreshPendingWork]);

  const pending = prescriptions.filter((item) => item.dispenseStatus === 'PENDING_DISPENSE');
  const dispensed = prescriptions.filter((item) => item.dispenseStatus === 'DISPENSED');

  const dispense = async (id) => {
    await axiosClient.patch(`/pharmacy/prescriptions/${id}/dispense`);
    await Promise.all([fetchPrescriptions(), refreshPendingWork()]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Pharmacy POS & FEFO Stock Workstation</h2>
        <p className="text-xs text-slate-500 mt-1">{user?.name || 'Pharmacist'} — Central Pharmacy Workstation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Prescriptions Pending" value={`${pending.length} Orders`} subtitle="Auto E-Prescription Queue" icon={Pill} color="sky" />
        <StatCard title="Today's Dispensed Items" value={`${dispensed.length} Orders`} subtitle="FEFO Compliant" icon={CheckCircle2} color="emerald" />
        <StatCard title="Near-Expiry Stock Alerts" value="0 Batches" subtitle="Expiring within 30 days" icon={AlertTriangle} color="amber" />
        <StatCard title="Total Medicine SKUs" value="0 SKUs" subtitle="In-Stock Store" icon={Boxes} color="purple" />
      </div>

      <Card>
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Pill size={18} className="text-indigo-500" />
            Pending E-Prescription Dispense Queue
          </span>
          <span className="text-xs text-slate-500 font-mono">FEFO Auto Batch Selection Active</span>
        </h3>

        {pending.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {pending.map((prescription) => (
              <div key={prescription._id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div>
                  <p className="font-bold text-slate-900">{prescription.patientId?.firstName} {prescription.patientId?.lastName}</p>
                  <p className="text-indigo-600 font-mono font-bold">{prescription.prescriptionNo}</p>
                  <p className="text-slate-500">{prescription.medicines?.length || 0} medicines · Dr. {prescription.doctorId?.name || 'Doctor'}</p>
                </div>
                <Button variant="success" size="sm" onClick={() => dispense(prescription._id)}>Mark Dispensed</Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-sm">No pending e-prescriptions.</div>
        )}
      </Card>
    </div>
  );
};
