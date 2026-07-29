import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { AllocateBedModal } from '../../components/modals/AllocateBedModal';
import { formatCurrency } from '../../utils/formatters';
import { useSocket } from '../../providers/SocketProvider';
import {
  BedDouble,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  UserCheck,
  LayoutGrid,
  RefreshCw,
  Search,
  Lock,
  LogOut,
  Stethoscope,
  Activity,
} from 'lucide-react';

export const NurseInchargeDashboard = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('REQUISITIONS'); // 'REQUISITIONS' | 'ADMITTED' | 'BEDS'
  const [admissions, setAdmissions] = useState([]);
  const [beds, setBeds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedAdmissionForModal, setSelectedAdmissionForModal] = useState(null);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [isDischargingId, setIsDischargingId] = useState(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && ['REQUISITIONS', 'ADMITTED', 'BEDS'].includes(tabParam.toUpperCase())) {
      setActiveTab(tabParam.toUpperCase());
    } else {
      setActiveTab('REQUISITIONS');
    }
  }, [location.search]);

  const { socket } = useSocket();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleRequisitionUpdate = () => {
      fetchData();
    };
    socket.on('admission:requisition_created', handleRequisitionUpdate);
    socket.on('admission:confirmed', handleRequisitionUpdate);
    return () => {
      socket.off('admission:requisition_created', handleRequisitionUpdate);
      socket.off('admission:confirmed', handleRequisitionUpdate);
    };
  }, [socket]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [admRes, bedsRes] = await Promise.all([
        axiosClient.get('/admissions'),
        axiosClient.get('/beds'),
      ]);
      setAdmissions(Array.isArray(admRes) ? admRes : (admRes.data || []));
      setBeds(Array.isArray(bedsRes) ? bedsRes : (bedsRes.data || []));
    } catch (err) {
      console.error('Failed to fetch nurse dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAllocateModal = (adm) => {
    setSelectedAdmissionForModal(adm);
    setIsAllocateModalOpen(true);
  };

  const handleDischargePatient = async (admissionId) => {
    if (!window.confirm('Are you sure you want to discharge this inpatient and liberate the bed to AVAILABLE status?')) return;
    setIsDischargingId(admissionId);
    try {
      await axiosClient.patch(`/admissions/${admissionId}/discharge`);
      fetchData();
    } catch (err) {
      console.error('Failed to discharge patient:', err);
    } finally {
      setIsDischargingId(null);
    }
  };

  // Metrics
  const pendingRequisitions = admissions.filter((a) => a.status === 'ADMISSION_REQUESTED');
  const admittedInpatients = admissions.filter((a) => a.status === 'ADMITTED');
  const occupiedBedsCount = beds.filter((b) => b.status === 'OCCUPIED').length;
  const availableBedsCount = beds.filter((b) => b.status === 'AVAILABLE').length;

  // Filtered lists
  const filteredRequisitions = admissions.filter((a) => {
    const search = searchTerm.toLowerCase();
    const pName = (a.patientName || '').toLowerCase();
    const uhid = (a.uhid || '').toLowerCase();
    const bed = (a.bedNumber || '').toLowerCase();
    return pName.includes(search) || uhid.includes(search) || bed.includes(search);
  });

  const filteredAdmitted = admittedInpatients.filter((a) => {
    const search = searchTerm.toLowerCase();
    const pName = (a.patientName || '').toLowerCase();
    const uhid = (a.uhid || '').toLowerCase();
    const bed = (a.bedNumber || '').toLowerCase();
    const ward = (a.targetWardName || '').toLowerCase();
    return pName.includes(search) || uhid.includes(search) || bed.includes(search) || ward.includes(search);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Nurse In-Charge & IPD Ward Supervisor Console
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time IPD Admissions Requisitions, Bed Allocation Locking & Inpatient Ward Occupancy Management
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1 font-bold shrink-0" onClick={fetchData}>
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh Data
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending IPD Requisitions" value={`${pendingRequisitions.length} Requisitions`} subtitle="Doctor Dispatched" icon={UserPlus} color="amber" />
        <StatCard title="Currently Admitted Inpatients" value={`${admittedInpatients.length} Inpatients`} subtitle="Occupying Wards" icon={UserCheck} color="indigo" />
        <StatCard title="Ward Beds Available" value={`${availableBedsCount} Beds`} subtitle="Unassigned & Clean" icon={CheckCircle2} color="emerald" />
        <StatCard title="Total Occupied Beds" value={`${occupiedBedsCount} Beds`} subtitle="Occupancy Locked" icon={BedDouble} color="sky" />
      </div>

      {/* Sub-Navbar Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 gap-2 overflow-x-auto">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('REQUISITIONS')}
            className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'REQUISITIONS'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <UserPlus size={16} />
            <span>IPD Requisitions ({pendingRequisitions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ADMITTED')}
            className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ADMITTED'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <UserCheck size={16} />
            <span>Admitted Patients ({admittedInpatients.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('BEDS')}
            className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'BEDS'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <LayoutGrid size={16} />
            <span>Ward Bed Matrix ({beds.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <input
            type="text"
            placeholder="Search patient, UHID, ward, bed..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full glass-input rounded-xl py-2 text-xs pl-8 pr-3 text-slate-900"
          />
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
        </div>
      </div>

      {/* TAB 1: IPD REQUISITIONS */}
      {activeTab === 'REQUISITIONS' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BedDouble size={18} className="text-amber-600" />
                IPD Inpatient Requisitions & Bed Allocations ({filteredRequisitions.length})
              </h3>
              <p className="text-xs text-slate-500">
                Doctor-dispatched admission requests awaiting nurse bed allocation & ward locking.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {filteredRequisitions.length > 0 ? (
              filteredRequisitions.map((adm) => {
                const isAdmitted = adm.status === 'ADMITTED';
                return (
                  <div
                    key={adm._id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isAdmitted
                        ? 'bg-slate-50 border-slate-200 opacity-90'
                        : 'bg-amber-50/50 border-amber-200 shadow-2xs'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            isAdmitted
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-600 text-white'
                          }`}
                        >
                          {isAdmitted ? '✓ ADMITTED & LOCKED' : 'ADMISSION REQUISITION'}
                        </span>
                        <span className="font-mono font-bold text-indigo-700 text-xs">{adm.uhid}</span>
                      </div>
                      <p className="font-extrabold text-slate-900 text-sm">{adm.patientName}</p>
                      <p className="text-slate-600 text-[11px]">
                        Target Ward: <span className="text-slate-900 font-bold">{adm.targetWardName} ({adm.wardType})</span>
                        {' • '}
                        Tariff: <span className="font-mono font-bold text-slate-900">{formatCurrency(adm.dailyTariff)}/day</span>
                      </p>
                      <p className="text-slate-500 italic text-[11px]">
                        <Stethoscope size={11} className="inline mr-1 text-indigo-500" />
                        "{adm.admissionReason || 'Inpatient care observation'}" • Requisition by <strong className="text-slate-700">{adm.doctorName}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isAdmitted ? (
                        <div className="px-3.5 py-2 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 font-extrabold text-xs flex items-center gap-1.5 shadow-2xs">
                          <CheckCircle2 size={16} className="text-emerald-700" />
                          <span>ALLOCATED: {adm.targetWardName} — {adm.bedNumber}</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="success"
                          className="font-bold shadow-2xs gap-1.5"
                          onClick={() => handleOpenAllocateModal(adm)}
                        >
                          <BedDouble size={16} /> Allocate Bed & Confirm Admission
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                No IPD admission requisitions matching your filter.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* TAB 2: ADMITTED INPATIENTS DIRECTORY */}
      {activeTab === 'ADMITTED' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck size={18} className="text-indigo-600" />
                Active Admitted Inpatients Directory ({filteredAdmitted.length})
              </h3>
              <p className="text-xs text-slate-500">
                List of all patients currently occupying IPD ward beds.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">UHID & Patient Name</th>
                  <th className="p-3">Assigned Ward & Bed #</th>
                  <th className="p-3">Requisition Doctor</th>
                  <th className="p-3">Admitted Date</th>
                  <th className="p-3 text-right">Daily Tariff</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filteredAdmitted.length > 0 ? (
                  filteredAdmitted.map((adm) => (
                    <tr key={adm._id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <p className="font-extrabold text-slate-900 text-sm">{adm.patientName}</p>
                        <p className="font-mono text-indigo-700 font-bold text-[11px]">{adm.uhid}</p>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {adm.bedNumber}
                        </span>
                        <p className="text-[11px] text-slate-600 mt-0.5 font-medium">{adm.targetWardName}</p>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900">{adm.doctorName}</span>
                        <p className="text-[10px] text-slate-500">{adm.admissionReason}</p>
                      </td>
                      <td className="p-3 text-slate-600 font-medium">
                        {adm.admittedAt ? new Date(adm.admittedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recently'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(adm.dailyTariff)}/day
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          OCCUPIED & LOCKED
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="font-bold text-xs gap-1 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                          isLoading={isDischargingId === adm._id}
                          onClick={() => handleDischargePatient(adm._id)}
                        >
                          <LogOut size={13} /> Discharge & Free Bed
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                      No active admitted inpatients in ward beds.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: WARD BED MATRIX */}
      {activeTab === 'BEDS' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <LayoutGrid size={18} className="text-emerald-600" />
                Hospital Ward & Live Bed Matrix ({beds.length} Total Beds)
              </h3>
              <p className="text-xs text-slate-500">
                Live bed occupancy status matrix across all hospital departments & inpatient wards.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {beds.length > 0 ? (
              beds.map((b) => {
                const isOccupied = b.status === 'OCCUPIED';
                const pat = b.currentPatientId;
                return (
                  <div
                    key={b._id}
                    className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                      isOccupied
                        ? 'bg-rose-50/40 border-rose-200 shadow-2xs'
                        : 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-sm text-slate-900">{b.bedNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-black border ${
                          isOccupied
                            ? 'bg-rose-600 text-white border-rose-700'
                            : 'bg-emerald-600 text-white border-emerald-700'
                        }`}
                      >
                        {isOccupied ? 'OCCUPIED' : 'AVAILABLE'}
                      </span>
                    </div>

                    <div>
                      <p className="font-bold text-slate-800 text-[11px]">{b.wardName}</p>
                      <p className="text-slate-500 text-[10px]">{b.wardType} • ₹{b.dailyTariff}/day</p>
                    </div>

                    {isOccupied && (
                      <div className="p-2 rounded-lg bg-white border border-rose-200 text-[11px] space-y-0.5">
                        <p className="text-slate-500 text-[10px] uppercase font-bold">Occupying Patient:</p>
                        <p className="font-extrabold text-slate-900">
                          {pat ? `${pat.firstName || ''} ${pat.lastName || ''}` : 'Admitted Inpatient'}
                        </p>
                        {pat?.uhid && <p className="font-mono text-indigo-700 text-[10px]">{pat.uhid}</p>}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="col-span-full p-8 text-center text-slate-500 text-xs">
                Loading hospital bed matrix...
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Allocate Bed Modal */}
      {selectedAdmissionForModal && (
        <AllocateBedModal
          isOpen={isAllocateModalOpen}
          onClose={() => {
            setIsAllocateModalOpen(false);
            setSelectedAdmissionForModal(null);
          }}
          admission={selectedAdmissionForModal}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
};
