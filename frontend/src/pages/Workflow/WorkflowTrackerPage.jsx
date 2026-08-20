import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Search,
  RefreshCw,
  Clock,
  User,
  Stethoscope,
  Syringe,
  TestTube,
  Pill,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Eye,
  Building2,
  Activity,
  FileText,
  DollarSign,
  Layers,
} from 'lucide-react';
import { axiosClient } from '../../api/axiosClient';
import { useSocket } from '../../providers/SocketProvider';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const WorkflowTrackerPage = () => {
  const { socket } = useSocket();
  const [journeys, setJourneys] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    atNurse: 0,
    inLab: 0,
    atPharmacy: 0,
    atBilling: 0,
    completed: 0,
    delayedAlerts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStageTab, setActiveStageTab] = useState('ALL');
  const [selectedJourney, setSelectedJourney] = useState(null);

  const fetchTrackerData = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/workflow/tracker', {
        params: {
          search: searchTerm,
          stage: activeStageTab,
        },
      });
      const data = res.data?.data || res.data || {};
      setJourneys(data.journeys || []);
      setStats(data.stats || {});
    } catch (err) {
      console.error('Failed to fetch hospital workflow tracker data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackerData();
  }, [searchTerm, activeStageTab]);

  useEffect(() => {
    if (!socket) return;
    const handleSync = () => {
      fetchTrackerData();
    };

    socket.on('workflow:notification', handleSync);
    socket.on('workflow:pending_changed', handleSync);
    socket.on('opd_queue:updated', handleSync);
    socket.on('opd_queue:status_changed', handleSync);
    socket.on('department:order_update', handleSync);

    return () => {
      socket.off('workflow:notification', handleSync);
      socket.off('workflow:pending_changed', handleSync);
      socket.off('opd_queue:updated', handleSync);
      socket.off('opd_queue:status_changed', handleSync);
      socket.off('department:order_update', handleSync);
    };
  }, [socket, searchTerm, activeStageTab]);

  const getStageBadge = (stage) => {
    switch (stage) {
      case 'AT_NURSE':
        return { bg: 'bg-purple-100 text-purple-800 border-purple-300', icon: Syringe, text: 'At Nurse Station' };
      case 'IN_DIAGNOSTICS':
        return { bg: 'bg-sky-100 text-sky-800 border-sky-300', icon: TestTube, text: 'In Diagnostics (Lab/X-Ray)' };
      case 'AT_PHARMACY':
        return { bg: 'bg-amber-100 text-amber-800 border-amber-300', icon: Pill, text: 'At Pharmacy Desk' };
      case 'AT_BILLING':
        return { bg: 'bg-rose-100 text-rose-800 border-rose-300', icon: Receipt, text: 'At Central Billing' };
      case 'RETURNED_TO_DOCTOR':
        return { bg: 'bg-teal-100 text-teal-800 border-teal-300', icon: Stethoscope, text: 'Returned to Doctor' };
      case 'IN_CONSULTATION':
        return { bg: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: Stethoscope, text: 'In Doctor Consultation' };
      case 'COMPLETED_SETTLED':
        return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle2, text: 'Bill Settled & Discharged' };
      case 'CANCELLED':
        return { bg: 'bg-slate-200 text-slate-700 border-slate-300', icon: AlertTriangle, text: 'Cancelled' };
      default:
        return { bg: 'bg-slate-100 text-slate-800 border-slate-200', icon: Clock, text: 'Queued / Waiting' };
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in text-slate-900">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700">
              <GitBranch size={22} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                Hospital Data Journey & Live Workflow Tracker
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time tracking of patient data provenance: from registration, doctor orders, nursing & diagnostics, to pharmacy and billing settlement.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchTrackerData}
            isLoading={loading}
            className="text-xs font-bold gap-1.5 border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Live Refresh
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setActiveStageTab('ALL')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeStageTab === 'ALL'
              ? 'bg-indigo-50 border-indigo-400 shadow-xs scale-[1.02]'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">Total Active</span>
            <Activity size={14} className="text-indigo-600" />
          </div>
          <p className="text-xl font-black text-slate-900">{stats.total || 0}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Patients Tracked</p>
        </div>

        <div
          onClick={() => setActiveStageTab('NURSE')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeStageTab === 'NURSE'
              ? 'bg-purple-50 border-purple-400 shadow-xs scale-[1.02]'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-[11px] font-bold">In Nursing</span>
            <Syringe size={14} />
          </div>
          <p className="text-xl font-black text-purple-900">{stats.atNurse || 0}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Injection / Care</p>
        </div>

        <div
          onClick={() => setActiveStageTab('DIAGNOSTICS')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeStageTab === 'DIAGNOSTICS'
              ? 'bg-sky-50 border-sky-400 shadow-xs scale-[1.02]'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-sky-600 mb-1">
            <span className="text-[11px] font-bold">In Diagnostics</span>
            <TestTube size={14} />
          </div>
          <p className="text-xl font-black text-sky-900">{stats.inLab || 0}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Lab / X-Ray</p>
        </div>

        <div
          onClick={() => setActiveStageTab('PHARMACY')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeStageTab === 'PHARMACY'
              ? 'bg-amber-50 border-amber-400 shadow-xs scale-[1.02]'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] font-bold">At Pharmacy</span>
            <Pill size={14} />
          </div>
          <p className="text-xl font-black text-amber-900">{stats.atPharmacy || 0}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Dispense Queue</p>
        </div>

        <div
          onClick={() => setActiveStageTab('BILLING')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeStageTab === 'BILLING'
              ? 'bg-rose-50 border-rose-400 shadow-xs scale-[1.02]'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-[11px] font-bold">At Billing</span>
            <Receipt size={14} />
          </div>
          <p className="text-xl font-black text-rose-900">{stats.atBilling || 0}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Pending Cashier</p>
        </div>

        <div
          onClick={() => setActiveStageTab('ALERTS')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeStageTab === 'ALERTS'
              ? 'bg-red-50 border-red-400 shadow-xs scale-[1.02]'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-red-600 mb-1">
            <span className="text-[11px] font-bold">Audit Alerts</span>
            <ShieldAlert size={14} />
          </div>
          <p className="text-xl font-black text-red-600">{stats.delayedAlerts || 0}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Bottlenecks</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { key: 'ALL', label: 'All Active' },
            { key: 'NURSE', label: '💉 Nursing' },
            { key: 'DIAGNOSTICS', label: '🧪 Diagnostics' },
            { key: 'PHARMACY', label: '💊 Pharmacy' },
            { key: 'BILLING', label: '💳 Billing Settlement' },
            { key: 'COMPLETED', label: '✓ Settled & Done' },
            { key: 'ALERTS', label: '⚠️ Audit Alerts' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveStageTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeStageTab === tab.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search patient, UHID, token, staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
          />
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
        </div>
      </div>

      {/* Main Data Journey Board */}
      <Card className="bg-white border border-slate-200 shadow-sm p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-50 text-slate-700 text-[11px] font-black uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Patient / Token</th>
                <th className="p-3.5">Where it came from</th>
                <th className="p-3.5">Current Department & Staff</th>
                <th className="p-3.5">Next Destination</th>
                <th className="p-3.5">Financial Clearance</th>
                <th className="p-3.5 text-center">Audit Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {journeys.length > 0 ? (
                journeys.map((j) => {
                  const badge = getStageBadge(j.currentStage);
                  const BadgeIcon = badge.icon;
                  return (
                    <tr
                      key={j.id}
                      onClick={() => setSelectedJourney(j)}
                      className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                    >
                      {/* Patient & Token */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-1 rounded-md text-[11px] bg-slate-900 text-white font-mono font-black shrink-0">
                            #{j.tokenNumber}
                          </span>
                          <div>
                            <p className="font-extrabold text-slate-900 text-xs">{j.patient.name}</p>
                            <p className="text-[10px] text-indigo-700 font-mono font-bold mt-0.5">
                              {j.patient.uhid} • {j.patient.gender}/{j.patient.age}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Origin */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                            <Building2 size={12} className="text-slate-400" />
                            <span>{j.origin.department}</span>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            Consultant: <strong>Dr. {j.doctor.name}</strong> ({j.doctor.cabin})
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {new Date(j.origin.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </td>

                      {/* Current Stage & Handling Staff */}
                      <td className="p-3.5">
                        <div className="space-y-1.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badge.bg}`}>
                            <BadgeIcon size={11} />
                            {badge.text}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] text-slate-800">
                            <User size={12} className="text-slate-400" />
                            <span>Handling: <strong>{j.handlingStaff.name}</strong></span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold uppercase">
                              {j.handlingStaff.role}
                            </span>
                          </div>
                          {j.auditAlerts?.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-rose-600 font-bold animate-pulse">
                              <AlertTriangle size={11} />
                              <span>{j.auditAlerts[0].message}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Next Destination */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-indigo-950 font-bold bg-indigo-50/70 p-2 rounded-lg border border-indigo-100">
                          <ArrowRight size={13} className="text-indigo-600 shrink-0" />
                          <span>{j.nextDestination}</span>
                        </div>
                      </td>

                      {/* Financial Clearance */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-black text-slate-900">
                            Total: ₹{j.financials.totalAmount}
                          </p>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black ${
                            j.financials.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : j.financials.paymentStatus === 'PARTIALLY_PAID'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {j.financials.paymentStatus === 'PAID' ? '✓ SETTLED' : `PENDING: ₹${j.financials.balanceAmount}`}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="p-3.5 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJourney(j);
                          }}
                          className="text-[11px] font-bold py-1 px-2.5 border-slate-300 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300"
                        >
                          <Eye size={12} className="mr-1" />
                          Journey Map
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    {loading ? 'Fetching live hospital workflow journeys...' : 'No active hospital data journeys matching criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Comprehensive Patient Data Journey Modal */}
      {selectedJourney && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="max-w-3xl w-full bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/10 text-indigo-300">
                  <GitBranch size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500 text-black font-black text-xs font-mono">
                      TOKEN #{selectedJourney.tokenNumber}
                    </span>
                    <h3 className="text-base font-black text-white">
                      {selectedJourney.patient.name}
                    </h3>
                  </div>
                  <p className="text-xs text-indigo-200 font-mono mt-0.5">
                    UHID: {selectedJourney.patient.uhid} • Age: {selectedJourney.patient.age} • Phone: {selectedJourney.patient.phone}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedJourney(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Content - Stepper & Audit Log */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-800">
              {/* Provenance Quick Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">1. Data Origin</span>
                  <p className="font-extrabold text-slate-900 mt-0.5">{selectedJourney.origin.department}</p>
                  <p className="text-[11px] text-slate-600">Registered: {new Date(selectedJourney.origin.time).toLocaleTimeString()}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">2. Current Handling</span>
                  <p className="font-extrabold text-indigo-700 mt-0.5">{selectedJourney.handlingStaff.name}</p>
                  <p className="text-[11px] text-slate-600">{selectedJourney.currentStageLabel}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">3. Next Destination</span>
                  <p className="font-extrabold text-emerald-700 mt-0.5">{selectedJourney.nextDestination}</p>
                  <p className="text-[11px] text-slate-600">Invoice: {selectedJourney.financials.invoiceNo}</p>
                </div>
              </div>

              {/* Step-by-Step Chronological Journey Timeline */}
              <div className="space-y-3">
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                  <Layers size={16} className="text-indigo-600" />
                  Chronological Step-by-Step Hospital Journey
                </h4>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {selectedJourney.journeySteps.map((step, idx) => (
                    <div key={idx} className="relative group">
                      <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${
                        step.status === 'COMPLETED'
                          ? 'bg-emerald-500 border-emerald-600 text-white'
                          : step.status === 'IN_PROGRESS'
                          ? 'bg-indigo-600 border-indigo-700 text-white animate-pulse'
                          : 'bg-slate-200 border-slate-300 text-slate-600'
                      }`}>
                        {step.status === 'COMPLETED' ? '✓' : step.stepIndex}
                      </div>

                      <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-xs">{step.title}</span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 uppercase">
                              {step.department}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-slate-400">
                              {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                              step.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : step.status === 'IN_PROGRESS'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {step.status}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-700 mt-1">{step.details}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Action Performed By: <strong>{step.staff}</strong></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <Button
                variant="primary"
                onClick={() => setSelectedJourney(null)}
                className="font-bold text-xs"
              >
                Close Journey Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowTrackerPage;
