import React, { useState, useEffect } from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../providers/SocketProvider';
import { FileImage, CheckCircle2, Monitor, Activity, FileCheck, Upload, Check, Eye } from 'lucide-react';

export const RadiologistDashboard = () => {
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('ACTIVE');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [impression, setImpression] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      const res = await axiosClient.get('/diagnostics/orders?testCategory=RADIOLOGY');
      const list = res.data || [];
      setOrders(list);
      if (list.length > 0) {
        setSelectedOrder((prev) => (prev ? list.find((o) => o._id === prev._id) || list[0] : list[0]));
      } else {
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Failed to load radiology orders:', err);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await axiosClient.patch(`/diagnostics/orders/${orderId}/status`, {
        status: newStatus,
        notes: `Radiology department updated status to ${newStatus}`,
      });
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
        reportSummary: impression || 'Radiology DICOM scan reviewed. No acute bony abnormality.',
        price: selectedOrder.price || 800,
        attachments: [
          {
            fileName: `${selectedOrder.testName}_DICOM_${selectedOrder.uhid}.pdf`,
            fileUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
            fileType: 'DICOM_IMAGE',
          },
        ],
      });

      // Mark as COMPLETED directly
      await axiosClient.patch(`/diagnostics/orders/${selectedOrder._id}/status`, {
        status: 'COMPLETED',
        notes: 'Scan & Radiologist Report Completed',
      });

      setImpression('');
      fetchOrders();
    } catch (err) {
      console.error('Failed to publish radiology report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const activeOrders = orders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'REPORT_UPLOADED');
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED' || o.status === 'REPORT_UPLOADED');

  const pendingCount = orders.filter((o) => o.status === 'REQUESTED').length;
  const inProgressCount = orders.filter((o) => o.status === 'IN_PROGRESS' || o.status === 'ACCEPTED').length;
  const emergencyCount = orders.filter((o) => o.priority === 'EMERGENCY').length;

  const currentQueue = activeTab === 'ACTIVE' ? activeOrders : completedOrders;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Radiology & PACS Imaging Workstation</h2>
        <p className="text-xs text-slate-400 mt-1">{user?.name || 'Radiologist'} — Auto-Dispatched Imaging Queue (X-Ray / MRI / CT / USG)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active PACS Requests" value={`${activeOrders.length} Active`} subtitle="Auto-Dispatched by Doctor" icon={FileImage} color="sky" />
        <StatCard title="In Progress Scans" value={`${inProgressCount} Studies`} subtitle="PACS DICOM Viewer" icon={Monitor} color="purple" />
        <StatCard title="STAT Emergency Scans" value={`${emergencyCount} Critical`} subtitle="Priority 1 Scans" icon={Activity} color="amber" />
        <StatCard title="Completed Scans" value={`${completedOrders.length} Completed`} subtitle="Signed Off & Sent to Doctor" icon={FileCheck} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PACS Scan Queue with Active / Completed Tabs */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('ACTIVE')}
                className={`px-3 py-1 rounded font-bold transition-all ${
                  activeTab === 'ACTIVE' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Active Scans ({activeOrders.length})
              </button>
              <button
                onClick={() => setActiveTab('COMPLETED')}
                className={`px-3 py-1 rounded font-bold transition-all ${
                  activeTab === 'COMPLETED' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Completed ({completedOrders.length})
              </button>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20">
              DICOM PACS
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
                      ? 'bg-sky-500/15 border-sky-500/50 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      ord.status === 'COMPLETED' ? 'bg-emerald-500 text-slate-950' : 'bg-sky-500 text-white'
                    }`}>
                      {ord.testName}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${
                      ord.priority === 'EMERGENCY' ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {ord.priority}
                    </span>
                  </div>
                  <p className="font-bold text-white text-sm mt-1">{ord.patientName} ({ord.patientAge})</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-sky-400 font-mono">UHID: {ord.uhid}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      ord.status === 'COMPLETED' || ord.status === 'REPORT_UPLOADED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">
                {activeTab === 'ACTIVE' ? 'No active scan requests in PACS queue.' : 'No completed scans in history yet.'}
              </div>
            )}
          </div>
        </Card>

        {/* DICOM Viewer & Impression Form */}
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Monitor size={18} className="text-purple-400" />
              DICOM Imaging Viewer & Diagnostic Sign-Off
            </h3>
            {selectedOrder && (
              <div className="flex gap-2">
                {selectedOrder.status === 'REQUESTED' && (
                  <Button size="sm" variant="primary" onClick={() => handleUpdateStatus(selectedOrder._id, 'IN_PROGRESS')}>
                    <Check size={14} /> Accept Scan Request
                  </Button>
                )}
                {(selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'REPORT_UPLOADED') && (
                  <span className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center gap-1">
                    <CheckCircle2 size={14} /> SCAN COMPLETED
                  </span>
                )}
              </div>
            )}
          </div>

          {selectedOrder ? (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <p className="text-slate-400">Patient Name:</p>
                  <p className="font-bold text-white text-sm">{selectedOrder.patientName}</p>
                </div>
                <div>
                  <p className="text-slate-400">UHID & OP/IP:</p>
                  <p className="font-mono text-sky-400 font-bold">{selectedOrder.uhid} ({selectedOrder.opIpNumber || 'OP-101'})</p>
                </div>
                <div>
                  <p className="text-slate-400">Requesting Doctor:</p>
                  <p className="font-bold text-white">{selectedOrder.doctorName}</p>
                </div>
                <div>
                  <p className="text-slate-400">Current Status:</p>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    selectedOrder.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                  }`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              {/* Simulated High-Res DICOM Viewport */}
              <div className="h-44 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center relative overflow-hidden">
                <div className="text-center z-20 space-y-1">
                  <FileImage size={36} className="text-sky-400 mx-auto animate-pulse" />
                  <p className="text-white font-bold">{selectedOrder.testName} PA View — High Resolution DICOM Scan</p>
                  <p className="text-[11px] text-slate-400">Study Date: {new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'REPORT_UPLOADED' ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                      <CheckCircle2 size={16} /> Scan Completed & Radiologist Report Published
                    </span>
                    <span className="text-[11px] text-slate-400">Signed by: {selectedOrder.technicianName || user?.name}</span>
                  </div>
                  <p className="text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                    "{selectedOrder.reportSummary}"
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePublishReport} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Radiology Service Charge (₹):</label>
                      <input
                        type="number"
                        className="w-full glass-input rounded-lg p-2 text-xs text-white font-mono font-bold"
                        value={selectedOrder.price || 800}
                        onChange={(e) =>
                          setSelectedOrder((prev) => ({ ...prev, price: Number(e.target.value) || 0 }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Charge Status:</label>
                      <span className="px-2 py-1 rounded bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20 text-[11px] block">
                        SUBMITTED TO DOCTOR FOR REVIEW
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Radiologist Diagnostic Impression & Findings:</label>
                    <textarea
                      className="w-full glass-input rounded-lg p-2.5 text-xs text-white"
                      rows={3}
                      placeholder="Enter radiologist impression notes..."
                      value={impression}
                      onChange={(e) => setImpression(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="submit" variant="success" size="sm" className="font-bold gap-1.5" isLoading={isLoading}>
                      <Upload size={14} /> Submit PACS Scan & Charges to Doctor
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm">
              Select a DICOM study from the left panel to inspect radiology images.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
