import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ConsultationModal } from '../../components/modals/ConsultationModal';
import { RequestInvestigationModal } from '../../components/modals/RequestInvestigationModal';
import { RequestInjectionModal } from '../../components/modals/RequestInjectionModal';
import { AdmitPatientModal } from '../../components/modals/AdmitPatientModal';
import { SoloDoctorFlowBar } from '../../components/common/SoloDoctorFlowBar';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceModeStore } from '../../store/workspaceModeStore';
import { useSocket } from '../../providers/SocketProvider';
import { useDepartmentNotificationStore } from '../../store/departmentNotificationStore';
import { useNotificationStore } from '../../store/notificationStore';
import { ROLE_NAMES } from '../../utils/constants';
import { axiosClient } from '../../api/axiosClient';
import { PatientHistoryModal } from '../../components/modals/PatientHistoryModal';
import { FollowUpVisitsSection } from '../../components/common/FollowUpVisitsSection';
import {
  Stethoscope,
  Syringe,
  Users,
  Pill,
  Activity,
  CheckCircle2,
  TestTube,
  FileCheck2,
  BedDouble,
  Hourglass,
  Check,
  Eye,
  DoorClosed,
  Building2,
  Pencil,
  Power,
  X,
  Search,
  Clock,
  Lock,
  History,
  Calendar,
  Wifi,
} from 'lucide-react';

