import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../providers/SocketProvider';
import { useDepartmentNotificationStore } from '../../store/departmentNotificationStore';
import { TestTube, QrCode, FileCheck, CheckCircle2, FlaskConical, AlertCircle, Upload, Check, Printer, FileSpreadsheet } from 'lucide-react';

export const LabTechDashboard = () => {
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const resolvePending = useDepartmentNotificationStore((state) => state.resolvePending);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(tabParam || 'ACTIVE');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reportSummary, setReportSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam.toUpperCase());
    } else {
      setActiveTab('ACTIVE');
    }
  }, [tabParam, location.search]);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNewRequest = () => fetchOrders();
    const handleStatusUpdate = () => fetchOrders();

    socket.on('investigation:new_request', handleNewRequest);
    socket.on('investigation:status_updated', handleStatusUpdate);

    return () => {
      socket.off('investigation:new_request', handleNewRequest);
      socket.off('investigation:status_updated', handleStatusUpdate);
    };
  }, [socket]);

  const fetchOrders = async () => {
    try {
      const res = await axiosClient.get('/diagnostics/orders?testCategory=PATHOLOGY');
      const list = res.data || [];
      setOrders(list);
      if (list.length > 0) {
        setSelectedOrder((prev) => (prev ? list.find((o) => o._id === prev._id) || list[0] : list[0]));
      } else {
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Failed to load pathology orders:', err);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await axiosClient.patch(`/diagnostics/orders/${orderId}/status`, {
        status: newStatus,
        notes: `Department updated status to ${newStatus}`,
      });
      if (['ACCEPTED', 'IN_PROGRESS'].includes(newStatus)) setActiveTab('PROGRESS');
      fetchOrders();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handlePublishReport = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setIsLoading(true);
    try {
      await axiosClient.post(`/diagnostics/orders/${selectedOrder._id}/report`, {
        reportSummary: reportSummary || 'Pathology analysis completed within physiological parameters.',
        price: selectedOrder.price === '' || selectedOrder.price === undefined || selectedOrder.price === null ? 120 : Number(selectedOrder.price),
        attachments: [
          {
            fileName: `${selectedOrder.testName}_Report_${selectedOrder.uhid}.pdf`,
            fileUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
            fileType: 'PATHOLOGY_PDF',
          },
        ],
      });

      resolvePending(selectedOrder._id);

      setReportSummary('');
      fetchOrders();
    } catch (err) {
      console.error('Failed to publish report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const incomingOrders = orders.filter((o) => ['REQUESTED', 'DEPARTMENT_RECEIVED'].includes(o.status));
  const progressOrders = orders.filter((o) => ['ACCEPTED', 'IN_PROGRESS'].includes(o.status));
  const activeOrders = [...incomingOrders, ...progressOrders];
  const completedOrders = orders.filter((o) => ['COMPLETED', 'REPORT_UPLOADED', 'REVIEWED'].includes(o.status));

  const pendingCount = orders.filter((o) => o.status === 'REQUESTED').length;
  const inProgressCount = orders.filter((o) => o.status === 'IN_PROGRESS' || o.status === 'ACCEPTED').length;
  const emergencyCount = orders.filter((o) => o.priority === 'EMERGENCY').length;

  const currentQueue = (activeTab === 'COMPLETED' || activeTab === 'REPORTS')
    ? completedOrders
    : activeTab === 'PROGRESS'
      ? progressOrders
      : incomingOrders;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          {activeTab === 'SAMPLES' && 'Sample Intake & Barcode Scanning Workbench'}
          {activeTab === 'RESULTS' && 'Pathology Analyzer & Result Entry Workbench'}
          {(activeTab === 'REPORTS' || activeTab === 'COMPLETED') && 'Pathology Report Verification & Sign-Off'}
          {(activeTab === 'ACTIVE' || activeTab === 'OVERVIEW') && 'Pathology Laboratory & LIS Workstation'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {user?.name || 'Lab Technologist'} — Auto-Dispatched Pathology Queue & Laboratory Information System
        </p>
      </div>



      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Pathology Requests" value={`${activeOrders.length} Active`} subtitle="Auto-Dispatched by Doctors" icon={TestTube} color="amber" />
        <StatCard title="In Progress" value={`${inProgressCount} Processing`} subtitle="Analyzer Processing" icon={FlaskConical} color="purple" />
        <StatCard title="Emergency Requests" value={`${emergencyCount} STAT`} subtitle="Priority 1 Diagnostics" icon={AlertCircle} color="red" />
        <StatCard title="Completed Reports" value={`${completedOrders.length} Verified`} subtitle="Sent to Doctor & Portal" icon={FileCheck} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Order Queue with Active / Completed Tabs */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setActiveTab('ACTIVE')}
                className={`px-3 py-1 rounded font-bold transition-all ${
                  activeTab === 'ACTIVE' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Incoming ({incomingOrders.length})
              </button>
              <button
                onClick={() => setActiveTab('PROGRESS')}
                className={`px-3 py-1 rounded font-bold transition-all ${
                  activeTab === 'PROGRESS' ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Accepted / In Progress ({progressOrders.length})
              </button>
              <button
                onClick={() => setActiveTab('COMPLETED')}
                className={`px-3 py-1 rounded font-bold transition-all ${
                  activeTab === 'COMPLETED' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Completed & Sent ({completedOrders.length})
              </button>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-600 font-bold border border-indigo-200">
              LIS LIVE
            </span>
          </div>

          <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
            {currentQueue.length > 0 ? (
              currentQueue.map((ord) => (
                <div
                  key={ord._id}
                  onClick={() => setSelectedOrder(ord)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedOrder?._id === ord._id
                      ? 'bg-indigo-50 border-indigo-400 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      ord.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}>
                      {ord.testName}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${
                      ord.priority === 'EMERGENCY' ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {ord.priority}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 text-sm mt-1">{ord.patientName} ({ord.patientAge})</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-indigo-700 font-mono">UHID: {ord.uhid}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      ord.status === 'COMPLETED' || ord.status === 'REPORT_UPLOADED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">
                {activeTab === 'ACTIVE' ? 'No active pathology requests.' : 'No completed lab tests in history.'}
              </div>
            )}
          </div>
        </Card>

        {/* Action Workbench & Report Publishing */}
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FlaskConical size={18} className="text-indigo-500" />
              Pathology Result Entry & Verification Workbench
            </h3>
            {selectedOrder && (
              <div className="flex gap-2">
                {selectedOrder.status === 'REQUESTED' && (
                  <Button size="sm" variant="primary" className="bg-sky-600 hover:bg-sky-700 font-bold text-xs" onClick={() => handleUpdateStatus(selectedOrder._id, 'ACCEPTED')}>
                    <Check size={14} /> Accept Request & Notify Doctor
                  </Button>
                )}
                {selectedOrder.status === 'ACCEPTED' && (
                  <span className="px-3 py-1 rounded bg-sky-50 text-sky-700 border border-sky-200 font-bold text-xs flex items-center gap-1">
                    <FlaskConical size={14} /> ACCEPTED — PROCESSING TEST
                  </span>
                )}
                {selectedOrder.status === 'ACCEPTED' && (
                  <Button size="sm" variant="primary" className="bg-violet-600 hover:bg-violet-700 font-bold text-xs" onClick={() => handleUpdateStatus(selectedOrder._id, 'IN_PROGRESS')}>
                    <FlaskConical size={14} /> Start Processing
                  </Button>
                )}
                {['COMPLETED', 'REPORT_UPLOADED', 'REVIEWED'].includes(selectedOrder.status) && (
                  <span className="px-3 py-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold text-xs flex items-center gap-1">
                    <CheckCircle2 size={14} /> REPORT SUBMITTED TO DOCTOR
                  </span>
                )}
              </div>
            )}
          </div>

          {selectedOrder ? (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <p className="text-slate-500">Patient Name:</p>
                  <p className="font-bold text-slate-900 text-sm">{selectedOrder.patientName}</p>
                </div>
                <div>
                  <p className="text-slate-500">UHID & OP/IP:</p>
                  <p className="font-mono text-indigo-700 font-bold">{selectedOrder.uhid} ({selectedOrder.opIpNumber || 'OP-101'})</p>
                </div>
                <div>
                  <p className="text-slate-500">Requesting Doctor:</p>
                  <p className="font-bold text-slate-900">{selectedOrder.doctorName}</p>
                </div>
                <div>
                  <p className="text-slate-500">Current Status:</p>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    selectedOrder.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-indigo-600">Doctor Clinical Notes:</p>
                <p className="text-slate-600 italic">"{selectedOrder.clinicalNotes || 'No specific notes provided.'}"</p>
              </div>

              {['COMPLETED', 'REPORT_UPLOADED', 'REVIEWED'].includes(selectedOrder.status) ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-emerald-600 text-sm flex items-center gap-1.5">
                      <CheckCircle2 size={16} /> Pathology Report Completed & Verified
                    </span>
                    <span className="text-[11px] text-slate-500">Verified by: {selectedOrder.technicianName || user?.name}</span>
                  </div>
                  <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                    "{selectedOrder.reportSummary}"
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePublishReport} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg bg-white border border-slate-200">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Pathology Service Charge (₹):</label>
                      <input
                        type="text"
                        placeholder="Type cost (e.g. 120)"
                        className="w-full glass-input rounded-lg p-2 text-xs text-slate-900 font-mono font-bold"
                        value={selectedOrder.price === undefined || selectedOrder.price === null ? '' : selectedOrder.price}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedOrder((prev) => ({ ...prev, price: val }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Charge Status:</label>
                      <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-600 font-bold border border-emerald-200 text-[11px] block">
                        SUBMITTED TO DOCTOR FOR REVIEW
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Pathology Observed Values & Findings:</label>
                    <textarea
                      className="w-full glass-input rounded-lg p-2.5 text-xs text-slate-900"
                      rows={3}
                      placeholder="Enter automated analyzer findings and observed test values..."
                      value={reportSummary}
                      onChange={(e) => setReportSummary(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="submit" variant="success" size="sm" className="font-bold gap-1.5" isLoading={isLoading}>
                      <Upload size={14} /> Submit Report & Charges to Doctor
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm">
              Select an investigation request from the queue to process findings.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
