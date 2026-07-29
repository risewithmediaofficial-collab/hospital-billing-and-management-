import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { RegisterPatientModal } from '../../components/modals/RegisterPatientModal';
import { IssueTokenModal } from '../../components/modals/IssueTokenModal';
import { axiosClient } from '../../api/axiosClient';
import { useSocket } from '../../providers/SocketProvider';
import { formatCurrency } from '../../utils/formatters';
import {
  Users,
  UserPlus,
  Search,
  Ticket,
  ArrowLeft,
  CheckCircle,
  Clock,
  Stethoscope,
  Receipt,
  CheckCircle2,
  RefreshCw,
  FolderOpen,
  UserCheck,
} from 'lucide-react';

export const ReceptionWorkspaceView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { socket } = useSocket();

  // Tab state: 'REGISTERED' | 'QUEUED' | 'COMPLETED' | 'ALL'
  const [activeTab, setActiveTab] = useState('REGISTERED');

  const [patients, setPatients] = useState([]);
  const [queuedPatients, setQueuedPatients] = useState([]);
  const [completedPatients, setCompletedPatients] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isTokenOpen, setIsTokenOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRegisteredPatients = useCallback(async () => {
    try {
      const res = await axiosClient.get('/patients');
      setPatients(res.data || []);
    } catch (err) {
      console.error('Failed to load registered patients:', err);
    }
  }, []);

  const fetchQueuedPatients = useCallback(async () => {
    try {
      const res = await axiosClient.get('/appointments/queue');
      const allTokens = res.data || [];
      const waitingOrInConsult = allTokens.filter((t) => t.status !== 'COMPLETED');
      setQueuedPatients(waitingOrInConsult);
    } catch (err) {
      console.error('Failed to load queued patients:', err);
    }
  }, []);

  const fetchCompletedPatients = useCallback(async () => {
    try {
      // Fetch receipts & invoices to combine completed consultations with billing info
      const [invRes, queueRes] = await Promise.all([
        axiosClient.get('/billing/invoices'),
        axiosClient.get('/appointments/queue'),
      ]);
      const invoices = invRes.data || [];
      const allTokens = queueRes.data || [];

      // Completed consultations
      const completedTokens = allTokens.filter((t) => t.status === 'COMPLETED');

      // Map completed tokens to invoice payment status
      const completedWithBilling = completedTokens.map((tok) => {
        const patId = tok.patientId?._id || tok.patientId;
        const matchingInv =
          invoices.find(
            (inv) =>
              (inv.patientId?._id === patId || inv.patientId === patId) &&
              new Date(inv.createdAt).toDateString() === new Date(tok.updatedAt || tok.createdAt).toDateString()
          ) || invoices.find((inv) => inv.patientId?._id === patId || inv.patientId === patId);

        return {
          ...tok,
          invoice: matchingInv || null,
          billingStatus: matchingInv ? matchingInv.status : 'NO_INVOICE',
          paidAmount: matchingInv ? matchingInv.paidAmount : 0,
          grandTotal: matchingInv ? matchingInv.grandTotal : 0,
        };
      });

      setCompletedPatients(completedWithBilling);
    } catch (err) {
      console.error('Failed to load completed patients:', err);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchRegisteredPatients(), fetchQueuedPatients(), fetchCompletedPatients()]);
    setIsLoading(false);
  }, [fetchRegisteredPatients, fetchQueuedPatients, fetchCompletedPatients]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleQueueUpdate = () => {
      fetchQueuedPatients();
      fetchCompletedPatients();
    };

    const handleBillingUpdate = () => {
      fetchCompletedPatients();
    };

    socket.on('opd_queue:updated', handleQueueUpdate);
    socket.on('opd_queue:status_changed', handleQueueUpdate);
    socket.on('billing:invoice_created', handleBillingUpdate);

    return () => {
      socket.off('opd_queue:updated', handleQueueUpdate);
      socket.off('opd_queue:status_changed', handleQueueUpdate);
      socket.off('billing:invoice_created', handleBillingUpdate);
    };
  }, [socket, fetchQueuedPatients, fetchCompletedPatients]);

  const handleIssueTokenForPatient = (pat) => {
    setSelectedPatient(pat);
    setIsTokenOpen(true);
  };

  // Set of queued and completed patient IDs today
  const queuedPatientIds = new Set(
    queuedPatients.map((q) => (q.patientId?._id || q.patientId || '').toString())
  );

  const completedPatientIds = new Set(
    completedPatients.map((c) => (c.patientId?._id || c.patientId || '').toString())
  );

  // Tab 1: Registered Patients Awaiting OPD Token (Not in Queue and Not Completed)
  const registeredAwaitingToken = patients.filter((p) => {
    const pId = (p._id || '').toString();
    return !queuedPatientIds.has(pId) && !completedPatientIds.has(pId);
  });

  // Filtered lists with search bar
  const filteredAwaiting = registeredAwaitingToken.filter(
    (p) =>
      p.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.uhid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.chiefComplaints?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredQueued = queuedPatients.filter(
    (q) =>
      q.patientId?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.patientId?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.patientId?.uhid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.doctorId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCompleted = completedPatients.filter(
    (c) =>
      c.patientId?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.patientId?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.patientId?.uhid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.doctorId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAllPatients = patients.filter(
    (p) =>
      p.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.uhid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.chiefComplaints?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/reception/dashboard')}
            className="mb-2 gap-1.5 font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs"
          >
            <ArrowLeft size={14} /> Back to Reception Counter
          </Button>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users size={24} className="text-indigo-600" />
            Patient Directory & Lifecycle Tracker
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage registered patients, monitor active OPD queues, and track completed & billed visits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="font-bold gap-1 text-xs" onClick={fetchAllData}>
            <RefreshCw size={14} /> Refresh
          </Button>
          <Button variant="primary" size="sm" className="font-bold gap-1.5 text-xs" onClick={() => setIsRegisterOpen(true)}>
            <UserPlus size={16} /> Register New Patient
          </Button>
        </div>
      </div>

      {/* 4-Tab Sub-Navbar */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
        <button
          onClick={() => setActiveTab('REGISTERED')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all ${
            activeTab === 'REGISTERED'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <UserCheck size={16} />
          Registered Patients (Awaiting Token) ({registeredAwaitingToken.length})
        </button>

        <button
          onClick={() => setActiveTab('QUEUED')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all ${
            activeTab === 'QUEUED'
              ? 'bg-amber-500 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Ticket size={16} />
          Queued / Active OPD ({queuedPatients.length})
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all ${
            activeTab === 'COMPLETED'
              ? 'bg-emerald-500 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <CheckCircle2 size={16} />
          Completed & Billed ({completedPatients.length})
        </button>

        <button
          onClick={() => setActiveTab('ALL')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all ${
            activeTab === 'ALL'
              ? 'bg-purple-500 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <FolderOpen size={16} />
          All Hospital Patients ({patients.length})
        </button>
      </div>

      {/* Search Input */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Input
            placeholder="Search by Patient Name, UHID, Phone, Doctor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="py-2 text-xs pl-9"
          />
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
        </div>
      </div>

      {/* TAB 1: REGISTERED PATIENTS AWAITING TOKEN */}
      {activeTab === 'REGISTERED' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck size={18} className="text-indigo-500" />
                Registered Patients Awaiting Token ({filteredAwaiting.length})
              </h3>
              <p className="text-xs text-slate-500">
                Newly registered patients ready to get an OPD token. Once issued, they automatically move to the Queue.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">UHID</th>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Age</th>
                  <th className="p-3">Gender</th>
                  <th className="p-3">Phone Number</th>
                  <th className="p-3">Chief Complaint</th>
                  <th className="p-3">Registered Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filteredAwaiting.length > 0 ? (
                  filteredAwaiting.map((pat) => (
                    <tr key={pat._id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-extrabold text-indigo-700">{pat.uhid}</td>
                      <td className="p-3 font-bold text-slate-900">{pat.firstName} {pat.lastName}</td>
                      <td className="p-3 text-slate-600">{pat.age ? `${pat.age} Yrs` : 'N/A'}</td>
                      <td className="p-3 text-slate-500">{pat.gender}</td>
                      <td className="p-3 font-mono text-slate-600">{pat.phone}</td>
                      <td className="p-3 text-amber-600 font-medium">{pat.chiefComplaints || 'OPD Checkup'}</td>
                      <td className="p-3 text-slate-500">{new Date(pat.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="success" className="font-bold gap-1 text-xs" onClick={() => handleIssueTokenForPatient(pat)}>
                          <Ticket size={14} /> Issue OPD Token
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      All registered patients have been queued or completed! Click "Register New Patient" or view "All Hospital Patients".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: QUEUED PATIENTS */}
      {activeTab === 'QUEUED' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Ticket size={18} className="text-amber-600" />
                Active OPD Token Queue ({filteredQueued.length})
              </h3>
              <p className="text-xs text-slate-500">Patients currently waiting or undergoing consultation with doctors.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Token #</th>
                  <th className="p-3">UHID</th>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Assigned Doctor</th>
                  <th className="p-3">Cabin / Room</th>
                  <th className="p-3">Chief Complaint</th>
                  <th className="p-3">Queue Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filteredQueued.length > 0 ? (
                  filteredQueued.map((tok) => {
                    const pat = tok.patientId || {};
                    const doc = tok.doctorId || {};
                    return (
                      <tr key={tok._id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-black text-amber-600 font-mono text-sm">#{tok.tokenNumber}</td>
                        <td className="p-3 font-mono font-bold text-indigo-700">{pat.uhid || '—'}</td>
                        <td className="p-3 font-bold text-slate-900">{pat.firstName} {pat.lastName}</td>
                        <td className="p-3 text-slate-700">
                          <span className="font-bold text-indigo-700">Dr. {doc.name || 'Doctor'}</span>
                          <p className="text-[10px] text-slate-500">{doc.specialization || 'OPD Clinic'}</p>
                        </td>
                        <td className="p-3 text-slate-600 font-medium">{tok.cabinNo || doc.cabinNo || 'Cabin 102'}</td>
                        <td className="p-3 text-amber-600 font-medium">{tok.chiefComplaints || 'Check-up'}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold border ${
                            tok.status === 'IN_CONSULTATION'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 animate-pulse'
                              : 'bg-amber-50 text-amber-600 border-amber-200'
                          }`}>
                            {tok.status === 'IN_CONSULTATION' ? '⚡ IN CONSULTATION' : '⏳ WAITING'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No active patients currently in doctor queues.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: COMPLETED PATIENTS */}
      {activeTab === 'COMPLETED' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                Completed & Billed Consultations ({filteredCompleted.length})
              </h3>
              <p className="text-xs text-slate-500">Patients who have finished doctor consultation and billing.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Token #</th>
                  <th className="p-3">UHID</th>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Consulting Doctor</th>
                  <th className="p-3">Invoice No</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Payment Clearance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filteredCompleted.length > 0 ? (
                  filteredCompleted.map((item) => {
                    const pat = item.patientId || {};
                    const doc = item.doctorId || {};
                    const inv = item.invoice;
                    return (
                      <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-emerald-600">#{item.tokenNumber}</td>
                        <td className="p-3 font-mono font-bold text-indigo-700">{pat.uhid || '—'}</td>
                        <td className="p-3 font-bold text-slate-900">{pat.firstName} {pat.lastName}</td>
                        <td className="p-3 text-slate-700">
                          <span className="font-bold text-slate-900">Dr. {doc.name || 'Doctor'}</span>
                          <p className="text-[10px] text-slate-500">{doc.specialization || 'OPD'}</p>
                        </td>
                        <td className="p-3 font-mono text-slate-600">{inv ? inv.invoiceNo : '—'}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {inv ? formatCurrency(inv.grandTotal) : '—'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold border ${
                            item.billingStatus === 'PAID'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : item.billingStatus === 'PARTIALLY_PAID'
                              ? 'bg-amber-50 text-amber-600 border-amber-200'
                              : 'bg-red-50 text-red-600 border-red-200'
                          }`}>
                            {item.billingStatus === 'PAID'
                              ? '✅ PAID & CLEARED'
                              : item.billingStatus === 'PARTIALLY_PAID'
                              ? '⚠️ PARTIALLY PAID'
                              : '⏳ UNPAID / PENDING CASHIER'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No completed consultations recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: ALL HOSPITAL PATIENTS (MASTER DIRECTORY) */}
      {activeTab === 'ALL' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderOpen size={18} className="text-purple-600" />
                All Hospital Patients Master Directory ({filteredAllPatients.length})
              </h3>
              <p className="text-xs text-slate-500">
                Complete permanent list of all registered patients in the hospital database.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">UHID</th>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Age</th>
                  <th className="p-3">Gender</th>
                  <th className="p-3">Phone Number</th>
                  <th className="p-3">Chief Complaint</th>
                  <th className="p-3">Registered Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filteredAllPatients.length > 0 ? (
                  filteredAllPatients.map((pat) => {
                    const isQueued = queuedPatientIds.has((pat._id || '').toString());
                    const isCompleted = completedPatientIds.has((pat._id || '').toString());

                    return (
                      <tr key={pat._id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-extrabold text-indigo-700">{pat.uhid}</td>
                        <td className="p-3 font-bold text-slate-900">{pat.firstName} {pat.lastName}</td>
                        <td className="p-3 text-slate-600">{pat.age ? `${pat.age} Yrs` : 'N/A'}</td>
                        <td className="p-3 text-slate-500">{pat.gender}</td>
                        <td className="p-3 font-mono text-slate-600">{pat.phone}</td>
                        <td className="p-3 text-amber-600 font-medium">{pat.chiefComplaints || 'OPD Checkup'}</td>
                        <td className="p-3 text-slate-500">{new Date(pat.createdAt).toLocaleDateString()}</td>
                        <td className="p-3 text-right">
                          {isQueued ? (
                            <span className="px-2 py-1 rounded bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-bold">
                              ⏳ IN QUEUE TODAY
                            </span>
                          ) : isCompleted ? (
                            <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold">
                              ✅ COMPLETED TODAY
                            </span>
                          ) : (
                            <Button size="sm" variant="success" className="font-bold gap-1 text-xs" onClick={() => handleIssueTokenForPatient(pat)}>
                              <Ticket size={14} /> Issue OPD Token
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      No registered patients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modals */}
      <RegisterPatientModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} onSuccess={fetchAllData} />
      <IssueTokenModal isOpen={isTokenOpen} onClose={() => setIsTokenOpen(false)} onSuccess={fetchAllData} initialPatient={selectedPatient} />
    </div>
  );
};

export default ReceptionWorkspaceView;