export const DoctorDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isDualModeEligible } = useWorkspaceModeStore();
  const { socket } = useSocket();
  const { notifications, markAsRead, addNotification, resolvePending } = useDepartmentNotificationStore();
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // 'OVERVIEW' | 'LIVE' | 'COMPLETED' | 'DEPT_RESPONSES' | 'FOLLOW_UPS'
  const [historyPatientId, setHistoryPatientId] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [liveQueue, setLiveQueue] = useState([]);
  const [completedQueue, setCompletedQueue] = useState([]);
  const [departmentHoldQueue, setDepartmentHoldQueue] = useState([]);
  const [departmentOrders, setDepartmentOrders] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [selectedDeptOrder, setSelectedDeptOrder] = useState(null);
  const [substitutionRequests, setSubstitutionRequests] = useState([]);
  const [queueSearchTerm, setQueueSearchTerm] = useState('');

  const [patientInvestigations, setPatientInvestigations] = useState([]);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isInjectionModalOpen, setIsInjectionModalOpen] = useState(false);
  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);

  const [isAvailable, setIsAvailable] = useState(user?.isAvailable ?? true);
  const [availabilityUpdatedAt, setAvailabilityUpdatedAt] = useState(user?.availabilityUpdatedAt || null);
  const [cabinNo, setCabinNo] = useState(user?.cabinNo || 'Cabin 101');
  const [isEditingCabin, setIsEditingCabin] = useState(false);
  const [tempCabin, setTempCabin] = useState(user?.cabinNo || 'Cabin 101');
  const [statusMessage, setStatusMessage] = useState(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Sync active tab with URL query parameter
  // No ?tab= param  → OVERVIEW (Clinical EMR Desk)
  // ?tab=LIVE        → Queued Patients
  // ?tab=FOLLOW_UPS  → Follow-Up Visits & Missed Calls
  // ?tab=COMPLETED   → Completed Visits
  // ?tab=DEPT_RESPONSES → Department Responses
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && ['LIVE', 'COMPLETED', 'SENT_DEPARTMENTS', 'DEPT_RESPONSES', 'FOLLOW_UPS'].includes(tabParam.toUpperCase())) {
      setActiveTab(tabParam.toUpperCase() === 'SENT_DEPARTMENTS' ? 'DEPT_RESPONSES' : tabParam.toUpperCase());
    } else {
      setActiveTab('OVERVIEW');
    }
  }, [location.search]);

  const handleTabClick = (tabKey) => {
    setActiveTab(tabKey);
    const searchParams = new URLSearchParams(location.search);
    if (tabKey === 'OVERVIEW') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', tabKey);
    }
    const newSearch = searchParams.toString();
    navigate({
      pathname: location.pathname,
      search: newSearch ? `?${newSearch}` : '',
    }, { replace: true });
  };

  useEffect(() => {
    fetchOpdQueue();
    fetchDepartmentOrders();
    fetchSubstitutionRequests();
  }, []);

  // Listen to Socket.IO for real-time queue updates and department investigation report uploads
  useEffect(() => {
    if (!socket) return;

    const handleQueueUpdate = () => {
      fetchOpdQueue();
    };

    const handleInvestigationUpdate = (data) => {
      fetchDepartmentOrders();
      const activePatientId = selectedToken?.patientId?._id || selectedToken?.patientId || currentPatient?._id || currentPatient?.id;
      if (activePatientId) {
        fetchPatientInvestigations(activePatientId);
      }
      if (data && data.orderId) {
        addNotification({
          orderId: data.orderId,
          patientId: data.patientId,
          patientName: data.patientName,
          uhid: data.uhid,
          testName: data.testName,
          status: data.status || 'COMPLETED',
          reportSummary: data.reportSummary || '',
          title: `Report Ready: ${data.testName || 'Investigation'}`,
        });
      }
    };

    const handleDoctorAvailability = (data) => {
      const myId = user?.id || user?._id;
      if (String(data.id || data._id) === String(myId)) {
        if (data.isAvailable !== undefined) setIsAvailable(Boolean(data.isAvailable));
        if (data.cabinNo) {
          setCabinNo(data.cabinNo);
          setTempCabin(data.cabinNo);
        }
        if (data.availabilityUpdatedAt) setAvailabilityUpdatedAt(data.availabilityUpdatedAt);
      }
    };

    socket.on('opd_queue:updated', handleQueueUpdate);
    socket.on('opd_queue:status_changed', handleQueueUpdate);
    socket.on('queue:patient_added', handleQueueUpdate);
    socket.on('token:generated', handleQueueUpdate);
    socket.on('investigation:new_request', handleInvestigationUpdate);
    socket.on('investigation:status_updated', handleInvestigationUpdate);
    socket.on('diagnostics:report_ready', handleInvestigationUpdate);
    socket.on('doctor:availability_changed', handleDoctorAvailability);
    socket.on('workflow:notification', () => { fetchOpdQueue(); fetchDepartmentOrders(); fetchSubstitutionRequests(); });
    socket.on('queue:update', fetchOpdQueue);
    socket.on('department:order_update', () => { fetchDepartmentOrders(); fetchSubstitutionRequests(); });

    return () => {
      socket.off('workflow:notification');
      socket.off('queue:update', fetchOpdQueue);
      socket.off('department:order_update');
      socket.off('opd_queue:updated', handleQueueUpdate);
      socket.off('opd_queue:status_changed', handleQueueUpdate);
      socket.off('queue:patient_added', handleQueueUpdate);
      socket.off('token:generated', handleQueueUpdate);
      socket.off('investigation:new_request', handleInvestigationUpdate);
      socket.off('investigation:status_updated', handleInvestigationUpdate);
      socket.off('diagnostics:report_ready', handleInvestigationUpdate);
      socket.off('doctor:availability_changed', handleDoctorAvailability);
    };
  }, [socket, selectedToken]);

  useEffect(() => {
    if (user?.isAvailable !== undefined) {
      setIsAvailable(user.isAvailable);
    }
    if (user?.cabinNo) {
      setCabinNo(user.cabinNo);
      setTempCabin(user.cabinNo);
    }
  }, [user?.isAvailable, user?.cabinNo]);

  const fetchOpdQueue = async () => {
    try {
      const res = await axiosClient.get('/appointments/queue');
      const allTokens = res.data || [];
      const waiting = allTokens.filter((t) => ['WAITING', 'IN_CONSULTATION'].includes(t.status));
      const done = allTokens.filter((t) => t.status === 'COMPLETED');
      const held = allTokens.filter((t) => t.status === 'WAITING_DEPARTMENT');

      setLiveQueue(waiting);
      setCompletedQueue(done);
      setDepartmentHoldQueue(held);

      if (waiting.length > 0) {
        setSelectedToken((prev) => {
          if (prev && waiting.some((w) => w._id === prev._id)) {
            return prev;
          }
          const activeTok = waiting[0];
          fetchPatientInvestigations(activeTok.patientId?._id || activeTok.patientId);
          return activeTok;
        });
      } else if (done.length > 0 && !selectedToken) {
        setSelectedToken(null);
        setPatientInvestigations([]);
      }
    } catch (err) {
      console.error('Failed to load doctor OPD queue:', err);
    }
  };
  const fetchLiveQueue = fetchOpdQueue;
  // console.log("fetchlivequeue", fetchLiveQueue)

  const fetchSubstitutionRequests = async () => {
    try {
      const res = await axiosClient.get('/pharmacy/substitutions/pending');
      setSubstitutionRequests(res.data || []);
    } catch (err) {
      // Not a critical error — may 403 if not a doctor role
    }
  };

  const handleSubstitutionResponse = async (id, action) => {
    try {
      // Backend expects { status: 'APPROVED'|'REJECTED', doctorNotes? }
      await axiosClient.patch(`/pharmacy/substitutions/${id}/respond`, {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        doctorNotes: action === 'APPROVE' ? 'Approved by Doctor' : 'Rejected by Doctor',
      });
      fetchSubstitutionRequests();
    } catch (err) {
      console.error('Failed to respond to substitution:', err);
    }
  };

  const fetchDepartmentOrders = async () => {
    try {
      const res = await axiosClient.get('/diagnostics/orders');
      setDepartmentOrders(res.data || []);
    } catch (err) {
      console.error('Failed to load department orders:', err);
    }
  };

  const fetchPatientInvestigations = async (patientId) => {
    if (!patientId) return;
    try {
      const res = await axiosClient.get(`/diagnostics/patient/${patientId}`);
      setPatientInvestigations(res.data || []);
    } catch (err) {
      console.error('Failed to load patient investigations:', err);
    }
  };

  const handleSelectToken = (tok) => {
    setSelectedToken(tok);
    fetchPatientInvestigations(tok.patientId?._id || tok.patientId);
  };

  const currentPatient = selectedToken?.patientId;

  // Filtered lists for Side Navbar Queue Search
  const filteredLiveQueue = liveQueue.filter((tok) => {
    const pat = tok.patientId || {};
    const name = `${pat.firstName || ''} ${pat.lastName || ''}`.toLowerCase();
    const uhid = (pat.uhid || '').toLowerCase();
    const tokenNo = String(tok.tokenNumber || '');
    const search = queueSearchTerm.toLowerCase();
    return name.includes(search) || uhid.includes(search) || tokenNo.includes(search);
  });

  const filteredCompletedQueue = completedQueue.filter((tok) => {
    const pat = tok.patientId || {};
    const name = `${pat.firstName || ''} ${pat.lastName || ''}`.toLowerCase();
    const uhid = (pat.uhid || '').toLowerCase();
    const tokenNo = String(tok.tokenNumber || '');
    const search = queueSearchTerm.toLowerCase();
    return name.includes(search) || uhid.includes(search) || tokenNo.includes(search);
  });

  const doctorUserId = String(user?.id || user?._id || '');
  const departmentResponses = departmentOrders.filter((ord) => {
    const isDocMatch = !doctorUserId || String(ord.doctorId?._id || ord.doctorId || '') === doctorUserId;
    const isResolved = ord.chargeStatus === 'INCLUDED_IN_FINAL_BILL' || ord.chargeStatus === 'CANCELLED';
    return isDocMatch && !isResolved;
  });
  const sentPatientInvestigations = patientInvestigations.filter((ord) => !['REPORT_UPLOADED', 'COMPLETED'].includes(ord.status));

  const filteredDeptOrders = departmentResponses.filter((ord) => {
    const pName = (ord.patientName || '').toLowerCase();
    const uhid = (ord.uhid || '').toLowerCase();
    const tName = (ord.testName || '').toLowerCase();
    const search = queueSearchTerm.toLowerCase();
    return pName.includes(search) || uhid.includes(search) || tName.includes(search);
  });

  const pendingReportsCount = departmentResponses.filter((ord) =>
    ['REPORT_UPLOADED', 'COMPLETED'].includes(ord.status) && !ord.reviewedAt && ord.chargeStatus !== 'CANCELLED'
  ).length;

  const departmentLabel = (category) => ['XRAY', 'MRI', 'CT_SCAN', 'ULTRASOUND', 'RADIOLOGY'].includes(category)
    ? 'Radiology / X-Ray'
    : ['LABORATORY', 'BLOOD_TEST', 'URINE_ANALYSIS', 'URINE_TEST', 'CULTURE_TEST', 'BIOPSY', 'PATHOLOGY'].includes(category)
      ? 'Laboratory'
      : category?.replaceAll('_', ' ') || 'Department';

  const displayWorkflowStatus = (order) => {
    if (order.reviewedAt || order.status === 'REVIEWED') return 'VIEWED BY DOCTOR';
    if (['REPORT_UPLOADED', 'COMPLETED'].includes(order.status)) return 'COMPLETED';
    if (order.status === 'IN_PROGRESS') return 'IN PROGRESS';
    if (order.status === 'ACCEPTED') return 'ACCEPTED';
    return 'PENDING';
  };

  const statusClass = (status) => ({
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    ACCEPTED: 'bg-blue-50 text-blue-700 border-blue-200',
    'IN PROGRESS': 'bg-violet-50 text-violet-700 border-violet-200',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'VIEWED BY DOCTOR': 'bg-slate-100 text-slate-700 border-slate-300',
  }[status] || 'bg-slate-50 text-slate-700 border-slate-200');

  const handleContinueConsultation = async (ord) => {
    markAsRead(ord._id);
    try {
      await axiosClient.post(`/diagnostics/orders/${ord._id}/approve-charge`);
      resolvePending(ord._id);
      fetchDepartmentOrders();
    } catch (e) {
      console.error('Failed to approve charge:', e);
    }

    let targetToken = departmentHoldQueue.find((t) => String(t._id) === String(ord.appointmentId?._id || ord.appointmentId))
      || liveQueue.find((t) => String(t._id) === String(ord.appointmentId?._id || ord.appointmentId))
      || liveQueue.find((t) => String(t.patientId?._id || t.patientId) === String(ord.patientId?._id || ord.patientId))
      || departmentHoldQueue.find((t) => String(t.patientId?._id || t.patientId) === String(ord.patientId?._id || ord.patientId))
      || completedQueue.find((t) => String(t.patientId?._id || t.patientId) === String(ord.patientId?._id || ord.patientId));

    if (!targetToken) {
      const patientObj = typeof ord.patientId === 'object' && ord.patientId !== null
        ? ord.patientId
        : {
            _id: ord.patientId || `pat_${Date.now()}`,
            firstName: (ord.patientName || 'Patient').split(' ')[0] || 'Patient',
            lastName: (ord.patientName || '').split(' ').slice(1).join(' ') || '',
            uhid: ord.uhid || 'UHID',
            gender: 'GENERAL',
          };

      targetToken = {
        _id: ord.appointmentId?._id || ord.appointmentId || `apt_${Date.now()}`,
        tokenNumber: ord.tokenNumber || 1,
        status: 'IN_CONSULTATION',
        patientId: patientObj,
        chiefComplaints: `Follow-up on ${departmentLabel(ord.testCategory)}: ${ord.testName}`,
      };
    }

    setSelectedToken(targetToken);
    fetchPatientInvestigations(targetToken.patientId?._id || targetToken.patientId || ord.patientId);
    setIsConsultationModalOpen(true);
  };

  const handleCancelToken = async (tokenId) => {
    if (!window.confirm('Are you sure you want to cancel this duplicate token / appointment?')) return;
    try {
      await axiosClient.patch(`/appointments/tokens/${tokenId}/status`, { status: 'CANCELLED' });
      fetchOpdQueue();
      useDepartmentNotificationStore.getState().fetchPendingWork?.();
    } catch (err) {
      console.error('Failed to cancel token:', err);
      alert(err.response?.data?.message || 'Failed to cancel duplicate token');
    }
  };

  // Toggle Doctor Availability (Online / Offline)
  const handleToggleAvailability = async () => {
    const nextState = !isAvailable;
    setIsTogglingStatus(true);
    setStatusMessage(null);
    try {
      const targetId = user?.id || user?._id || 'me';
      const res = await axiosClient.patch(`/auth/staff/${targetId}/availability`, {
        isAvailable: nextState,
        cabinNo,
      });

      const payload = res.data?.data || res.data;
      const updatedAvailable = payload.isAvailable !== undefined ? payload.isAvailable : nextState;

      setIsAvailable(Boolean(updatedAvailable));
      setAvailabilityUpdatedAt(payload.availabilityUpdatedAt || new Date());

      // Sync authStore user state and localStorage
      if (user) {
        const updatedUser = { ...user, isAvailable: Boolean(updatedAvailable), cabinNo };
        useAuthStore.setState({ user: updatedUser });
        try {
          localStorage.setItem('hpmbs_user', JSON.stringify(updatedUser));
        } catch (e) {
          // ignore storage errors
        }
      }

      setStatusMessage({
        type: 'success',
        text: `Doctor status updated to ${updatedAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}.`,
      });
    } catch (err) {
      console.error('Failed to update availability:', err);
      setStatusMessage({
        type: 'error',
        text: 'Unable to update availability status. Please try again.',
      });
    } finally {
      setIsTogglingStatus(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Save OPD Cabin Number
  const handleSaveCabin = async (e) => {
    e?.preventDefault();
    if (!tempCabin.trim()) return;
    setIsTogglingStatus(true);
    setStatusMessage(null);
    try {
      const targetId = user?.id || user?._id || 'me';
      const res = await axiosClient.patch(`/auth/staff/${targetId}/availability`, {
        isAvailable,
        cabinNo: tempCabin.trim(),
      });

      const payload = res.data?.data || res.data;
      const updatedCabin = payload.cabinNo || tempCabin.trim();

      setCabinNo(updatedCabin);
      setIsEditingCabin(false);
      setStatusMessage({
        type: 'success',
        text: `Assigned OPD Cabin updated to '${updatedCabin}'.`,
      });
    } catch (err) {
      console.error('Failed to update cabin:', err);
      setStatusMessage({
        type: 'error',
        text: 'Failed to save OPD Cabin number.',
      });
    } finally {
      setIsTogglingStatus(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in p-6 min-h-full">

      {/* OPD Cabin Edit Modal — always rendered (controls visibility via isOpen) */}
      <Modal
        isOpen={isEditingCabin}
        onClose={() => setIsEditingCabin(false)}
        title="Assign OPD Cabin / Room Number"
        subtitle="Set your active consultation room for patient token assignments"
        icon={DoorClosed}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveCabin} className="space-y-4 text-xs pt-2">
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              Assigned OPD Cabin / Room Number:
            </label>
            <input
              type="text"
              className="w-full glass-input rounded-xl p-3 text-sm text-slate-900 font-bold font-mono focus:border-blue-500"
              placeholder="e.g. Cabin 102, Room 304, Block B-12"
              value={tempCabin}
              onChange={(e) => setTempCabin(e.target.value)}
              required
              autoFocus
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              This cabin number will be displayed on Reception Token Tickets and patient queue displays.
            </p>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              className="w-1/2 font-bold text-xs"
              onClick={() => setIsEditingCabin(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="w-1/2 font-bold text-xs gap-1.5"
              isLoading={isTogglingStatus}
            >
              <Check size={16} /> Save Cabin Number
            </Button>
          </div>
        </form>
      </Modal>

      {/* Solo Doctor Patient Journey Quick-Action Flow Bar */}
      {isDualModeEligible(user) && (
        <SoloDoctorFlowBar activeStepOverride={activeTab === 'LIVE' ? 'token' : 'consult'} />
      )}

      {/* ── OVERVIEW (Clinical EMR Desk) ── Header + Stat Cards + Live Queue Workspace */}
      {activeTab === 'OVERVIEW' && (
        <>
          {/* Premium Professional Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-slate-900">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Doctor Clinical EMR Workstation</h2>

                {/* Status Badge */}
                {isAvailable ? (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-xs shadow-xs">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                    </span>
                    <span>AVAILABLE</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-extrabold text-xs">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-600"></span>
                    <span>UNAVAILABLE</span>
                  </div>
                )}

                {/* OPD Cabin Badge */}
                <button
                  onClick={() => { setTempCabin(cabinNo); setIsEditingCabin(true); }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 hover:border-indigo-400 text-indigo-700 font-extrabold text-xs transition-all shadow-xs group"
                  title="Click to edit your assigned OPD Cabin / Consultation Room"
                >
                  <DoorClosed size={15} className="group-hover:scale-110 transition-transform text-indigo-600" />
                  <span>OPD Cabin: <strong className="text-slate-900 ml-0.5">{cabinNo}</strong></span>
                  <Pencil size={12} className="text-indigo-500 ml-1 opacity-70 group-hover:opacity-100" />
                </button>
              </div>

              <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-2">
                <span>{user?.name || 'Doctor / Consultant'} — Live OPD Queue Desk</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono text-slate-700 font-bold">{cabinNo}</span>
                {availabilityUpdatedAt && (
                  <span className="text-slate-500 font-mono text-[11px]">
                    (Updated: {new Date(availabilityUpdatedAt).toLocaleTimeString()})
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="font-bold gap-1.5 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                onClick={() => {
                  setHistoryPatientId('');
                  setIsHistoryOpen(true);
                }}
              >
                <History size={14} /> Lookup History (UHID)
              </Button>

              <Button
                size="sm"
                variant={isAvailable ? 'danger' : 'success'}
                className="font-bold gap-2 text-xs shadow-lg"
                isLoading={isTogglingStatus}
                onClick={handleToggleAvailability}
              >
                <Power size={14} />
                {isAvailable ? 'Mark as Unavailable' : 'Mark as Available'}
              </Button>
            </div>
          </div>

          {statusMessage && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              <span className="font-medium">{statusMessage.text}</span>
              <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-700 font-bold ml-2 p-1 rounded hover:bg-slate-100 transition-colors">
                <X size={14} />
              </button>
            </div>
          )}

          {/* ── OFFLINE WARNING BANNER ── */}
          {!isAvailable && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-rose-50 via-rose-50/90 to-amber-50/40 border-2 border-rose-200 shadow-sm animate-fade-in">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100/90 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <Lock size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                    <p className="font-black text-rose-900 text-sm tracking-tight">
                      You are currently OFFLINE &bull; Unavailable for new patient consultations
                    </p>
                  </div>
                  <p className="text-xs text-rose-700/90 font-medium mt-0.5 flex items-center gap-1">
                    {liveQueue.length > 0
                      ? (
                        <>
                          <AlertTriangle size={13} className="text-rose-600 inline shrink-0" />
                          <span>You still have {liveQueue.length} patient(s) in your queue from before going offline. Please attend them or reassign.</span>
                        </>
                      )
                      : 'Reception cannot issue new tokens to you while you are offline. Go online when you are ready to consult.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isTogglingStatus}
                onClick={handleToggleAvailability}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md transition-all active:scale-[0.97] cursor-pointer disabled:opacity-50 shrink-0 self-end sm:self-auto"
              >
                {isTogglingStatus ? (
                  <span className="inline-block animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Wifi size={14} className="shrink-0" />
                )}
                <span>Go Online Now</span>
              </button>
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="OPD Live Queue" value={`${liveQueue.length} Patients`} subtitle="Waiting Consultation" icon={Users} color="sky" />
            <StatCard title="Completed Consultations" value={`${completedQueue.length} Patients`} subtitle="Moved to History" icon={CheckCircle2} color="emerald" />
            <StatCard title="Department Responses" value={`${pendingReportsCount} Ready Reports`} subtitle={`${departmentOrders.length} Total Orders`} icon={FileCheck2} color="amber" />
            <StatCard title="Prescriptions Written" value={`${completedQueue.length}`} subtitle="FEFO Auto-Checked" icon={Pill} color="purple" />
          </div>
        </>
      )}

      {/* ── WORKSTATION SUB-NAVIGATION TABS ── */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto bg-white/60 p-2 rounded-xl border">
        <button
          onClick={() => handleTabClick('OVERVIEW')}
          className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'OVERVIEW' || activeTab === 'LIVE'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users size={15} />
          <span>Live OPD Queue ({liveQueue.length})</span>
        </button>

        <button
          onClick={() => handleTabClick('FOLLOW_UPS')}
          className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'FOLLOW_UPS'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Calendar size={15} />
          <span>Follow-Up Visits & Missed Calls</span>
        </button>

        <button
          onClick={() => handleTabClick('COMPLETED')}
          className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'COMPLETED'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <CheckCircle2 size={15} />
          <span>Completed Consultations ({completedQueue.length})</span>
        </button>

        <button
          onClick={() => handleTabClick('DEPT_RESPONSES')}
          className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'DEPT_RESPONSES'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FileCheck2 size={15} />
          <span>Department Responses ({pendingReportsCount})</span>
        </button>
      </div>

      {/* ── TAB VIEWS (Queued / Completed / Dept Responses) ── Search Bar + Content only */}
      {activeTab !== 'OVERVIEW' && activeTab !== 'FOLLOW_UPS' && (
        <div className="relative">
          <input
            type="text"
            placeholder="Search patient, token, test, UHID..."
            value={queueSearchTerm}
            onChange={(e) => setQueueSearchTerm(e.target.value)}
            className="w-full glass-input rounded-xl py-2.5 pl-9 pr-3 text-xs text-slate-900"
          />
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
        </div>
      )}

      {/* Main EMR Content Area based on Active Sub-Navbar Tab */}
      {(activeTab === 'LIVE' || activeTab === 'OVERVIEW') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Queued Patient List */}
          <Card className="lg:col-span-1 space-y-3 bg-white border border-slate-200 shadow-sm text-black">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-2">
                <Users size={16} className="text-sky-600" />
                Live OPD Token Queue ({filteredLiveQueue.length})
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 font-black border border-indigo-200">
                {cabinNo}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredLiveQueue.length > 0 ? (
                filteredLiveQueue.map((tok) => {
                  const pat = tok.patientId || {};
                  const isSelected = selectedToken?._id === tok._id;
                  return (
                    <div
                      key={tok._id}
                      onClick={() => handleSelectToken(tok)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-400 shadow-sm scale-[1.01]'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] bg-emerald-600 text-white font-black">
                          TOKEN #{tok.tokenNumber}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${
                            tok.status === 'IN_CONSULTATION'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 animate-pulse'
                              : 'bg-amber-50 text-amber-700 border-amber-300'
                          }`}>
                            {tok.status === 'IN_CONSULTATION' ? 'IN CONSULT' : 'WAITING'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelToken(tok._id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                            title="Cancel Duplicate Token / Appointment"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>

                      <p className="font-extrabold text-slate-900 text-xs tracking-tight">{pat.firstName} {pat.lastName}</p>
                      <p className="text-[11px] text-indigo-700 font-mono font-bold mt-0.5">{pat.uhid || 'UHID'} • {pat.gender || 'M'}</p>
                      <p className="text-[11px] text-amber-800 font-bold mt-1 truncate">
                        Chief: {tok.chiefComplaints || 'OPD Checkup'}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  {queueSearchTerm ? 'No matching queue records.' : 'No active patients in live queue.'}
                </div>
              )}
            </div>
          </Card>

          {/* Consultation Workspace for Selected Patient */}
          <Card className="lg:col-span-2 space-y-4 bg-white border border-slate-200 shadow-sm text-black">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-black flex items-center gap-2">
                <Stethoscope size={18} className="text-emerald-600" />
                Patient Consultation Workspace
              </h3>
            </div>

          {selectedToken && currentPatient ? (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-slate-600 text-xs font-bold">Active Patient:</p>
                  <p className="text-base font-black text-black">
                    {currentPatient.firstName} {currentPatient.lastName} • {currentPatient.gender} • Blood: {currentPatient.bloodGroup || 'O+'}
                  </p>
                  <p className="text-xs text-indigo-700 font-mono font-bold mt-0.5">UHID: {currentPatient.uhid} • Phone: {currentPatient.phone || 'N/A'}</p>
                  <p className="text-xs text-amber-800 font-extrabold mt-1">Chief Complaint: {selectedToken.chiefComplaints || 'Check-up'}</p>
                </div>

                <span className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-300 font-mono font-black text-sm">
                  TOKEN #{selectedToken.tokenNumber}
                </span>
              </div>

              {/* Primary Consultation Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <Button
                  size="md"
                  variant="success"
                  className="font-bold py-3 text-xs flex flex-col items-center justify-center gap-1 shadow-sm"
                  onClick={() => setIsConsultationModalOpen(true)}
                >
                  <Stethoscope size={18} />
                  <span>Start Consultation</span>
                </Button>

                <Button
                  size="md"
                  variant="primary"
                  className="font-bold py-3 text-xs flex flex-col items-center justify-center gap-1 shadow-sm bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => setIsInjectionModalOpen(true)}
                >
                  <Syringe size={18} />
                  <span>Send to Nurse / Injection</span>
                </Button>

                <Button
                  size="md"
                  variant="primary"
                  className="font-bold py-3 text-xs flex flex-col items-center justify-center gap-1 shadow-sm bg-sky-600 hover:bg-sky-700 text-white"
                  onClick={() => setIsRequestModalOpen(true)}
                >
                  <TestTube size={18} />
                  <span>Request Test</span>
                </Button>

                <Button
                  size="md"
                  variant="warning"
                  className="font-bold py-3 text-xs flex flex-col items-center justify-center gap-1 shadow-sm"
                  onClick={() => setIsAdmitModalOpen(true)}
                >
                  <BedDouble size={18} />
                  <span>Recommend IPD</span>
                </Button>

                <Button
                  size="md"
                  variant="outline"
                  className="font-bold py-3 text-xs flex flex-col items-center justify-center gap-1 shadow-sm border-indigo-200 text-indigo-700 hover:bg-indigo-50 col-span-2 sm:col-span-1"
                  onClick={() => {
                    setHistoryPatientId(currentPatient?.uhid || currentPatient?._id);
                    setIsHistoryOpen(true);
                  }}
                >
                  <History size={18} />
                  <span>Past History</span>
                </Button>
              </div>

              {/* Department requests are tracked exclusively from the dedicated sidebar module. */}
              {false && (<div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-extrabold text-black flex items-center gap-1.5 text-xs">
                    <FileCheck2 className="text-sky-600" size={16} />
                    Sent to Departments ({sentPatientInvestigations.length})
                  </h4>
                </div>

                <div className="space-y-2">
                  {sentPatientInvestigations.length > 0 ? (
                    sentPatientInvestigations.map((inv) => (
                      <div key={inv._id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2 text-black">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-600 text-white">
                              {inv.testCategory}
                            </span>
                            <span className="font-extrabold text-black text-sm">{inv.testName}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${
                              inv.priority === 'EMERGENCY' ? 'bg-red-100 text-red-700 border-red-300 animate-pulse' :
                              inv.priority === 'URGENT' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                              'bg-slate-200 text-slate-700'
                            }`}>
                              {inv.priority}
                            </span>
                          </div>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            inv.status === 'REQUESTED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            inv.status === 'DEPARTMENT_RECEIVED' || inv.status === 'ACCEPTED' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                            inv.status === 'IN_PROGRESS' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {inv.status}
                          </span>
                        </div>

                        {inv.status === 'REPORT_UPLOADED' || inv.status === 'COMPLETED' ? (
                          <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-emerald-900">Findings: "{inv.reportSummary}"</span>
                              <span className="text-[10px] text-slate-600 font-bold">By: {inv.technicianName}</span>
                            </div>
                            {inv.attachments?.length > 0 && (
                              <div className="flex gap-2 pt-1">
                                {inv.attachments.map((att, idx) => (
                                  <a
                                    key={idx}
                                    href={att.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => markAsRead(inv._id)}
                                    className="px-2 py-1 rounded bg-white border border-slate-300 text-sky-700 hover:text-sky-900 font-bold text-[11px] flex items-center gap-1 shadow-xs"
                                  >
                                    <Eye size={12} /> View Report Scan ({att.fileName})
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex justify-between text-[11px] text-slate-600">
                            <span className="font-medium">Clinical Notes: {inv.clinicalNotes || 'None'}</span>
                            <span className="font-mono">Requested at: {new Date(inv.createdAt).toLocaleTimeString()}</span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-500 text-xs">No department requests are currently pending. Completed results move to Department Responses.</div>
                  )}
                </div>
              </div>)}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm">
              No patient currently selected. When receptionist registers a patient and issues a token, they will appear in your live queue!
            </div>
          )}
        </Card>
      </div>
      )}

      {/* COMPLETED VISITS TAB */}
      {activeTab === 'COMPLETED' && (
        <Card className="space-y-4 bg-white border border-slate-200 shadow-sm text-black">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-base font-extrabold text-black flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              Completed Consultation History ({filteredCompletedQueue.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-900 uppercase tracking-wider text-[10px] border-b border-slate-200 font-bold">
                <tr>
                  <th className="p-3">Token #</th>
                  <th className="p-3">UHID</th>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Chief Complaint</th>
                  <th className="p-3">Finalized Time</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-black">
                {filteredCompletedQueue.length > 0 ? (
                  filteredCompletedQueue.map((tok) => {
                    const pat = tok.patientId || {};
                    return (
                      <tr key={tok._id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-emerald-700">#{tok.tokenNumber}</td>
                        <td className="p-3 font-mono font-bold text-indigo-700">{pat.uhid || '—'}</td>
                        <td className="p-3 font-extrabold text-black">{pat.firstName} {pat.lastName}</td>
                        <td className="p-3 text-amber-800 font-bold">{tok.chiefComplaints || 'Checkup'}</td>
                        <td className="p-3 text-slate-600 font-medium">{new Date(tok.updatedAt || tok.createdAt).toLocaleTimeString()}</td>
                        <td className="p-3 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            FINALISED &amp; BILLED
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      No completed consultations recorded today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* DEPARTMENT RESPONSES TAB */}
      {activeTab === 'DEPT_RESPONSES' && (
        <Card className="space-y-4 bg-white border border-slate-200 shadow-sm text-black">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-black flex items-center gap-2">
                <FileCheck2 size={18} className="text-amber-600" />
                Department Request & Response Tracker ({filteredDeptOrders.length})
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                Track each request from dispatch through processing, report submission, and doctor review.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-900 uppercase tracking-wider text-[10px] border-b border-slate-200 font-bold">
                <tr>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Token / Patient ID</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Requested Service</th>
                  <th className="p-3">Sent Time</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Response Time</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-black">
                {filteredDeptOrders.length > 0 ? (
                  filteredDeptOrders.map((ord) => {
                    const workflowStatus = displayWorkflowStatus(ord);
                    const isDepartmentLocked = !['REPORT_UPLOADED', 'COMPLETED', 'REVIEWED'].includes(ord.status);
                    return (
                      <tr key={ord._id} className={`transition-colors ${isDepartmentLocked ? 'bg-slate-50/80 text-slate-500' : 'hover:bg-slate-50'}`}>
                        <td className="p-3 font-bold text-black">{ord.patientName}</td>
                        <td className="p-3"><span className="font-mono font-black text-indigo-700">#{ord.tokenNumber || '—'}</span><div className="font-mono text-[10px] text-slate-500">{ord.uhid}</div></td>
                        <td className="p-3 font-bold text-slate-800">{departmentLabel(ord.testCategory)}</td>
                        <td className="p-3 font-extrabold text-black">{ord.testName}</td>
                        <td className="p-3 text-slate-600 whitespace-nowrap">{new Date(ord.createdAt).toLocaleString()}</td>
                        <td className="p-3"><span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-black whitespace-nowrap ${statusClass(workflowStatus)}`}>{workflowStatus}</span></td>
                        <td className="p-3 text-slate-600 whitespace-nowrap">{ord.responseSubmittedAt || ord.completedAt ? new Date(ord.responseSubmittedAt || ord.completedAt).toLocaleString() : '—'}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {ord.attachments?.length > 0 && (
                              <a
                                href={ord.attachments[0].fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 font-bold text-[11px] inline-flex items-center gap-1 shadow-xs"
                              >
                                <Eye size={12} /> View Scan
                              </a>
                            )}

                            {['REPORT_UPLOADED', 'COMPLETED', 'REVIEWED'].includes(ord.status) || ord.reviewedAt || ord.chargeStatus === 'APPROVED' ? (
                              <>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      markAsRead(ord._id);
                                      try {
                                        await axiosClient.post(`/diagnostics/orders/${ord._id}/approve-charge`);
                                        resolvePending(ord._id);
                                        fetchDepartmentOrders();
                                      } catch (e) {
                                        console.error('Failed to approve charge:', e);
                                      }
                                    }}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer ${
                                      ord.chargeStatus === 'APPROVED' || ord.reviewedAt
                                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-700 font-extrabold'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                                    }`}
                                  >
                                    <CheckCircle2 size={12} />
                                    {ord.chargeStatus === 'APPROVED' || ord.reviewedAt ? 'Reviewed & Accepted' : 'Mark as Reviewed'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleContinueConsultation(ord)}
                                    className="px-3 py-1 rounded-lg font-bold text-[11px] bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
                                    title="Open consultation with this patient and finalize diagnosis/bill"
                                  >
                                    <Stethoscope size={13} />
                                    Continue Consultation & Bill
                                  </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="px-2.5 py-1 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 bg-slate-100 text-slate-400 border border-slate-200 opacity-70 cursor-not-allowed"
                                title="Report is being processed by department. You will be unlocked when department submits final report."
                              >
                                <Lock size={12} /> {ord.status === 'IN_PROGRESS' ? 'Locked: In Progress' : ord.status === 'ACCEPTED' ? 'Locked: Accepted' : 'Locked: Pending'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      No department orders or reports found matching search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* PHARMACY SUBSTITUTION REQUESTS (shown inside DEPT_RESPONSES) */}
      {activeTab === 'DEPT_RESPONSES' && substitutionRequests.filter(r => r.status === 'PENDING').length > 0 && (
        <Card className="space-y-3 bg-white border border-amber-200 shadow-sm">
          <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
            <Pill size={18} className="text-amber-600" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Pharmacy Substitution Requests ({substitutionRequests.filter(r => r.status === 'PENDING').length})</h3>
              <p className="text-xs text-slate-500 mt-0.5">Pharmacist is requesting your approval to substitute a prescribed medicine. Review and respond.</p>
            </div>
          </div>
          <div className="divide-y divide-amber-50 text-xs">
            {substitutionRequests.filter(r => r.status === 'PENDING').map((req) => (
              <div key={req._id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-900 text-sm">
                    {req.patientId?.firstName} {req.patientId?.lastName}
                    <span className="ml-2 font-mono text-indigo-600 text-xs">{req.patientId?.uhid}</span>
                  </p>
                  <p className="text-slate-600">
                    <span className="font-bold text-rose-600">Original:</span> {req.originalMedicineName}
                    {' '}&rarr;{' '}
                    <span className="font-bold text-emerald-600">Suggested:</span> {req.suggestedMedicineId?.name || 'See notes'}
                  </p>
                  <p className="text-slate-500">Reason: {req.reason}</p>
                  <p className="text-slate-400">Requested by: {req.requestedBy?.name || 'Pharmacist'} &middot; {new Date(req.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleSubstitutionResponse(req._id, 'APPROVE')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={13} /> Approve
                  </button>
                  <button
                    onClick={() => handleSubstitutionResponse(req._id, 'REJECT')}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5"
                  >
                    <X size={13} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* FOLLOW-UP VISITS TAB */}
      {activeTab === 'FOLLOW_UPS' && (
        <FollowUpVisitsSection
          onViewHistory={(id) => {
            setHistoryPatientId(id);
            setIsHistoryOpen(true);
          }}
        />
      )}

      {/* Pop-up Consultation Modal */}
      <ConsultationModal
        isOpen={isConsultationModalOpen}
        onClose={() => setIsConsultationModalOpen(false)}
        token={selectedToken}
        patient={currentPatient}
        onSuccess={() => {
          fetchOpdQueue();
          fetchDepartmentOrders();
          useDepartmentNotificationStore.getState().fetchPendingWork?.();
        }}
      />

      <RequestInvestigationModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        patient={currentPatient}
        appointmentId={selectedToken?._id}
        tokenNumber={selectedToken?.tokenNumber || 1}
        doctorId={selectedToken?.doctorId?._id || selectedToken?.doctorId || user?.id || user?._id}
        doctorName={selectedToken?.doctorId?.name ? `Dr. ${selectedToken.doctorId.name.replace(/^Dr\.\s*/i, '')}` : (user?.name ? `Dr. ${user.name.replace(/^Dr\.\s*/i, '')}` : 'Dr. Madhu Narayan')}
        onSuccess={() => {
          const dispatchedAppointmentId = selectedToken?._id;
          setLiveQueue((queue) => queue.filter((token) => String(token._id) !== String(dispatchedAppointmentId)));
          fetchPatientInvestigations(currentPatient?._id || currentPatient?.id);
          setSelectedToken(null);
          fetchOpdQueue();
          fetchDepartmentOrders();
        }}
      />

      <RequestInjectionModal
        isOpen={isInjectionModalOpen}
        onClose={() => setIsInjectionModalOpen(false)}
        patient={currentPatient}
        appointmentId={selectedToken?._id}
        tokenNumber={selectedToken?.tokenNumber || 1}
        doctorId={selectedToken?.doctorId?._id || selectedToken?.doctorId || user?.id || user?._id}
        doctorName={selectedToken?.doctorId?.name ? `Dr. ${selectedToken.doctorId.name.replace(/^Dr\.\s*/i, '')}` : (user?.name ? `Dr. ${user.name.replace(/^Dr\.\s*/i, '')}` : 'Doctor')}
        onSuccess={() => {
          const dispatchedAppointmentId = selectedToken?._id;
          setLiveQueue((queue) => queue.filter((token) => String(token._id) !== String(dispatchedAppointmentId)));
          setSelectedToken(null);
          fetchOpdQueue();
          fetchDepartmentOrders();
          useDepartmentNotificationStore.getState().fetchPendingWork?.();
        }}
      />

      <AdmitPatientModal
        isOpen={isAdmitModalOpen}
        onClose={() => setIsAdmitModalOpen(false)}
        patient={currentPatient}
      />

      {/* Longitudinal Patient Medical History Modal */}
      <PatientHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => {
          setIsHistoryOpen(false);
          setHistoryPatientId(null);
        }}
        initialIdentifier={historyPatientId}
      />
    </div>
  );
};
