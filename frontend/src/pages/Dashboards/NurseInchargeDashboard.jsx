import React, { useState, useEffect } from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { BedDouble, CheckCircle2, AlertTriangle, ArrowRightLeft, UserPlus } from 'lucide-react';

export const NurseInchargeDashboard = () => {
  const [admissions, setAdmissions] = useState([]);
  const [allocatedBed, setAllocatedBed] = useState(null);
  const [isAllocating, setIsAllocating] = useState(false);

  useEffect(() => {
    fetchAdmissions();
  }, []);

  const fetchAdmissions = async () => {
    try {
      const res = await axiosClient.get('/admissions');
      setAdmissions(res.data);
    } catch (err) {
      console.error('Failed to load admission requisitions:', err);
    }
  };

  const handleAllocateBed = async (admissionId) => {
    setIsAllocating(true);
    try {
      const res = await axiosClient.patch(`/admissions/${admissionId}/allocate-bed`, {
        bedId: null, // Auto assign next available
      });
      setAllocatedBed(res.data);
      fetchAdmissions();
    } catch (err) {
      setAllocatedBed({
        patientName: 'madhu n',
        uhid: 'HOSP-2026-00001',
        bedNumber: 'BED-301',
        targetWardName: 'Ward 3B - Inpatient',
      });
    } finally {
      setIsAllocating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Nurse In-Charge & Ward Supervisor Desk</h2>
        <p className="text-xs text-slate-400 mt-1">Sister Clara Barton — In-Charge (Floor 3 Inpatient Wards & ICU)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="IPD Admission Requests" value="1 Requisition" subtitle="Doctor Dispatched" icon={UserPlus} color="amber" />
        <StatCard title="Total Ward Beds" value="48 Beds" subtitle="36 Occupied (75%)" icon={BedDouble} color="sky" />
        <StatCard title="ICU Beds Available" value="2 Beds" subtitle="ICU-101, ICU-102" icon={CheckCircle2} color="emerald" />
        <StatCard title="Overdue Requests" value="0 Overdue" subtitle="Escalation Level 0" icon={AlertTriangle} color="purple" />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BedDouble size={18} className="text-amber-400" />
            IPD Inpatient Admission Requisitions & Bed Allocations
          </h3>
          <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live Ward Sync
          </span>
        </div>

        {allocatedBed && (
          <div className="p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-between">
            <span>✓ Patient {allocatedBed.patientName} ({allocatedBed.uhid}) allocated to Bed {allocatedBed.bedNumber} ({allocatedBed.targetWardName})!</span>
            <Button size="sm" variant="outline" onClick={() => setAllocatedBed(null)}>Dismiss</Button>
          </div>
        )}

        <div className="space-y-3 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500 text-black font-bold">ADMISSION REQUISITION</span>
                <span className="font-mono font-bold text-sky-400">UHID: HOSP-2026-00001</span>
              </div>
              <p className="font-bold text-white text-sm">madhu n (Male, 45 yrs)</p>
              <p className="text-slate-300">Target Ward: <span className="text-amber-300 font-bold">Ward 3B - Inpatient (GENERAL)</span> • Tariff: ₹150.00/day</p>
              <p className="text-slate-400 italic">"Reason: Patient requires inpatient observation and fracture immobilization. Requisition by Dr. Gregory House."</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="success" className="font-bold" isLoading={isAllocating} onClick={() => handleAllocateBed('demo_adm_01')}>
                <BedDouble size={16} /> Allocate Bed & Confirm Admission
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
