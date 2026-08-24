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
  Receipt,
  AlertTriangle,
  Bell,
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
  const searchParams = new URLSearchParams(location.search);
  const requestedAppointmentId = searchParams.get('appointmentId');
  const requestedPatientId = searchParams.get('patientId');
  const requestedOrderId = searchParams.get('orderId');
  const requestedSubstitutionId = new URLSearchParams(location.search).get('substitutionId');
  const requestedNurseTaskId = new URLSearchParams(location.search).get('taskId');
  const requestedPatientRequestId = new URLSearchParams(location.search).get('requestId');
  const requestedInvoiceId = new URLSearchParams(location.search).get('invoiceId');
  const [doctorRequests, setDoctorRequests] = useState([]);
  const [queueSearchTerm, setQueueSearchTerm] = useState('');

  const [patientInvestigations, setPatientInvestigations] = useState([]);
  const [nurseTasks, setNurseTasks] = useState([]);
  const [patientNurseTasks, setPatientNurseTasks] = useState([]);
  const [returnedBillingPrescriptions, setReturnedBillingPrescriptions] = useState([]);
  const [selectedReturnedRx, setSelectedReturnedRx] = useState(null);
  const [resolvingBillingInvoiceId, setResolvingBillingInvoiceId] = useState(null);
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
  const [deptResponseSubTab, setDeptResponseSubTab] = useState('NURSE'); // 'NURSE' | 'DEPT_TRACKER'

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
    fetchNurseTasks();
    fetchReturnedBillingPrescriptions();
    fetchDoctorRequests();
  }, []);

  const handleQueueUpdate = () => {
    fetchOpdQueue();
    fetchReturnedBillingPrescriptions();
  };

  // Listen to Socket.IO for real-time queue updates and department investigation report uploads
  useEffect(() => {
    if (!socket) return;

    const handleInvestigationUpdate = (data) => {
      fetchDepartmentOrders();
      fetchNurseTasks();
      fetchReturnedBillingPrescriptions();
      const activePatientId = selectedToken?.patientId?._id || selectedToken?.patientId || currentPatient?._id || currentPatient?.id;
      if (activePatientId) {
        fetchPatientInvestigations(activePatientId);
        fetchPatientNurseTasks(activePatientId);
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

    const handleBillingQuery = () => {
      fetchOpdQueue();
      fetchReturnedBillingPrescriptions();
    };

    socket.on('opd_queue:updated', handleQueueUpdate);
    socket.on('opd_queue:status_changed', handleQueueUpdate);
    socket.on('queue:patient_added', handleQueueUpdate);
    socket.on('token:generated', handleQueueUpdate);
    socket.on('patient:registered', () => { fetchOpdQueue(); });
    socket.on('investigation:new_request', handleInvestigationUpdate);
    socket.on('investigation:status_updated', handleInvestigationUpdate);
    socket.on('diagnostics:report_ready', handleInvestigationUpdate);
    socket.on('doctor:availability_changed', handleDoctorAvailability);
    socket.on('doctor:billing_query', handleBillingQuery);
    socket.on('pharmacy:prescription_returned', handleBillingQuery);
    socket.on('workflow:notification', () => { fetchOpdQueue(); fetchDepartmentOrders(); fetchSubstitutionRequests(); fetchNurseTasks(); fetchReturnedBillingPrescriptions(); fetchDoctorRequests(); });
    socket.on('queue:update', fetchOpdQueue);
    socket.on('department:order_update', () => { fetchDepartmentOrders(); fetchSubstitutionRequests(); fetchNurseTasks(); fetchReturnedBillingPrescriptions(); });
    socket.on('workflow:pending_changed', () => { fetchOpdQueue(); fetchDepartmentOrders(); fetchNurseTasks(); fetchReturnedBillingPrescriptions(); });

    return () => {
      socket.off('workflow:notification');
      socket.off('queue:update', fetchOpdQueue);
      socket.off('department:order_update');
      socket.off('workflow:pending_changed');
      socket.off('opd_queue:updated', handleQueueUpdate);
      socket.off('opd_queue:status_changed', handleQueueUpdate);
      socket.off('queue:patient_added', handleQueueUpdate);
      socket.off('token:generated', handleQueueUpdate);
      socket.off('patient:registered');
      socket.off('investigation:new_request', handleInvestigationUpdate);
      socket.off('investigation:status_updated', handleInvestigationUpdate);
      socket.off('diagnostics:report_ready', handleInvestigationUpdate);
      socket.off('doctor:availability_changed', handleDoctorAvailability);
      socket.off('doctor:billing_query', handleBillingQuery);
      socket.off('pharmacy:prescription_returned', handleBillingQuery);
    };
  }, [socket, selectedToken, user?.id, user?._id]);

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
        const targetDocId = user?.id || user?._id;
        const res = await axiosClient.get('/appointments/queue', {
          params: targetDocId ? { doctorId: targetDocId } : {},
        });
        const allTokens = res.data || [];
        const waiting = allTokens.filter((t) => t.status === 'WAITING' || (t.status === 'IN_CONSULTATION' && !t.departmentReturnedAt));
        const done = allTokens.filter((t) => t.status === 'COMPLETED');
        const held = allTokens.filter((t) => ['WAITING_DEPARTMENT', 'WAITING_NURSE'].includes(t.status) || (t.departmentReturnedAt && t.status !== 'COMPLETED'));

        setLiveQueue(waiting);
        setCompletedQueue(done);
        setDepartmentHoldQueue(held);

        // Check if there is a direct shortcut appointmentId or patientId requested from notification or URL
        const params = new URLSearchParams(location.search);
        const reqApptId = params.get('appointmentId');
        const reqPatId = params.get('patientId');

        if (reqApptId) {
          const directMatch = allTokens.find((t) => String(t._id || t.id) === String(reqApptId));
          if (directMatch) {
            setSelectedToken(directMatch);
            const pId = directMatch.patientId?._id || directMatch.patientId;
            if (pId) {
              fetchPatientInvestigations(pId);
              fetchPatientNurseTasks(pId);
            }
            useDepartmentNotificationStore.getState().fetchPendingWork?.();
            return;
          }
        }

        if (reqPatId) {
          const directMatch = allTokens.find((t) => String(t.patientId?._id || t.patientId) === String(reqPatId));
          if (directMatch) {
            setSelectedToken(directMatch);
            const pId = directMatch.patientId?._id || directMatch.patientId;
            if (pId) {
              fetchPatientInvestigations(pId);
              fetchPatientNurseTasks(pId);
            }
            useDepartmentNotificationStore.getState().fetchPendingWork?.();
            return;
          }
        }

        if (waiting.length > 0) {
          setSelectedToken((prev) => {
            if (prev) {
              const currentId = String(prev._id || prev.id);
              const currentPatId = String(prev.patientId?._id || prev.patientId);
              const matchInWaitingOrHeld = [...waiting, ...held].find(
                (t) => String(t._id || t.id) === currentId || String(t.patientId?._id || t.patientId) === currentPatId
              );
              if (matchInWaitingOrHeld) return matchInWaitingOrHeld;

              // If previous patient was completed/billed or is no longer waiting/held, select the next waiting token
              const nextTok = waiting[0];
              const pId = nextTok.patientId?._id || nextTok.patientId;
              if (pId) {
                fetchPatientInvestigations(pId);
                fetchPatientNurseTasks(pId);
              }
              return nextTok;
            }
            const activeTok = waiting[0];
            const pId = activeTok.patientId?._id || activeTok.patientId;
            if (pId) {
              fetchPatientInvestigations(pId);
              fetchPatientNurseTasks(pId);
            }
            return activeTok;
          });
        } else {
          setSelectedToken((prev) => {
            if (prev) {
              const currentId = String(prev._id || prev.id);
              const currentPatId = String(prev.patientId?._id || prev.patientId);
              const matchInHeld = held.find(
                (t) => String(t._id || t.id) === currentId || String(t.patientId?._id || t.patientId) === currentPatId
              );
              if (matchInHeld) return matchInHeld;
            }
            setPatientInvestigations([]);
            setPatientNurseTasks([]);
            return null;
          });
        }
        useDepartmentNotificationStore.getState().fetchPendingWork?.();
      } catch (err) {
        console.error('Failed to load doctor OPD queue:', err);
      }
    };

    // Handle direct shortcut navigation from notifications when user is already on the page
    useEffect(() => {
      const params = new URLSearchParams(location.search);
      const reqApptId = params.get('appointmentId');
      const reqPatId = params.get('patientId');
      if (!reqApptId && !reqPatId) return;

      const allTokens = [...liveQueue, ...departmentHoldQueue, ...completedQueue];
      const match = allTokens.find((t) =>
        (reqApptId && String(t._id || t.id) === String(reqApptId)) ||
        (reqPatId && String(t.patientId?._id || t.patientId) === String(reqPatId))
      );
      if (match) {
        setSelectedToken(match);
        const pId = match.patientId?._id || match.patientId;
        if (pId) {
          fetchPatientInvestigations(pId);
          fetchPatientNurseTasks(pId);
        }
      }
    }, [location.search, liveQueue.length, departmentHoldQueue.length]);

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
      useNotificationStore.getState().resolveEntityNotification(id);
      resolvePending(id);
      useDepartmentNotificationStore.getState().fetchPendingWork?.();
      await fetchSubstitutionRequests();
      useNotificationStore.getState().fetchNotifications?.('active');
      setStatusMessage({ type: 'success', text: `Substitution request ${action === 'APPROVE' ? 'approved' : 'rejected'}.` });
    } catch (err) {
      console.error('Failed to respond to substitution:', err);
      setStatusMessage({ type: 'error', text: 'Failed to submit substitution response.' });
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

  const fetchNurseTasks = async () => {
    try {
      const targetDocId = user?.id || user?._id;
      const res = await axiosClient.get('/pharmacy/nurse-tasks', {
        params: targetDocId ? { doctorId: targetDocId } : {},
      });
      setNurseTasks(res.data || []);
    } catch (err) {
      console.error('Failed to load nurse tasks:', err);
    }
  };

  const fetchReturnedBillingPrescriptions = async () => {
    try {
const targetDocId = user?.id || user?._id;
      const [res, invoiceRes] = await Promise.all([
        axiosClient.get('/pharmacy/prescriptions', {
          params: targetDocId ? { doctorId: targetDocId } : {},
        }),
        axiosClient.get('/billing/doctor-review-queries'),
      ]);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      const returned = list.filter(
        (rx) => rx.dispenseStatus === 'RETURNED_TO_DOCTOR' || (rx.billingQuery && !rx.billingQuery.resolved)
      );
      const invoices = Array.isArray(invoiceRes?.data) ? invoiceRes.data : Array.isArray(invoiceRes) ? invoiceRes : [];
      const prescriptionInvoiceIds = new Set(returned.map((rx) => String(rx.billingQuery?.invoiceId || '')).filter(Boolean));
      const invoiceQueries = invoices
        .filter((invoice) => !prescriptionInvoiceIds.has(String(invoice._id)))
        .map((invoice) => ({
          _id: `invoice-query-${invoice._id}`,
          invoiceId: invoice._id,
          appointmentId: invoice.doctorReviewQuery?.appointmentId,
          patientId: invoice.patientId,
          medicines: [],
          invoiceItems: invoice.items || [],
          billingQuery: invoice.doctorReviewQuery,
          dispenseStatus: 'RETURNED_TO_DOCTOR',
          createdAt: invoice.createdAt,
          updatedAt: invoice.updatedAt,
        }));
      setReturnedBillingPrescriptions([...returned, ...invoiceQueries]);
    } catch (err) {
      console.error('Failed to load returned billing prescriptions:', err);
    }
  };

  const fetchDoctorRequests = async () => {
    try {
      const res = await axiosClient.get('/requests', { params: { category: 'DOCTOR' } });
      setDoctorRequests(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
    } catch (err) {
      if (err?.statusCode !== 403 && err?.response?.status !== 403) {
        console.error('Failed to load patient or guardian doctor requests:', err);
      }
      setDoctorRequests([]);
    }
  };

  const updateDoctorRequest = async (requestId, status) => {
    try {
      await axiosClient.patch(`/requests/${requestId}/status`, { status });
      useNotificationStore.getState().resolveEntityNotification(requestId);
      resolvePending(requestId);
      useDepartmentNotificationStore.getState().fetchPendingWork?.();
      await fetchDoctorRequests();
      useNotificationStore.getState().fetchNotifications?.('active');
      setStatusMessage({ type: 'success', text: `Doctor request marked as ${status.toLowerCase()}.` });
    } catch (err) {
      console.error('Failed to update doctor request:', err);
      setStatusMessage({ type: 'error', text: 'Failed to update doctor request.' });
    }
  };

  useEffect(() => {
    if (!requestedSubstitutionId || activeTab !== 'DEPT_RESPONSES' || substitutionRequests.length === 0) return;
    document.getElementById(`substitution-${requestedSubstitutionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [requestedSubstitutionId, activeTab, substitutionRequests]);

  useEffect(() => {
    if (!requestedNurseTaskId || activeTab !== 'DEPT_RESPONSES' || nurseTasks.length === 0) return;
    document.getElementById(`doctor-nurse-task-${requestedNurseTaskId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [requestedNurseTaskId, activeTab, nurseTasks]);

  useEffect(() => {
    if (!requestedPatientRequestId || activeTab !== 'DEPT_RESPONSES' || doctorRequests.length === 0) return;
    document.getElementById(`doctor-patient-request-${requestedPatientRequestId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [requestedPatientRequestId, activeTab, doctorRequests]);

  useEffect(() => {
    if (!requestedInvoiceId || activeTab !== 'DEPT_RESPONSES' || returnedBillingPrescriptions.length === 0) return;
    document.getElementById(`doctor-billing-query-${requestedInvoiceId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [requestedInvoiceId, activeTab, returnedBillingPrescriptions]);

  const fetchPatientInvestigations = async (patientId) => {
    if (!patientId) return;
    try {
      const res = await axiosClient.get(`/diagnostics/patient/${patientId}`);
      setPatientInvestigations(res.data || []);
    } catch (err) {
      console.error('Failed to load patient investigations:', err);
    }
  };

  const fetchPatientNurseTasks = async (patientId) => {
    if (!patientId) return;
    try {
      const res = await axiosClient.get('/pharmacy/nurse-tasks', {
        params: { patientId },
      });
      setPatientNurseTasks(res.data || []);
    } catch (err) {
      console.error('Failed to load patient nurse tasks:', err);
    }
  };

  const handleReviewBillingQuery = (rx) => {
    setSelectedReturnedRx(rx);
    const patId = rx.patientId?._id || rx.patientId;
    const patObj = typeof rx.patientId === 'object' && rx.patientId !== null
      ? rx.patientId
      : {
          _id: patId || `pat_${Date.now()}`,
          firstName: rx.patientName?.split(' ')[0] || 'Patient',
          lastName: rx.patientName?.split(' ').slice(1).join(' ') || '',
          uhid: rx.uhid || 'UHID',
          gender: 'GENERAL',
        };

    let targetToken = liveQueue.find((t) => String(t.patientId?._id || t.patientId) === String(patId))
      || departmentHoldQueue.find((t) => String(t.patientId?._id || t.patientId) === String(patId))
      || completedQueue.find((t) => String(t.patientId?._id || t.patientId) === String(patId));

    if (!targetToken) {
      targetToken = {
        _id: rx.appointmentId || `apt_${Date.now()}`,
        tokenNumber: 1,
        status: 'IN_CONSULTATION',
        patientId: patObj,
        chiefComplaints: rx.consultationId?.chiefComplaints || rx.billingQuery?.query || 'Returned from Billing',
        returnedPrescription: rx,
      };
    } else {
      targetToken = {
        ...targetToken,
        returnedPrescription: rx,
      };
    }

    setSelectedToken(targetToken);
    fetchPatientInvestigations(patId);
    fetchPatientNurseTasks(patId);
    setIsConsultationModalOpen(true);
  };

  const handleConfirmBillingQuery = async (rx) => {
    const invoiceId = rx.invoiceId || rx.billingQuery?.invoiceId;
    if (!invoiceId || resolvingBillingInvoiceId) return;
    if (!window.confirm('Confirm the current clinical charges and return this invoice to Central Billing?')) return;
    setResolvingBillingInvoiceId(String(invoiceId));
    try {
      await axiosClient.post(`/billing/invoices/${invoiceId}/doctor-review-response`, {
        responseNote: 'Clinical charges reviewed and confirmed by the attending doctor.',
      });
      useNotificationStore.getState().resolveEntityNotification(String(invoiceId));
      resolvePending(String(invoiceId));
      useDepartmentNotificationStore.getState().fetchPendingWork?.();
      await fetchReturnedBillingPrescriptions();
      useNotificationStore.getState().fetchNotifications?.('active');
      setStatusMessage({ type: 'success', text: 'Billing query resolved and returned to Central Billing.' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to resolve the billing query.' });
    } finally {
      setResolvingBillingInvoiceId(null);
    }
  };

  const handleSelectToken = (tok) => {
    setSelectedToken(tok);
    const pid = tok.patientId?._id || tok.patientId;
    fetchPatientInvestigations(pid);
    fetchPatientNurseTasks(pid);
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

  // Nurse Tasks (Active vs History)
  const allMyNurseTasks = nurseTasks.filter((t) => {
    return !doctorUserId || String(t.doctorId?._id || t.doctorId || '') === doctorUserId;
  });

  const activeNurseTasks = allMyNurseTasks.filter((t) => {
    const isCompletedConsultation =
      t.isResolved ||
      t.appointmentId?.status === 'COMPLETED' ||
      completedQueue.some((tok) => String(tok._id || tok.id) === String(t.appointmentId?._id || t.appointmentId));
    return !isCompletedConsultation;
  });

  const historyNurseTasks = allMyNurseTasks.filter((t) => {
    const isCompletedConsultation =
      t.isResolved ||
      t.appointmentId?.status === 'COMPLETED' ||
      completedQueue.some((tok) => String(tok._id || tok.id) === String(t.appointmentId?._id || t.appointmentId));
    return Boolean(isCompletedConsultation);
  });

  const filteredActiveNurseTasks = activeNurseTasks.filter((t) => {
    const pName = `${t.patientId?.firstName || ''} ${t.patientId?.lastName || ''}`.toLowerCase();
    const uhid = (t.patientId?.uhid || '').toLowerCase();
    const medName = (t.medicineName || '').toLowerCase();
    const search = queueSearchTerm.toLowerCase();
    return pName.includes(search) || uhid.includes(search) || medName.includes(search);
  });

  const filteredHistoryNurseTasks = historyNurseTasks.filter((t) => {
    const pName = `${t.patientId?.firstName || ''} ${t.patientId?.lastName || ''}`.toLowerCase();
    const uhid = (t.patientId?.uhid || '').toLowerCase();
    const medName = (t.medicineName || '').toLowerCase();
    const search = queueSearchTerm.toLowerCase();
    return pName.includes(search) || uhid.includes(search) || medName.includes(search);
  });

  // Diagnostics & Imaging Orders (Active vs History)
  const allMyDeptOrders = departmentOrders.filter((ord) => {
    return !doctorUserId || String(ord.doctorId?._id || ord.doctorId || '') === doctorUserId;
  });

  const activeDeptOrders = allMyDeptOrders.filter((ord) => {
    const isCompletedConsultation =
      ord.chargeStatus === 'INCLUDED_IN_FINAL_BILL' ||
      ord.chargeStatus === 'CANCELLED' ||
      ord.appointmentId?.status === 'COMPLETED' ||
      completedQueue.some((tok) => String(tok._id || tok.id) === String(ord.appointmentId?._id || ord.appointmentId));
    return !isCompletedConsultation;
  });

  const historyDeptOrders = allMyDeptOrders.filter((ord) => {
    const isCompletedConsultation =
      ord.chargeStatus === 'INCLUDED_IN_FINAL_BILL' ||
      ord.chargeStatus === 'CANCELLED' ||
      ord.appointmentId?.status === 'COMPLETED' ||
      completedQueue.some((tok) => String(tok._id || tok.id) === String(ord.appointmentId?._id || ord.appointmentId));
    return Boolean(isCompletedConsultation);
  });

  const filteredActiveDeptOrders = activeDeptOrders.filter((ord) => {
    const pName = (ord.patientName || '').toLowerCase();
    const uhid = (ord.uhid || '').toLowerCase();
    const tName = (ord.testName || '').toLowerCase();
    const search = queueSearchTerm.toLowerCase();
    return pName.includes(search) || uhid.includes(search) || tName.includes(search);
  });

  const filteredHistoryDeptOrders = historyDeptOrders.filter((ord) => {
    const pName = (ord.patientName || '').toLowerCase();
    const uhid = (ord.uhid || '').toLowerCase();
    const tName = (ord.testName || '').toLowerCase();
    const search = queueSearchTerm.toLowerCase();
    return pName.includes(search) || uhid.includes(search) || tName.includes(search);
  });

  // Backward compatibility alias
  const filteredDeptOrders = filteredActiveDeptOrders;
  const filteredNurseTasks = filteredActiveNurseTasks;

  // Billing Desk Queries (Active vs History)
  const activeReturnedBilling = returnedBillingPrescriptions.filter((rx) => !rx.billingQuery?.resolved);
  const historyReturnedBilling = returnedBillingPrescriptions.filter((rx) => rx.billingQuery?.resolved);

  const filteredActiveReturnedBilling = activeReturnedBilling.filter((rx) => {
    const pName = (rx.patientName || `${rx.patientId?.firstName || ''} ${rx.patientId?.lastName || ''}`).toLowerCase();
    const uhid = (rx.uhid || rx.patientId?.uhid || '').toLowerCase();
    const queryText = (rx.billingQuery?.query || '').toLowerCase();
    const search = queueSearchTerm.toLowerCase();
    return pName.includes(search) || uhid.includes(search) || queryText.includes(search);
  });

  const filteredHistoryReturnedBilling = historyReturnedBilling.filter((rx) => {
    const pName = (rx.patientName || `${rx.patientId?.firstName || ''} ${rx.patientId?.lastName || ''}`).toLowerCase();
    const uhid = (rx.uhid || rx.patientId?.uhid || '').toLowerCase();
    const queryText = (rx.billingQuery?.query || '').toLowerCase();
    const search = queueSearchTerm.toLowerCase();
    return pName.includes(search) || uhid.includes(search) || queryText.includes(search);
  });

  const filteredReturnedBilling = filteredActiveReturnedBilling;

  // Pharmacy Substitutions
  const activeSubstitutions = substitutionRequests.filter((r) => r.status === 'PENDING');
  const historySubstitutions = substitutionRequests.filter((r) => r.status !== 'PENDING');

  // Patient / Guardian Messages
  const activeDoctorRequests = doctorRequests.filter((r) => r.status === 'PENDING');
  const historyDoctorRequests = doctorRequests.filter((r) => r.status !== 'PENDING');

  const pendingReportsCount = (
    activeDeptOrders.filter((ord) => ['REPORT_UPLOADED', 'COMPLETED'].includes(ord.status) && !ord.reviewedAt && ord.chargeStatus !== 'APPROVED').length +
    activeNurseTasks.filter((t) => t.status === 'ADMINISTERED' && !t.doctorReviewedAt).length +
    activeSubstitutions.length +
    activeReturnedBilling.length +
    activeDoctorRequests.length
  );

  const historyReportsCount = (
    historyDeptOrders.length +
    historyNurseTasks.length +
    historyReturnedBilling.length +
    historySubstitutions.length +
    historyDoctorRequests.length
  );

  const departmentLabel = (category) => ['XRAY', 'MRI', 'CT_SCAN', 'ULTRASOUND', 'RADIOLOGY'].includes(category)
    ? 'Radiology / X-Ray'
    : ['LABORATORY', 'BLOOD_TEST', 'URINE_ANALYSIS', 'URINE_TEST', 'CULTURE_TEST', 'BIOPSY', 'PATHOLOGY'].includes(category)
      ? 'Laboratory'
      : category?.replaceAll('_', ' ') || 'Department';

  const displayWorkflowStatus = (order) => {
    if (order.reviewedAt || order.status === 'REVIEWED' || order.chargeStatus === 'APPROVED') return 'REVIEWED BY DOCTOR';
    if (['REPORT_UPLOADED', 'COMPLETED'].includes(order.status)) return 'REPORT READY';
    if (order.status === 'IN_PROGRESS') return 'IN PROGRESS';
    if (order.status === 'ACCEPTED') return 'ACCEPTED';
    return 'PENDING';
  };

  const statusClass = (status) => ({
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    ACCEPTED: 'bg-blue-50 text-blue-700 border-blue-200',
    'IN PROGRESS': 'bg-violet-50 text-violet-700 border-violet-200',
    'REPORT READY': 'bg-cyan-50 text-cyan-700 border-cyan-300 font-bold animate-pulse',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'REVIEWED BY DOCTOR': 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black',
  }[status] || 'bg-slate-50 text-slate-700 border-slate-200');

  const handleReviewDiagnosticOrder = async (ord) => {
    markAsRead(ord._id);
    try {
      await axiosClient.post(`/diagnostics/orders/${ord._id}/approve-charge`);
      useNotificationStore.getState().resolveEntityNotification(ord._id);
      resolvePending(ord._id);
      useDepartmentNotificationStore.getState().fetchPendingWork?.();
      await fetchDepartmentOrders();
      useNotificationStore.getState().fetchNotifications?.('active');
      setStatusMessage({ type: 'success', text: `Diagnostic report for ${ord.patientName || 'Patient'} reviewed and accepted.` });
    } catch (e) {
      console.error('Failed to approve charge:', e);
      setStatusMessage({ type: 'error', text: 'Failed to approve report charge.' });
    }
  };

  const handleReviewNurseTask = async (task) => {
    try {
      await axiosClient.patch(`/pharmacy/nurse-tasks/${task._id}/doctor-review`);
      useNotificationStore.getState().resolveEntityNotification(task._id);
      resolvePending(task._id);
      useDepartmentNotificationStore.getState().fetchPendingWork?.();
      await fetchNurseTasks();
      useNotificationStore.getState().fetchNotifications?.('active');
      setStatusMessage({ type: 'success', text: `Nurse treatment for ${task.patientId?.firstName || 'Patient'} marked as reviewed.` });
    } catch (e) {
      console.error('Failed to review nurse task:', e);
      setStatusMessage({ type: 'error', text: 'Failed to mark nurse task as reviewed.' });
    }
  };

  const handleContinueConsultation = (ord) => {
    if (!ord) return;
    markAsRead(ord._id);

    const patientObj = typeof ord.patientId === 'object' && ord.patientId !== null
      ? ord.patientId
      : {
          _id: ord.patientId || `pat_${Date.now()}`,
          firstName: (ord.patientName || 'Patient').split(' ')[0] || 'Patient',
          lastName: (ord.patientName || '').split(' ').slice(1).join(' ') || '',
          uhid: ord.uhid || 'UHID',
          gender: 'GENERAL',
        };

    let targetToken = departmentHoldQueue.find((t) => String(t._id) === String(ord.appointmentId?._id || ord.appointmentId))
      || liveQueue.find((t) => String(t._id) === String(ord.appointmentId?._id || ord.appointmentId))
      || liveQueue.find((t) => String(t.patientId?._id || t.patientId) === String(ord.patientId?._id || ord.patientId))
      || departmentHoldQueue.find((t) => String(t.patientId?._id || t.patientId) === String(ord.patientId?._id || ord.patientId))
      || completedQueue.find((t) => String(t.patientId?._id || t.patientId) === String(ord.patientId?._id || ord.patientId));

    if (!targetToken) {
      targetToken = {
        _id: ord.appointmentId?._id || ord.appointmentId || `apt_${Date.now()}`,
        tokenNumber: ord.tokenNumber || 1,
        status: 'IN_CONSULTATION',
        patientId: patientObj,
        chiefComplaints: `Follow-up on ${departmentLabel(ord.testCategory)}: ${ord.testName}`,
      };
    } else if (typeof targetToken.patientId !== 'object' || targetToken.patientId === null) {
      targetToken = {
        ...targetToken,
        patientId: patientObj,
      };
    }

    setSelectedToken(targetToken);
    fetchPatientInvestigations(targetToken.patientId?._id || targetToken.patientId || ord.patientId);
    fetchPatientNurseTasks(targetToken.patientId?._id || targetToken.patientId || ord.patientId);
    setActiveTab('OVERVIEW');
    setIsConsultationModalOpen(true);

    axiosClient.post(`/diagnostics/orders/${ord._id}/approve-charge`)
      .then(() => {
        useNotificationStore.getState().resolveEntityNotification(ord._id);
        resolvePending(ord._id);
        useDepartmentNotificationStore.getState().fetchPendingWork?.();
        fetchDepartmentOrders();
        useNotificationStore.getState().fetchNotifications?.('active');
      })
      .catch(() => {});
  };

  const handleContinueConsultationForNurseTask = (task) => {
    if (!task) return;

    const patientObj = typeof task.patientId === 'object' && task.patientId !== null
      ? task.patientId
      : {
          _id: task.patientId || `pat_${Date.now()}`,
          firstName: (task.patientName || 'Patient').split(' ')[0] || 'Patient',
          lastName: (task.patientName || '').split(' ').slice(1).join(' ') || '',
          uhid: task.uhid || 'UHID',
          gender: 'GENERAL',
        };

    let targetToken = departmentHoldQueue.find((t) => String(t._id) === String(task.appointmentId?._id || task.appointmentId))
      || liveQueue.find((t) => String(t._id) === String(task.appointmentId?._id || task.appointmentId))
      || liveQueue.find((t) => String(t.patientId?._id || t.patientId) === String(task.patientId?._id || task.patientId))
      || departmentHoldQueue.find((t) => String(t.patientId?._id || t.patientId) === String(task.patientId?._id || task.patientId))
      || completedQueue.find((t) => String(t.patientId?._id || t.patientId) === String(task.patientId?._id || task.patientId));

    if (!targetToken) {
      targetToken = {
        _id: task.appointmentId?._id || task.appointmentId || `apt_${Date.now()}`,
        tokenNumber: task.tokenNumber || 1,
        status: 'IN_CONSULTATION',
        patientId: patientObj,
        chiefComplaints: `Follow-up on Nurse Task: ${task.medicineName || 'Treatment'}`,
      };
    } else if (typeof targetToken.patientId !== 'object' || targetToken.patientId === null) {
      targetToken = {
        ...targetToken,
        patientId: patientObj,
      };
    }

    setSelectedToken(targetToken);
    fetchPatientInvestigations(targetToken.patientId?._id || targetToken.patientId || task.patientId);
    fetchPatientNurseTasks(targetToken.patientId?._id || targetToken.patientId || task.patientId);
    setActiveTab('OVERVIEW');
    setIsConsultationModalOpen(true);

    axiosClient.patch(`/pharmacy/nurse-tasks/${task._id}/doctor-review`)
      .then(() => {
        useNotificationStore.getState().resolveEntityNotification(task._id);
        resolvePending(task._id);
        useDepartmentNotificationStore.getState().fetchPendingWork?.();
        fetchNurseTasks();
        useNotificationStore.getState().fetchNotifications?.('active');
      })
      .catch(() => {});
  };

  const handleDirectToBilling = async (tok) => {
    const targetToken = tok || selectedToken;
    if (!targetToken) return;
    const patName = targetToken.patientId?.firstName
      ? `${targetToken.patientId.firstName} ${targetToken.patientId.lastName || ''}`.trim()
      : 'Patient';

    const feeInput = window.prompt(
      `Send ${patName} directly to Central Billing (No Pharmacy)?\nEnter Doctor Consultation Fee (₹):`,
      '100'
    );
    if (feeInput === null) return; // cancelled

    try {
      await axiosClient.post('/emr/consultations', {
        appointmentId: targetToken._id,
        patientId: targetToken.patientId?._id || targetToken.patientId,
        chiefComplaints: targetToken.chiefComplaints || 'General Consultation',
        prescriptions: [],
        pharmacyMode: 'EXTERNAL_NO_INHOUSE_PHARMACY',
        consultationFee: Number(feeInput) || 0,
        emergencyFee: 0,
        doctorProcedureCharges: [],
        adviceToPatient: 'Consultation completed without in-house pharmacy. Dispatched directly to Central Billing.',
      });

      alert(`✓ Consultation completed! Charges dispatched directly to Central Billing for ${patName}.`);
      setSelectedToken(null);
      setPatientInvestigations([]);
      setPatientNurseTasks([]);
      fetchOpdQueue();
      fetchDepartmentOrders();
      fetchNurseTasks();
      useDepartmentNotificationStore.getState().fetchPendingWork?.();
    } catch (err) {
      console.error('Failed to complete consultation directly to billing:', err);
      alert(err.response?.data?.message || 'Failed to dispatch to billing');
    }
  };

  const handleCancelToken = async (tokenId) => {
    if (!window.confirm('Are you sure you want to cancel this token / appointment?')) return;
    try {
      await axiosClient.patch(`/appointments/tokens/${tokenId}/status`, { status: 'CANCELLED' });
      setSelectedToken(null);
      setPatientInvestigations([]);
      setPatientNurseTasks([]);
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

      {/* ── OVERVIEW (Clinical EMR Desk) ── Header + Stat Cards + Live Queue Workspace */}
      {activeTab === 'OVERVIEW' && (
        <>
          {/* Premium Professional Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-slate-900">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Doctor Clinical EMR Workstation</h2>

                {/* Status Badge (for regular doctors) */}
                {user?.role !== 'HOSPITAL_ADMIN' && user?.role !== 'SUPER_ADMIN' && (
                  isAvailable ? (
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
                  )
                )}

                {/* OPD Cabin Badge */}
                <button
                  onClick={() => { setTempCabin(cabinNo); setIsEditingCabin(true); }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 hover:border-indigo-400 text-indigo-700 font-extrabold text-xs transition-all shadow-xs group cursor-pointer"
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

              {user?.role !== 'HOSPITAL_ADMIN' && user?.role !== 'SUPER_ADMIN' && (
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
              )}
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

          {/* ── OFFLINE WARNING BANNER (for regular doctors only) ── */}
          {!isAvailable && user?.role !== 'HOSPITAL_ADMIN' && user?.role !== 'SUPER_ADMIN' && (
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
            <StatCard title="Completed Consultations" value={`${completedQueue.length} Patients`} subtitle="Moved to History" icon={CheckCircle2} color="emerald" onClick={() => handleTabClick('COMPLETED')} className="cursor-pointer hover:border-emerald-300" />
            <StatCard title="Department Responses" value={`${pendingReportsCount} Ready Responses`} subtitle={`${departmentOrders.length + nurseTasks.length} Total Department Tasks`} icon={FileCheck2} color="amber" onClick={() => handleTabClick('DEPT_RESPONSES')} className="cursor-pointer hover:border-amber-400" />
            <StatCard title="Prescriptions Written" value={`${completedQueue.length}`} subtitle="FEFO Auto-Checked" icon={Pill} color="purple" />
          </div>
        </>
      )}

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
                            title="Cancel Token / Appointment"
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

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-300 font-mono font-black text-sm">
                    TOKEN #{selectedToken.tokenNumber}
                  </span>
                  <Button
                    size="sm"
                    variant="danger"
                    className="font-bold text-xs"
                    onClick={() => handleCancelToken(selectedToken._id)}
                  >
                    <X size={14} className="mr-1" /> Cancel Visit
                  </Button>
                </div>
              </div>

              {/* Primary Consultation Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                <Button
                  size="md"
                  variant="success"
                  className="font-bold py-3 text-xs flex flex-col items-center justify-center gap-1 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setIsConsultationModalOpen(true)}
                  title="Enter take-home prescription, clinical diagnosis, and send to in-house pharmacy and billing"
                >
                  <Pill size={18} />
                  <span>Prescribe & Medical</span>
                </Button>

                <Button
                  size="md"
                  variant="primary"
                  className="font-bold py-3 text-xs flex flex-col items-center justify-center gap-1 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => handleDirectToBilling(selectedToken)}
                  title="Complete consultation and send directly to Central Billing without in-house pharmacy"
                >
                  <Receipt size={18} />
                  <span>Direct to Bill</span>
                </Button>

                <Button
                  size="md"
                  variant="primary"
                  className="font-bold py-3 text-xs flex flex-col items-center justify-center gap-1 shadow-sm bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => setIsInjectionModalOpen(true)}
                  title="Send patient to Nurse Workstation for injection, IV fluid, or wound care"
                >
                  <Syringe size={18} />
                  <span>Send to Nurse</span>
                </Button>

                <Button
                  size="md"
                  variant="primary"
                  className="font-bold py-3 text-xs flex flex-col items-center justify-center gap-1 shadow-sm bg-sky-600 hover:bg-sky-700 text-white"
                  onClick={() => setIsRequestModalOpen(true)}
                  title="Order Pathology lab test or Radiology X-ray/scan"
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
                  className="font-bold py-3 text-xs flex flex-col items-center justify-center gap-1 shadow-sm border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  onClick={() => {
                    setHistoryPatientId(currentPatient?.uhid || currentPatient?._id);
                    setIsHistoryOpen(true);
                  }}
                >
                  <History size={18} />
                  <span>Past History</span>
                </Button>
              </div>

              {/* Multi-Department Real-Time Order & Response Tracker for Selected Patient */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-black flex items-center gap-1.5 text-xs">
                    <Activity className="text-indigo-600" size={16} />
                    Active Patient Department Orders & Live Progress
                  </h4>
                  <span className="text-[10px] font-bold text-slate-500">
                    {patientNurseTasks.length + patientInvestigations.length} Total Orders
                  </span>
                </div>

                {/* 1. Nursing Care & Injection Administrations for this patient */}
                {patientNurseTasks.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1">
                      <Syringe size={13} className="text-rose-600" />
                      <span>Prescribed Injections & Nursing Care ({patientNurseTasks.length})</span>
                    </div>
                    {patientNurseTasks.map((t) => (
                      <div
                        key={t._id}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                          t.status === 'ADMINISTERED'
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                            : 'bg-rose-50/40 border-rose-200 text-rose-950'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900">{t.medicineName} ({t.dose})</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800 uppercase">
                              {t.route || 'IV'}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              t.status === 'ADMINISTERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800 animate-pulse'
                            }`}
                          >
                            {t.status === 'ADMINISTERED' ? '✓ ADMINISTERED' : '⏳ PENDING IN NURSING'}
                          </span>
                        </div>

                        {t.status === 'ADMINISTERED' ? (
                          <div className="text-[11px] text-emerald-900 bg-white/80 p-2 rounded-lg border border-emerald-200 flex flex-wrap items-center justify-between gap-2">
                            <span>
                              <CheckCircle2 size={13} className="inline mr-1 text-emerald-600" />
                              Administered by <strong>Nurse {t.administrationDetails?.nurseName || 'Duty Nurse'}</strong> at <strong>{new Date(t.administrationDetails?.administeredAt || t.updatedAt).toLocaleTimeString()}</strong>
                            </span>
                            {t.administrationDetails?.notes && (
                              <span className="italic text-slate-600">Notes: "{t.administrationDetails.notes}"</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-600 flex justify-between">
                            <span>Target: <strong>{t.assignedNurseName || 'Nursing Station'}</strong></span>
                            <span>Requested at: {new Date(t.createdAt).toLocaleTimeString()}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Diagnostic Investigations (Lab / Radiology) for this patient */}
                {patientInvestigations.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1">
                      <FileCheck2 size={13} className="text-sky-600" />
                      <span>Diagnostics & Imaging ({patientInvestigations.length})</span>
                    </div>
                    {patientInvestigations.map((inv) => (
                      <div key={inv._id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-black">
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
                    ))}
                  </div>
                )}

                {patientNurseTasks.length === 0 && patientInvestigations.length === 0 && (
                  <div className="p-3 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No active departmental orders requested for this consultation yet. Use the buttons above to order injections, tests, or IPD admission.
                  </div>
                )}
              </div>
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
        <div className="space-y-6">
          {/* Sub-view Navigation: Nurse Treatment vs Department Request Tracker */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setDeptResponseSubTab('NURSE')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  deptResponseSubTab === 'NURSE'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Syringe size={15} />
                Nurse Treatment &amp; Injection Administration Responses ({filteredActiveNurseTasks.length})
                {activeNurseTasks.filter((t) => t.status === 'ADMINISTERED' && !t.doctorReviewedAt).length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${deptResponseSubTab === 'NURSE' ? 'bg-white text-indigo-700' : 'bg-rose-500 text-white animate-pulse'}`}>
                    {activeNurseTasks.filter((t) => t.status === 'ADMINISTERED' && !t.doctorReviewedAt).length} New
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setDeptResponseSubTab('DEPT_TRACKER')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  deptResponseSubTab === 'DEPT_TRACKER'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <FileCheck2 size={15} />
                Department Request ({filteredActiveDeptOrders.length})
                {activeDeptOrders.filter((ord) => ['REPORT_UPLOADED', 'COMPLETED'].includes(ord.status) && !ord.reviewedAt && ord.chargeStatus !== 'APPROVED').length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${deptResponseSubTab === 'DEPT_TRACKER' ? 'bg-white text-indigo-700' : 'bg-rose-500 text-white animate-pulse'}`}>
                    {activeDeptOrders.filter((ord) => ['REPORT_UPLOADED', 'COMPLETED'].includes(ord.status) && !ord.reviewedAt && ord.chargeStatus !== 'APPROVED').length} Ready
                  </span>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              {deptResponseSubTab === 'NURSE'
                ? `${filteredActiveNurseTasks.length} active nurse task(s) · ${filteredHistoryNurseTasks.length} reviewed history task(s)`
                : `${filteredActiveDeptOrders.length} active department order(s) · ${filteredHistoryDeptOrders.length} reviewed history report(s)`}
            </p>
          </div>

          {/* Common Urgent Alerts: Patient Messages, Billing Queries & Pharmacy Substitutions */}
          {activeDoctorRequests.length > 0 && (
            <Card className="space-y-4 bg-white border border-purple-200 shadow-sm text-black">
              <div className="border-b border-purple-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Bell size={18} className="text-purple-600" />
                  Patient &amp; Guardian Messages ({activeDoctorRequests.length})
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">Messages routed only to the attending doctor.</p>
              </div>
              <div className="space-y-3">
                {activeDoctorRequests.map((request) => (
                  <div
                    id={`doctor-patient-request-${request._id}`}
                    key={request._id}
                    className={`p-4 rounded-xl border ${String(request._id) === String(requestedPatientRequestId) ? 'border-purple-500 bg-purple-100 ring-2 ring-purple-200' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <p className="font-extrabold text-slate-900">{request.patientId?.firstName} {request.patientId?.lastName} <span className="font-mono text-xs text-indigo-700">{request.patientId?.uhid}</span></p>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap break-words">{request.notes || 'Doctor review requested.'}</p>
                        <p className="text-[10px] text-slate-500">Sent by {request.requestedBy || 'PATIENT'} · {request.createdAt ? new Date(request.createdAt).toLocaleString() : 'Just now'} · {request.status}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {!['ACCEPTED', 'IN_PROGRESS'].includes(request.status) && (
                          <Button size="sm" variant="outline" onClick={() => updateDoctorRequest(request._id, 'ACCEPTED')}>Acknowledge</Button>
                        )}
                        <Button size="sm" variant="success" onClick={() => updateDoctorRequest(request._id, 'COMPLETED')}>Mark Reviewed</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {filteredActiveReturnedBilling.length > 0 && (
            <Card className="space-y-4 bg-white border-2 border-amber-300 shadow-md text-black overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-3 bg-amber-50/90 -mx-6 -mt-6 p-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-200 text-amber-900 shrink-0">
                    <Receipt size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-amber-950 flex items-center gap-2">
                      Billing Desk Queries &amp; Returned Cases ({filteredActiveReturnedBilling.length})
                    </h3>
                    <p className="text-xs text-amber-800 mt-0.5 font-medium">
                      Cases returned by Central Billing Desk for prescription or charge clarification.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-white shadow-xs animate-pulse self-start sm:self-auto shrink-0">
                  ACTION REQUIRED
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-100/60 text-slate-900 uppercase tracking-wider text-[10px] border-b border-amber-200 font-bold">
                    <tr>
                      <th className="p-3">Patient Name &amp; UHID</th>
                      <th className="p-3">Cashier Query / Reason</th>
                      <th className="p-3">Returned By</th>
                      <th className="p-3">Prescribed Medicines</th>
                      <th className="p-3">Returned Time</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100 text-black">
                    {filteredActiveReturnedBilling.map((rx) => {
                      const pat = rx.patientId || {};
                      const queryInfo = rx.billingQuery || {};
                      return (
                        <tr
                          key={rx._id}
                          id={`doctor-billing-query-${rx.invoiceId || rx.billingQuery?.invoiceId || rx._id}`}
                          className={`transition-colors ${String(rx.invoiceId || rx.billingQuery?.invoiceId || '') === String(requestedInvoiceId) ? 'bg-amber-100 ring-2 ring-inset ring-amber-500' : 'bg-white hover:bg-amber-50/40'}`}
                        >
                          <td className="p-3">
                            <p className="font-extrabold text-slate-900 text-sm">
                              {pat.firstName} {pat.lastName}
                            </p>
                            <span className="font-mono text-indigo-700 font-bold text-[11px]">
                              {pat.uhid || '—'}
                            </span>
                          </td>
                          <td className="p-3 max-w-xs">
                            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-950">
                              &ldquo;{queryInfo.query || 'Prescription clarification requested'}&rdquo;
                            </div>
                          </td>
                          <td className="p-3 font-medium text-slate-800">
                            <span className="font-bold text-slate-900">{queryInfo.requestedByName || 'Cashier'}</span>
                            <div className="text-[10px] text-slate-500">Central Billing</div>
                          </td>
                          <td className="p-3 text-slate-700">
                            <div className="space-y-0.5 max-w-xs">
                              {rx.medicines?.map((m, mIdx) => (
                                <p key={mIdx} className="text-xs font-semibold text-slate-800 truncate">
                                  &bull; {m.medicineName} ({m.dosage || 'Tab'}) &times; {m.quantity || m.dispensedQty || 10}
                                </p>
                              ))}
                              {(!rx.medicines || rx.medicines.length === 0) && rx.invoiceItems?.map((item, itemIdx) => (
                                <p key={itemIdx} className="text-xs font-semibold text-slate-800 truncate">
                                  &bull; {item.description} &times; {item.qty || 1} (₹{Number(item.totalPrice || 0).toFixed(2)})
                                </p>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-slate-600 whitespace-nowrap text-[11px]">
                            {queryInfo.requestedAt ? new Date(queryInfo.requestedAt).toLocaleString() : new Date(rx.updatedAt || rx.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3 text-right">
                            <div className="inline-flex flex-col gap-1.5 items-stretch">
                              <button
                                type="button"
                                onClick={() => handleConfirmBillingQuery(rx)}
                                disabled={String(resolvingBillingInvoiceId) === String(rx.invoiceId || rx.billingQuery?.invoiceId)}
                                className="px-3.5 py-2 rounded-xl font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white shadow-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                title="Confirm existing charges without creating another consultation"
                              >
                                <Check size={14} />
                                {String(resolvingBillingInvoiceId) === String(rx.invoiceId || rx.billingQuery?.invoiceId) ? 'Returning…' : 'Confirm & Return'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewBillingQuery(rx)}
                                className="px-3.5 py-2 rounded-xl font-extrabold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
                                title="Open consultation only when clinical details or charges need correction"
                              >
                                <Stethoscope size={14} />
                                Review &amp; Correct
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeSubstitutions.length > 0 && (
            <Card className="space-y-3 bg-white border border-amber-200 shadow-sm">
              <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                <Pill size={18} className="text-amber-600" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Pharmacy Substitution Requests ({activeSubstitutions.length})</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Pharmacist is requesting your approval to substitute a prescribed medicine.</p>
                </div>
              </div>
              <div className="divide-y divide-amber-50 text-xs">
                {activeSubstitutions.map((req) => (
                  <div
                    key={req._id}
                    id={`substitution-${req._id}`}
                    data-testid={`substitution-request-${req._id}`}
                    className={`py-3 px-2 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${String(req._id) === String(requestedSubstitutionId) ? 'bg-amber-100 ring-2 ring-amber-400' : ''}`}
                  >
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
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 size={13} /> Approve
                      </button>
                      <button
                        onClick={() => handleSubstitutionResponse(req._id, 'REJECT')}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <X size={13} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* VIEW 1: NURSE TREATMENT & INJECTION ADMINISTRATION RESPONSES */}
          {deptResponseSubTab === 'NURSE' && (
            <div className="space-y-6">
              {/* 1. Active Nurse Administrations & Injections Table */}
              <Card className="space-y-4 bg-white border border-slate-200 shadow-sm text-black">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-black flex items-center gap-2">
                      <Syringe size={18} className="text-rose-600" />
                      Nurse Treatment &amp; Injection Administration Responses ({filteredActiveNurseTasks.length})
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      Injections and bedside treatments administered by nurses. Review administration timestamp, batch, and patient reactions.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-900 uppercase tracking-wider text-[10px] border-b border-slate-200 font-bold">
                      <tr>
                        <th className="p-3">Patient Name</th>
                        <th className="p-3">UHID</th>
                        <th className="p-3">Medicine &amp; Dose</th>
                        <th className="p-3">Route / Site</th>
                        <th className="p-3">Administering Nurse</th>
                        <th className="p-3">Administered Time</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Reaction / Notes</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-black">
                      {filteredActiveNurseTasks.length > 0 ? (
                        filteredActiveNurseTasks.map((task) => (
                          <tr
                            key={task._id}
                            id={`doctor-nurse-task-${task._id}`}
                            data-testid={`doctor-nurse-task-${task._id}`}
                            className={`transition-colors ${String(task._id) === String(requestedNurseTaskId) ? 'bg-amber-100 ring-2 ring-inset ring-amber-400' : 'hover:bg-slate-50'}`}
                          >
                            <td className="p-3 font-bold text-black">
                              {task.patientId?.firstName} {task.patientId?.lastName}
                            </td>
                            <td className="p-3 font-mono font-bold text-indigo-700">
                              {task.patientId?.uhid || '—'}
                            </td>
                            <td className="p-3 font-extrabold text-slate-900">
                              {task.medicineName} ({task.dose})
                            </td>
                            <td className="p-3 text-slate-700 font-bold uppercase">
                              {task.administrationDetails?.siteOrRoute || task.route || 'IV'}
                            </td>
                            <td className="p-3 font-medium text-slate-800">
                              {task.status === 'ADMINISTERED'
                                ? `Nurse ${task.administrationDetails?.nurseName || 'Duty Nurse'}`
                                : `Assigned: ${task.assignedNurseName || 'Nursing Station'}`}
                            </td>
                            <td className="p-3 text-slate-600 whitespace-nowrap">
                              {task.administrationDetails?.administeredAt
                                ? new Date(task.administrationDetails.administeredAt).toLocaleString()
                                : new Date(task.createdAt).toLocaleString()}
                            </td>
                            <td className="p-3">
                              <span
                                className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-black whitespace-nowrap ${
                                  task.status === 'ADMINISTERED'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                                }`}
                              >
                                {task.status === 'ADMINISTERED' ? '✓ ADMINISTERED' : 'PENDING NURSING'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 max-w-xs truncate">
                              {task.administrationDetails?.notes || (task.status === 'ADMINISTERED' ? 'Normal / Completed' : task.doctorInstructions || '—')}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {task.status === 'ADMINISTERED' ? (
                                  <>
                                    {!task.doctorReviewedAt ? (
                                      <button
                                        type="button"
                                        onClick={() => handleReviewNurseTask(task)}
                                        className="px-2.5 py-1 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                                      >
                                        <CheckCircle2 size={12} />
                                        Mark as Reviewed
                                      </button>
                                    ) : (
                                      <span className="px-2.5 py-1 rounded-lg font-black text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-300 inline-flex items-center gap-1">
                                        <CheckCircle2 size={12} className="text-emerald-600" />
                                        Reviewed
                                      </span>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleContinueConsultationForNurseTask(task)}
                                      className="px-3 py-1 rounded-lg font-bold text-[11px] bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
                                      title="Open consultation with this patient and finalize diagnosis/bill"
                                    >
                                      <Stethoscope size={13} />
                                      Continue Consultation &amp; Bill
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    disabled
                                    className="px-2.5 py-1 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 bg-slate-100 text-slate-400 border border-slate-200 opacity-70 cursor-not-allowed"
                                  >
                                    <Lock size={12} /> Pending at Station
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-slate-500">
                            No active nurse-administered treatment tasks waiting for review.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* 2. Reviewed & Completed History for Nurse Administrations (Below active content!) */}
              <Card className="space-y-4 bg-white border border-emerald-200 shadow-sm text-black">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      Reviewed &amp; Completed History &mdash; Nurse Administrations &amp; Injections ({filteredHistoryNurseTasks.length})
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      Historical log of nurse-administered bedside injections and treatments reviewed by doctor.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-emerald-50/70 text-slate-900 uppercase tracking-wider text-[10px] border-b border-emerald-200 font-bold">
                      <tr>
                        <th className="p-3">Patient Name</th>
                        <th className="p-3">UHID</th>
                        <th className="p-3">Medicine &amp; Dose</th>
                        <th className="p-3">Route / Site</th>
                        <th className="p-3">Administering Nurse</th>
                        <th className="p-3">Administered Time</th>
                        <th className="p-3">Review Status</th>
                        <th className="p-3">Reaction / Notes</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-black">
                      {filteredHistoryNurseTasks.length > 0 ? (
                        filteredHistoryNurseTasks.map((task) => (
                          <tr key={task._id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-black">
                              {task.patientId?.firstName} {task.patientId?.lastName}
                            </td>
                            <td className="p-3 font-mono font-bold text-indigo-700">
                              {task.patientId?.uhid || '—'}
                            </td>
                            <td className="p-3 font-extrabold text-slate-900">
                              {task.medicineName} ({task.dose})
                            </td>
                            <td className="p-3 text-slate-700 font-bold uppercase">
                              {task.administrationDetails?.siteOrRoute || task.route || 'IV'}
                            </td>
                            <td className="p-3 font-medium text-slate-800">
                              Nurse {task.administrationDetails?.nurseName || task.assignedNurseName || 'Duty Nurse'}
                            </td>
                            <td className="p-3 text-slate-600 whitespace-nowrap">
                              {task.administrationDetails?.administeredAt
                                ? new Date(task.administrationDetails.administeredAt).toLocaleString()
                                : new Date(task.createdAt).toLocaleString()}
                            </td>
                            <td className="p-3">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-black bg-emerald-50 text-emerald-700 border-emerald-300">
                                <CheckCircle2 size={11} /> REVIEWED &amp; ACCEPTED
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 max-w-xs truncate">
                              {task.administrationDetails?.notes || 'Normal / Completed'}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleContinueConsultationForNurseTask(task)}
                                className="px-3 py-1 rounded-lg font-bold text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Stethoscope size={13} />
                                Open Encounter
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-slate-500">
                            No reviewed nurse administration history recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* VIEW 2: DEPARTMENT REQUEST & RESPONSE TRACKER */}
          {deptResponseSubTab === 'DEPT_TRACKER' && (
            <div className="space-y-6">
              {/* 1. Active Department Diagnostic & Imaging Orders */}
              <Card className="space-y-4 bg-white border border-slate-200 shadow-sm text-black">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-black flex items-center gap-2">
                      <FileCheck2 size={18} className="text-amber-600" />
                      Department Request ({filteredActiveDeptOrders.length})
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
                      {filteredActiveDeptOrders.length > 0 ? (
                        filteredActiveDeptOrders.map((ord) => {
                          const workflowStatus = displayWorkflowStatus(ord);
                          const isDepartmentLocked = !['REPORT_UPLOADED', 'COMPLETED', 'REVIEWED'].includes(ord.status);
                          const isReviewed = Boolean(ord.reviewedAt || ord.status === 'REVIEWED' || ord.chargeStatus === 'APPROVED');
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
                                      {!isReviewed ? (
                                        <button
                                          type="button"
                                          onClick={() => handleReviewDiagnosticOrder(ord)}
                                          className="px-2.5 py-1 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                                        >
                                          <CheckCircle2 size={12} />
                                          Mark as Reviewed
                                        </button>
                                      ) : (
                                        <span className="px-2.5 py-1 rounded-lg font-black text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-300 inline-flex items-center gap-1">
                                          <CheckCircle2 size={12} className="text-emerald-600" />
                                          Reviewed
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => handleContinueConsultation(ord)}
                                        className="px-3 py-1 rounded-lg font-bold text-[11px] bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
                                        title="Open consultation with this patient and finalize diagnosis/bill"
                                      >
                                        <Stethoscope size={13} />
                                        Continue Consultation &amp; Bill
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled
                                      className="px-2.5 py-1 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 bg-slate-100 text-slate-400 border border-slate-200 opacity-70 cursor-not-allowed"
                                      title="Report is being processed by department."
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
                            No active department orders or reports waiting for doctor review.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* 2. Reviewed & Completed History for Diagnostic Reports (Below active content!) */}
              <Card className="space-y-4 bg-white border border-emerald-200 shadow-sm text-black">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      Reviewed &amp; Completed History &mdash; Department Diagnostics &amp; Scans ({filteredHistoryDeptOrders.length})
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      Previously reviewed and accepted laboratory results and radiology scans.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-emerald-50/70 text-slate-900 uppercase tracking-wider text-[10px] border-b border-emerald-200 font-bold">
                      <tr>
                        <th className="p-3">Patient Name</th>
                        <th className="p-3">Token / UHID</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">Service</th>
                        <th className="p-3">Sent Time</th>
                        <th className="p-3">Reviewed Status</th>
                        <th className="p-3">Reviewed At</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-black">
                      {filteredHistoryDeptOrders.length > 0 ? (
                        filteredHistoryDeptOrders.map((ord) => (
                          <tr key={ord._id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-black">{ord.patientName}</td>
                            <td className="p-3"><span className="font-mono font-black text-indigo-700">#{ord.tokenNumber || '—'}</span><div className="font-mono text-[10px] text-slate-500">{ord.uhid}</div></td>
                            <td className="p-3 font-bold text-slate-800">{departmentLabel(ord.testCategory)}</td>
                            <td className="p-3 font-extrabold text-black">{ord.testName}</td>
                            <td className="p-3 text-slate-600 whitespace-nowrap">{new Date(ord.createdAt).toLocaleString()}</td>
                            <td className="p-3">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-black bg-emerald-50 text-emerald-700 border-emerald-300">
                                <CheckCircle2 size={11} /> REVIEWED &amp; ACCEPTED
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 whitespace-nowrap">{ord.reviewedAt ? new Date(ord.reviewedAt).toLocaleString() : (ord.completedAt ? new Date(ord.completedAt).toLocaleString() : '—')}</td>
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
                                <button
                                  type="button"
                                  onClick={() => handleContinueConsultation(ord)}
                                  className="px-3 py-1 rounded-lg font-bold text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Stethoscope size={13} />
                                  Open Encounter
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-slate-500">
                            No reviewed diagnostic reports recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Resolved Billing Queries History */}
              {filteredHistoryReturnedBilling.length > 0 && (
                <Card className="space-y-4 bg-white border border-slate-200 shadow-sm text-black">
                  <div className="border-b border-slate-200 pb-3">
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Receipt size={18} className="text-indigo-600" />
                      Resolved Billing Queries ({filteredHistoryReturnedBilling.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-900 uppercase tracking-wider text-[10px] border-b border-slate-200 font-bold">
                        <tr>
                          <th className="p-3">Patient Name</th>
                          <th className="p-3">UHID</th>
                          <th className="p-3">Cashier Query</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Resolved Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-black">
                        {filteredHistoryReturnedBilling.map((rx) => (
                          <tr key={rx._id} className="hover:bg-slate-50">
                            <td className="p-3 font-bold">{rx.patientId?.firstName} {rx.patientId?.lastName}</td>
                            <td className="p-3 font-mono text-indigo-700 font-bold">{rx.patientId?.uhid || '—'}</td>
                            <td className="p-3 text-slate-600">{rx.billingQuery?.query || 'Resolved'}</td>
                            <td className="p-3">
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                RESOLVED
                              </span>
                            </td>
                            <td className="p-3 text-slate-600">{rx.updatedAt ? new Date(rx.updatedAt).toLocaleString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
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
        onClose={() => {
          setIsConsultationModalOpen(false);
          setSelectedReturnedRx(null);
        }}
        token={selectedToken}
        patient={currentPatient}
        returnedPrescription={selectedReturnedRx || selectedToken?.returnedPrescription}
        onSuccess={() => {
          setSelectedToken(null);
          setPatientInvestigations([]);
          setPatientNurseTasks([]);
          fetchOpdQueue();
          fetchDepartmentOrders();
          fetchNurseTasks();
          fetchReturnedBillingPrescriptions();
          setSelectedReturnedRx(null);
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
        doctorName={selectedToken?.doctorId?.name ? `Dr. ${selectedToken.doctorId.name.replace(/^Dr\.\s*/i, '')}` : (user?.name ? `Dr. ${user.name.replace(/^Dr\.\s*/i, '')}` : 'Doctor')}
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

export default DoctorDashboard;
