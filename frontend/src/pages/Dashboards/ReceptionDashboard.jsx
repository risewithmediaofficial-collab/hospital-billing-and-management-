import React, { useState, useEffect } from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { RegisterPatientModal } from '../../components/modals/RegisterPatientModal';
import { IssueTokenModal } from '../../components/modals/IssueTokenModal';
import { useSocket } from '../../providers/SocketProvider';
import { axiosClient } from '../../api/axiosClient';
import { UserPlus, Ticket, IdCard, Users, HelpCircle, Stethoscope, AlertTriangle } from 'lucide-react';

export const ReceptionDashboard = () => {
  const { socket } = useSocket();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isTokenOpen, setIsTokenOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [doctorQueueCounts, setDoctorQueueCounts] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time synchronization for Doctor Availability & Queue updates
  useEffect(() => {
    if (!socket) return;

    const handleDoctorAvailabilityChange = (data) => {
      setDoctors((prevDocs) =>
        prevDocs.map((doc) =>
          doc._id === data.id || doc._id === data._id
            ? {
                ...doc,
                isAvailable: data.isAvailable !== undefined ? data.isAvailable : doc.isAvailable,
                cabinNo: data.cabinNo || doc.cabinNo,
                availabilityUpdatedAt: data.availabilityUpdatedAt || doc.availabilityUpdatedAt,
              }
            : doc
        )
      );
    };

    const handleQueueUpdate = () => {
      fetchQueueCounts();
    };

    socket.on('doctor:availability_changed', handleDoctorAvailabilityChange);
    socket.on('opd_queue:updated', handleQueueUpdate);
    socket.on('opd_queue:status_changed', handleQueueUpdate);

    return () => {
      socket.off('doctor:availability_changed', handleDoctorAvailabilityChange);
      socket.off('opd_queue:updated', handleQueueUpdate);
      socket.off('opd_queue:status_changed', handleQueueUpdate);
    };
  }, [socket]);

  const fetchData = async () => {
    try {
      const pRes = await axiosClient.get('/patients');
      setPatients(pRes.data || []);

      const sRes = await axiosClient.get('/auth/staff');
      const docList = sRes.data ? sRes.data.filter((s) => s.role === 'DOCTOR') : [];
      setDoctors(docList);
      fetchQueueCounts();
    } catch (err) {
      console.error('Failed to fetch reception dashboard data:', err);
    }
  };

  const fetchQueueCounts = async () => {
    try {
      const res = await axiosClient.get('/appointments/queue');
      const queue = res.data || [];
      const counts = {};
      queue.forEach((item) => {
        if (item.status !== 'COMPLETED') {
          const docId = item.doctorId?._id || item.doctorId;
          if (docId) {
            counts[docId] = (counts[docId] || 0) + 1;
          }
        }
      });
      setDoctorQueueCounts(counts);
    } catch (err) {
      console.error('Failed to fetch queue counts:', err);
    }
  };

  const handleOpenTokenForDoctor = (docId = null) => {
    if (docId) {
      const doc = doctors.find((d) => d._id === docId);
      if (doc && doc.isAvailable === false) {
        alert('This doctor is currently unavailable. Please select another available doctor.');
        return;
      }
    }
    setSelectedDoctorId(docId);
    setIsTokenOpen(true);
  };

  const activeDoctors = doctors.filter((d) => d.isAvailable !== false);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Front Desk Registration & Token Station</h2>
          <p className="text-xs text-slate-400 mt-1">Reception Counter 01 — Patient Registration & OPD Token Generation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Registered Patients" value={`${patients.length} Patients`} subtitle="Auto-Sequencing UHID" icon={UserPlus} color="sky" />
        <StatCard title="OPD Active Doctors" value={`${activeDoctors.length} / ${doctors.length} Available`} subtitle="Real-time Status Sync" icon={Users} color="emerald" />
        <StatCard title="Visitor Passes Printed" value="0 Passes" subtitle="Active Ward Visitors" icon={IdCard} color="purple" />
        <StatCard title="Walk-In Queue Status" value={`${patients.length > 0 ? patients.length : 0} Total Patients`} subtitle="Live OPD Queue" icon={Ticket} color="amber" />
      </div>

      {/* Explanatory Banner for Receptionist */}
      <Card className="border-sky-500/30 bg-slate-900/90">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle size={20} className="text-sky-400" />
          <h3 className="text-sm font-bold text-white">Understanding Front Desk Patient Registration & OPD Token Generation</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sky-400 text-sm">
              <UserPlus size={18} /> 1. Register New Patient (First-Time Visitor)
            </div>
            <p className="text-slate-300">
              Use this when a <strong>new patient</strong> visits the hospital for the first time. It creates a permanent record in MongoDB with an auto-sequenced UHID number (e.g. <span className="font-mono text-white">HOSP-2026-00001</span>), name, age, phone, and gender.
            </p>
            <Button size="sm" variant="primary" className="font-bold gap-1 w-full mt-1" onClick={() => setIsRegisterOpen(true)}>
              <UserPlus size={14} /> Register New Patient Now
            </Button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
              <Ticket size={18} /> 2. Issue OPD Token (Send to Doctor Queue)
            </div>
            <p className="text-slate-300">
              Use this to issue an OPD queue ticket/token number (e.g. <span className="font-mono text-emerald-400">Token #1, #2, #3</span>) to an already registered patient so they sit in the Doctor's OPD Live Queue for consultation.
            </p>
            <Button size="sm" variant="success" className="font-bold gap-1 w-full mt-1" onClick={() => handleOpenTokenForDoctor(null)}>
              <Ticket size={14} /> Issue OPD Token Now
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users size={18} className="text-sky-400" />
              Doctor Roster & Availability Console ({doctors.length})
            </h3>
            <p className="text-xs text-slate-400">Only Active doctors can be selected for new patient assignments.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {doctors.length > 0 ? (
            doctors.map((doc) => {
              const isAvailable = doc.isAvailable !== false;
              const waitingCount = doctorQueueCounts[doc._id] || 0;
              return (
                <div
                  key={doc._id}
                  className={`p-3.5 rounded-xl border transition-all space-y-2 ${
                    isAvailable
                      ? 'bg-slate-900 border-slate-800 hover:border-sky-500/40'
                      : 'bg-slate-950/60 border-red-900/30 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-white text-sm">{doc.specialization || 'General OPD Clinic'}</p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                      isAvailable
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                      {isAvailable ? '🟢 Active' : '🔴 Inactive'}
                    </span>
                  </div>

                  <p className="text-slate-300 font-medium">
                    Doctor: <span className="text-sky-400 font-bold">{doc.name}</span>
                  </p>

                  <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                    <span>Cabin: <strong className="text-slate-200">{doc.cabinNo || 'Cabin 102'}</strong></span>
                    <span>Waiting: <strong className="text-amber-400">{waitingCount} Patients</strong></span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                    {isAvailable ? (
                      <>
                        <span className="text-emerald-400 font-bold text-[11px]">Ready for Tokens</span>
                        <Button size="sm" variant="outline" className="font-bold text-xs" onClick={() => handleOpenTokenForDoctor(doc._id)}>
                          Issue Token
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-red-400 font-bold text-[11px] flex items-center gap-1">
                          <AlertTriangle size={12} /> Doctor Unavailable
                        </span>
                        <Button size="sm" variant="outline" className="font-bold text-xs opacity-50 cursor-not-allowed" disabled>
                          Unavailable
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-slate-500 col-span-full">
              No doctors provisioned yet. The Hospital Admin can add doctors in the Hospital Admin Workstation!
            </div>
          )}
        </div>
      </Card>

      <RegisterPatientModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} onSuccess={fetchData} />
      <IssueTokenModal isOpen={isTokenOpen} onClose={() => setIsTokenOpen(false)} onSuccess={fetchData} initialDoctorId={selectedDoctorId} />
    </div>
  );
};
