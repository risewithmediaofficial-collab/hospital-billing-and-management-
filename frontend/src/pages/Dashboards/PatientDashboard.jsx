import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { axiosClient } from '../../api/axiosClient';
import { useAuthStore } from '../../store/authStore';
import {
  User,
  Heart,
  FileText,
  Receipt,
  Bell,
  CheckCircle,
  Eye,
  Download,
  ShieldAlert,
  Clock,
  Activity,
  Ticket,
  Pill,
  TestTube,
  FileImage,
  BedDouble,
  Users,
  AlertCircle,
  Phone,
  Calendar,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const PatientDashboard = ({ activeTab = 'dashboard' }) => {
  const { user } = useAuthStore();
  const [currentTab, setCurrentTab] = useState(activeTab);
  const [dashboardData, setDashboardData] = useState(null);
  const [historyTimeline, setHistoryTimeline] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [radiologyReports, setRadiologyReports] = useState([]);
  const [billingData, setBillingData] = useState({ invoices: [], receipts: [] });
  const [myRequests, setMyRequests] = useState([]);

  // Multi-hospital state
  const [myHospitals, setMyHospitals] = useState([]);
  const [activeContext, setActiveContext] = useState(null); // { admission, careTeam, hospitalId, localUhid }
  const [selectedHospitalId, setSelectedHospitalId] = useState(null);
  const isDischarged = activeContext === null || (activeContext && activeContext.admission?.status === 'DISCHARGED');
  const hasActiveAdmission = activeContext && (activeContext.admission?.status === 'ADMITTED' || activeContext.admission?.status === 'ADMISSION_REQUESTED');

  const [isLoading, setIsLoading] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencySubmitting, setEmergencySubmitting] = useState(false);

  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    fetchDashboardData();
    fetchRequests();
    fetchMyHospitals();
    fetchActiveContext();
  }, []);

  useEffect(() => {
    if (currentTab === 'history') fetchHistory();
    if (currentTab === 'prescriptions') fetchPrescriptions();
    if (currentTab === 'lab-reports') fetchLabReports();
    if (currentTab === 'radiology-reports') fetchRadiologyReports();
    if (currentTab === 'billing') fetchBilling();
  }, [currentTab]);

  const fetchDashboardData = async () => {
    try {
      const res = await axiosClient.get('/patient-portal/dashboard');
      setDashboardData(res?.data || res);
    } catch (err) {
      console.error('Failed to load patient dashboard:', err);
    }
  };

  const fetchMyHospitals = async () => {
    try {
      const res = await axiosClient.get('/patient-portal/hospitals');
      const hospitals = res.hospitals || res.data?.hospitals || [];
      setMyHospitals(hospitals);
    } catch (err) {
      // Non-critical: patient may not have GlobalPatient yet
    }
  };

  const fetchActiveContext = async () => {
    try {
      const res = await axiosClient.get('/patient-portal/active-context');
      setActiveContext(res.data || res || null);
    } catch (err) {
      setActiveContext(null);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axiosClient.get('/patient-portal/history');
      setHistoryTimeline(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load treatment history:', err);
    }
  };

  const fetchPrescriptions = async () => {
    try {
      const res = await axiosClient.get('/patient-portal/prescriptions');
      setPrescriptions(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
    }
  };

  const fetchLabReports = async () => {
    try {
      const res = await axiosClient.get('/patient-portal/lab-reports');
      setLabReports(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load lab reports:', err);
    }
  };

  const fetchRadiologyReports = async () => {
    try {
      const res = await axiosClient.get('/patient-portal/radiology-reports');
      setRadiologyReports(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load radiology reports:', err);
    }
  };

  const fetchBilling = async () => {
    try {
      const res = await axiosClient.get('/patient-portal/billing');
      setBillingData(res.data?.data || res.data || { invoices: [], receipts: [] });
    } catch (err) {
      console.error('Failed to load billing ledger:', err);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await axiosClient.get('/patient-portal/my-requests');
      setMyRequests(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
    }
  };

  const handleCreateRequest = async (requestType, notes = '') => {
    setIsLoading(true);
    setRequestFeedback(null);
    try {
      await axiosClient.post('/patient-portal/my-requests', {
        requestType,
        notes: notes || `Patient requested ${requestType} from Patient Portal`,
      });
      setRequestFeedback({
        type: 'success',
        message: `Request '${requestType}' submitted successfully! Assigned care team notified.`,
      });
      fetchRequests();
      fetchDashboardData();
    } catch (err) {
      console.error('Create request error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to submit request.';
      setRequestFeedback({
        type: 'error',
        message: `Failed to submit request '${requestType}': ${errMsg}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerEmergency = async () => {
    setEmergencySubmitting(true);
    try {
      await axiosClient.post('/patient-portal/my-requests', {
        requestType: 'EMERGENCY',
        priority: 'CRITICAL',
        notes: 'EMERGENCY CODE BLUE DISPATCHED FROM PATIENT PORTAL',
      });
      setShowEmergencyModal(false);
      fetchDashboardData();
      fetchRequests();
      setRequestFeedback({
        type: 'success',
        message: '🚨 EMERGENCY ALERT BROADCAST TO ALL DUTY STAFF & EMERGENCY CONSOLE!',
      });
    } catch (err) {
      console.error('Trigger emergency error:', err);
      setShowEmergencyModal(false);
      const errMsg = err.response?.data?.message || err.message || 'Failed to trigger emergency alert.';
      setRequestFeedback({
        type: 'error',
        message: `🚨 Emergency alert failed: ${errMsg}`,
      });
    } finally {
      setEmergencySubmitting(false);
    }
  };

  const patient = dashboardData?.patient || {};
  const careTeam = dashboardData?.careTeam || {};
  const admission = dashboardData?.admissionDetails || null;

  return (
    <div className="space-y-6 animate-fade-in pb-12">

      {/* ── Multi-Hospital Selector (if patient has multiple hospitals) ── */}
      {myHospitals.length > 1 && (
        <div style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 16, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 18 }}>🏥</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#818cf8' }}>My Hospitals</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {myHospitals.map((h) => (
              <button
                key={String(h.hospitalId)}
                onClick={() => setSelectedHospitalId(h.hospitalId)}
                style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                  background: String(selectedHospitalId || activeContext?.hospitalId) === String(h.hospitalId) ? 'rgba(79,70,229,0.25)' : 'rgba(255,255,255,0.05)',
                  color: String(selectedHospitalId || activeContext?.hospitalId) === String(h.hospitalId) ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                  borderColor: String(selectedHospitalId || activeContext?.hospitalId) === String(h.hospitalId) ? 'rgba(79,70,229,0.4)' : 'rgba(255,255,255,0.1)',
                }}
              >
                {h.hasActiveAdmission ? '🔴 ' : ''}{h.hospitalName}
                <span style={{ marginLeft: 6, opacity: 0.6 }}>({h.localUhid})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Active Admission Banner ── */}
      {hasActiveAdmission && (
        <div style={{ background: 'linear-gradient(135deg, #fff1f2, #fff7ed)', border: '1px solid #fda4af', borderRadius: 16, padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 22 }}>🏥</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f87171' }}>Currently Admitted – IPD</div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                Ward: {activeContext.admission?.targetWardName || '—'} &nbsp;·&nbsp; Bed: {activeContext.admission?.bedNumber || '—'} &nbsp;·&nbsp;
                Status: <strong style={{ color: '#fbbf24' }}>{activeContext.admission?.status}</strong>
              </div>
            </div>
            {activeContext.careTeam?.length > 0 && (
              <div style={{ display: 'flex', gap: 6 }}>
                {activeContext.careTeam.slice(0, 3).map((c, i) => (
                  <span key={i} style={{ background: '#ffffff', border: '1px solid #fecdd3', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#475569', fontWeight: 600 }}>
                    {c.role.replace('_', ' ')} · {c.userId?.name || c.userName}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Discharge Read-Only Banner ── */}
      {!hasActiveAdmission && patient.admissionStatus === 'DISCHARGED' && (
        <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 16, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>📋</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>Admission Closed – Read Only Mode</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Your last admission has ended. Live service requests and emergency alerts are disabled. View your records below.</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0 border border-indigo-500">
            {patient.firstName?.[0] || user?.name?.[0] || 'P'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {patient.firstName ? `${patient.firstName} ${patient.lastName}` : user?.name || 'Patient Workspace'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                UHID: {patient.uhid || 'HOSP-ONLINE'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
              <span>Category: <strong className="text-slate-800">{patient.category || 'GENERAL'}</strong></span>
              <span>•</span>
              <span>Gender: <strong className="text-slate-800">{patient.gender || 'MALE'}</strong></span>
              <span>•</span>
              <span>Age: <strong className="text-slate-800">{patient.age || '35'} Yrs</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {hasActiveAdmission ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowEmergencyModal(true)}
              className="font-extrabold shadow-md shadow-rose-600/30 gap-1.5 px-4 py-2"
            >
              <ShieldAlert size={16} /> 🚨 TRIGGER EMERGENCY
            </Button>
          ) : (
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '6px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
              🔒 Emergency — Not Admitted
            </span>
          )}
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-bold scrollbar-none">
        {[
          { key: 'dashboard', label: 'Dashboard Overview', icon: Activity },
          { key: 'profile', label: 'My Profile', icon: User },
          { key: 'tokens', label: 'My Tokens', icon: Ticket },
          { key: 'treatment', label: 'Current Treatment', icon: Heart },
          { key: 'history', label: 'Treatment History', icon: Clock },
          { key: 'prescriptions', label: 'Prescriptions', icon: Pill },
          { key: 'lab-reports', label: 'Lab Reports', icon: TestTube },
          { key: 'radiology-reports', label: 'Radiology Reports', icon: FileImage },
          { key: 'admission', label: 'Admission & Bed', icon: BedDouble },
          { key: 'care-team', label: 'Assigned Care Team', icon: Users },
          { key: 'requests', label: 'Patient Requests', icon: Bell },
          { key: 'billing', label: 'Billing & Ledgers', icon: Receipt },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setCurrentTab(tab.key)}
              className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Feedback Banner */}
      {requestFeedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between gap-3 shadow-xs ${
            (typeof requestFeedback === 'object' && requestFeedback.type === 'error')
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {(typeof requestFeedback === 'object' && requestFeedback.type === 'error') ? (
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
            ) : (
              <CheckCircle size={18} className="text-emerald-600 shrink-0" />
            )}
            <span>{typeof requestFeedback === 'string' ? requestFeedback : requestFeedback.message}</span>
          </div>
          <button
            onClick={() => setRequestFeedback(null)}
            className={
              (typeof requestFeedback === 'object' && requestFeedback.type === 'error')
                ? 'text-rose-700 hover:underline text-xs'
                : 'text-emerald-700 hover:underline text-xs'
            }
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {currentTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Hospital Status"
              value={dashboardData?.currentStatus || 'UNDER CARE'}
              subtitle={admission ? `Ward: ${admission.wardName}` : 'Outpatient Consult'}
              icon={Activity}
              color="emerald"
            />
            <StatCard
              title="Active OPD Token / Queue"
              value={dashboardData?.queuePosition || 'N/A'}
              subtitle={careTeam.doctor ? `Dr. ${careTeam.doctor.name}` : 'No active token'}
              icon={Ticket}
              color="sky"
            />
            <StatCard
              title="Pending Diagnostics"
              value={`${(dashboardData?.pendingLabs || 0) + (dashboardData?.pendingRadiology || 0)} Tests`}
              subtitle={`${dashboardData?.pendingLabs || 0} Lab / ${dashboardData?.pendingRadiology || 0} Radiology`}
              icon={TestTube}
              color="purple"
            />
            <StatCard
              title="Outstanding Balance"
              value={`₹${(dashboardData?.totalPendingAmount || 0).toLocaleString()}`}
              subtitle="Itemized Invoices Due"
              icon={Receipt}
              color="amber"
            />
          </div>

          {/* Admission & Location Card */}
          {admission && (
            <Card>
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BedDouble size={18} className="text-indigo-600" />
                  Inpatient Bed & Ward Location
                </h3>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ADMITTED
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500">Admission No:</span>
                  <p className="font-bold text-slate-900 font-mono text-sm">{admission.admissionNo}</p>
                </div>
                <div>
                  <span className="text-slate-500">Ward Name:</span>
                  <p className="font-bold text-slate-900 text-sm">{admission.wardName}</p>
                </div>
                <div>
                  <span className="text-slate-500">Room Number:</span>
                  <p className="font-bold text-slate-900 text-sm">{admission.roomNumber}</p>
                </div>
                <div>
                  <span className="text-slate-500">Bed Number:</span>
                  <p className="font-bold text-indigo-600 text-sm">{admission.bedNumber}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Quick Care Request Launcher */}
          <Card>
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Bell size={18} className="text-amber-600" />
              Quick In-Bed Care Requests
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Tap any request below to instantly notify your assigned Nurse or Caretaker.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <Button variant="glass" className="py-3 border-indigo-200 font-bold" onClick={() => handleCreateRequest('WATER')}>
                💧 Water Request
              </Button>
              <Button variant="glass" className="py-3 border-indigo-200 font-bold" onClick={() => handleCreateRequest('FOOD')}>
                🍱 Food / Meals
              </Button>
              <Button variant="glass" className="py-3 border-indigo-200 font-bold" onClick={() => handleCreateRequest('MEDICINE')}>
                💊 Medicine Check
              </Button>
              <Button variant="glass" className="py-3 border-indigo-200 font-bold" onClick={() => handleCreateRequest('IV_DRIP')}>
                🩸 IV Drip Check
              </Button>
              <Button variant="glass" className="py-3 border-indigo-200 font-bold" onClick={() => handleCreateRequest('RESTROOM')}>
                ♿ Restroom Assist
              </Button>
              <Button variant="glass" className="py-3 border-indigo-200 font-bold" onClick={() => handleCreateRequest('CLEANING')}>
                🧹 Room Cleaning
              </Button>
              <Button variant="glass" className="py-3 border-indigo-200 font-bold" onClick={() => handleCreateRequest('PAIN_ASSISTANCE')}>
                ⚡ Pain Assistance
              </Button>
              <Button variant="glass" className="py-3 border-indigo-200 font-bold" onClick={() => handleCreateRequest('BLANKET')}>
                🛌 Blanket / Pillow
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: MY PROFILE */}
      {currentTab === 'profile' && (
        <Card>
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <User size={18} className="text-indigo-600" />
            Patient Personal Demographics & EHR Profile
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Full Name</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{patient.firstName} {patient.lastName}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Permanent UHID</span>
              <p className="font-bold text-indigo-600 font-mono text-sm mt-0.5">{patient.uhid}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Contact Phone</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{patient.phone}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Email Address</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{patient.email || 'N/A'}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Blood Group</span>
              <p className="font-bold text-red-600 text-sm mt-0.5">{patient.bloodGroup}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Patient Category</span>
              <p className="font-bold text-purple-600 text-sm mt-0.5">{patient.category}</p>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-500 font-medium">Residential Address</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{patient.address}, {patient.city}</p>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 3: CARE TEAM */}
      {currentTab === 'care-team' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users size={18} className="text-indigo-600" />
            Assigned Clinical & Nursing Care Team
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <Card className="border-l-4 border-l-indigo-600">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {careTeam.doctor ? `Dr. ${careTeam.doctor.name.replace(/^Dr\.\s*/i, '')}` : 'Not assigned'}
                  </h4>
                  <p className="text-[11px] text-slate-500">{careTeam.doctor?.specialization || 'General Medicine'}</p>
                </div>
              </div>
              <p className="text-slate-600 mt-2">Assigned OPD Cabin: <strong>{careTeam.doctor?.cabinNo || 'Not assigned'}</strong></p>
              <p className="text-slate-600">Duty Shift: <strong>{careTeam.doctor?.shiftPattern || 'Not available'}</strong></p>
            </Card>

            <Card className="border-l-4 border-l-emerald-600">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Activity size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {careTeam.nurse?.name || 'Not assigned'}
                  </h4>
                  <p className="text-[11px] text-slate-500">Registered Ward Nurse</p>
                </div>
              </div>
              <p className="text-slate-600 mt-2">Station: <strong>{careTeam.nurse?.assignedUnit || 'Not assigned'}</strong></p>
              <p className="text-slate-600">Shift: <strong>{careTeam.nurse?.shiftDetails || 'Not available'}</strong></p>
            </Card>

            <Card className="border-l-4 border-l-amber-600">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <User size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{careTeam.caretaker?.name || 'Not assigned'}</h4>
                  <p className="text-[11px] text-slate-500">Patient Caretaker Staff</p>
                </div>
              </div>
              <p className="text-slate-600 mt-2">Assigned Unit: <strong>{careTeam.caretaker?.assignedUnit || 'Not assigned'}</strong></p>
              <p className="text-slate-600">Shift: <strong>{careTeam.caretaker?.shiftDetails || 'Not available'}</strong></p>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: TREATMENT HISTORY TIMELINE */}
      {currentTab === 'history' && (
        <Card>
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock size={18} className="text-indigo-600" />
              Chronological Healthcare Journey & Treatment History
            </span>
            <Button size="sm" variant="outline" onClick={fetchHistory} className="text-xs font-bold">
              Refresh Timeline
            </Button>
          </h3>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {historyTimeline.length > 0 ? (
              historyTimeline.map((item) => (
                <div key={item.id} className="relative text-xs">
                  <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-indigo-600 ring-4 ring-white"></div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.date).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-600">{item.description}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                        {item.department}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 font-bold">
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-400">Loading timeline...</div>
            )}
          </div>
        </Card>
      )}

      {/* TAB 5: PATIENT CARE REQUESTS */}
      {currentTab === 'requests' && (
        <div className="space-y-6">
          <Card>
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Bell size={18} className="text-amber-600" />
              Submit Patient Care Request
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Select request type. Nurse requests route to Ward Nurse; Water & Food route to Caretaker.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { type: 'WATER', label: '💧 Water Request' },
                { type: 'FOOD', label: '🍱 Food / Meal' },
                { type: 'RESTROOM', label: '♿ Restroom Assist' },
                { type: 'MEDICINE', label: '💊 Medicine Check' },
                { type: 'INJECTION', label: '💉 Injection Assist' },
                { type: 'IV_DRIP', label: '🩸 IV Drip Change' },
                { type: 'URINE_BAG', label: '🚽 Urine Bag Check' },
                { type: 'CATHETER', label: '🩺 Catheter Check' },
                { type: 'BED_POSITION', label: '🛏️ Bed Adjustment' },
                { type: 'CLEANING', label: '🧹 Room Cleaning' },
                { type: 'PAIN_ASSISTANCE', label: '⚡ Pain Assistance' },
                { type: 'DOCTOR', label: '👨‍⚕️ Request Doctor' },
              ].map((item) => (
                <Button
                  key={item.type}
                  variant="glass"
                  className="py-3 border-indigo-200 font-bold"
                  isLoading={isLoading}
                  onClick={() => handleCreateRequest(item.type)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </Card>

          {/* Active Requests Tracker */}
          <Card>
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Clock size={18} className="text-indigo-600" />
              Live Requests Dispatch Tracker
            </h3>
            <div className="space-y-3 text-xs">
              {myRequests.length > 0 ? (
                myRequests.map((req) => {
                  const assignedNurseName = req.assignedNurseId?.name || req.assignedNurseId;
                  const assignedCaretakerName = req.assignedCaretakerId?.name || req.assignedCaretakerId;
                  const targetLabel = req.requestCategory === 'CARETAKER'
                    ? (assignedCaretakerName ? `Assigned Caretaker: ${assignedCaretakerName}` : 'Duty Caretaker & Ward Nurse')
                    : (assignedNurseName ? `Assigned Nurse: ${assignedNurseName}` : 'Ward Nursing Station');

                  return (
                    <div key={req._id} className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-sm">{req.requestType}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                            {req.requestCategory}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-800 font-bold">
                            Dispatched to: {targetLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Submitted: {new Date(req.submittedAt || req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {assignedNurseName && ` • Attending Nurse: ${assignedNurseName}`}
                          {req.acceptedBy?.name && ` • Accepted by: ${req.acceptedBy.name}`}
                          {req.completedBy?.name && ` • Resolved by: ${req.completedBy.name}`}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${
                        req.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        req.status === 'ACCEPTED' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-slate-400">No active care requests submitted yet.</div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* READ-ONLY PRESCRIPTIONS, LAB, RADIOLOGY, BILLING */}
      {currentTab === 'prescriptions' && (
        <Card>
          <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Pill size={18} className="text-indigo-600" />
            Approved E-Prescriptions History (Read-Only)
          </h3>
          <div className="space-y-3 text-xs">
            {prescriptions.map((rx) => (
              <div key={rx._id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">Issued by Dr. {rx.doctorId?.name || 'Consultant'}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{new Date(rx.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="space-y-1">
                  {rx.medicines?.map((m, i) => (
                    <p key={i} className="text-slate-700 font-medium">• {m.name} - {m.dosage} ({m.frequency || 'Daily'})</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* EMERGENCY CONFIRMATION MODAL */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-rose-200 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <ShieldAlert size={32} />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-extrabold text-slate-900">Confirm Emergency Code Blue Dispatch</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to trigger an immediate Emergency Alert? Duty Nurses, Caretakers, Physicians, and Emergency Console will be notified instantly.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p><span className="text-slate-500">Patient:</span> <strong>{patient.firstName} {patient.lastName}</strong></p>
              <p><span className="text-slate-500">Location:</span> <strong>{admission?.wardName || 'Ward 3B'}, Room {admission?.roomNumber || '101'}, Bed {admission?.bedNumber || '1'}</strong></p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="w-1/2 font-bold text-xs" onClick={() => setShowEmergencyModal(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                className="w-1/2 font-extrabold text-xs bg-rose-600 hover:bg-rose-700"
                isLoading={emergencySubmitting}
                onClick={handleTriggerEmergency}
              >
                CONFIRM DISPATCH 🚨
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
