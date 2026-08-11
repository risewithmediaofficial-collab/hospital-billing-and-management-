import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AvailabilityBanner } from '../../components/ui/AvailabilityBanner';
import { useAvailability } from '../../hooks/useAvailability';
import { useScrollLock } from '../../hooks/useScrollLock';
import {
  Pill, Boxes, AlertTriangle, CheckCircle2, Plus, ArrowRightLeft,
  Search, ShieldAlert, Layers, RefreshCw, Calendar, FileText, X, IndianRupee, Info
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { axiosClient } from '../../api/axiosClient';
import { useSocket } from '../../providers/SocketProvider';
import { useDepartmentNotificationStore } from '../../store/departmentNotificationStore';

const RECOMMENDED_MEDICINES = [
  { name: 'Paracetamol 500mg', genericName: 'Paracetamol', category: 'Analgesic / Antipyretic', dosageForm: 'TABLET', strength: '500 mg', purchasePrice: 2, sellingPrice: 5 },
  { name: 'Amoxicillin 250mg', genericName: 'Amoxicillin', category: 'Antibiotic', dosageForm: 'CAPSULE', strength: '250 mg', purchasePrice: 8, sellingPrice: 15 },
  { name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'NSAID / Anti-inflammatory', dosageForm: 'TABLET', strength: '400 mg', purchasePrice: 4, sellingPrice: 10 },
  { name: 'Omeprazole 20mg', genericName: 'Omeprazole', category: 'Antacid / PPI', dosageForm: 'CAPSULE', strength: '20 mg', purchasePrice: 6, sellingPrice: 12 },
  { name: 'Cetirizine 10mg', genericName: 'Cetirizine', category: 'Antihistamine', dosageForm: 'TABLET', strength: '10 mg', purchasePrice: 3, sellingPrice: 8 },
  { name: 'Azithromycin 500mg', genericName: 'Azithromycin', category: 'Antibiotic', dosageForm: 'TABLET', strength: '500 mg', purchasePrice: 25, sellingPrice: 45 },
  { name: 'Metformin 500mg', genericName: 'Metformin', category: 'Antidiabetic', dosageForm: 'TABLET', strength: '500 mg', purchasePrice: 5, sellingPrice: 12 },
  { name: 'Amlodipine 5mg', genericName: 'Amlodipine', category: 'Antihypertensive', dosageForm: 'TABLET', strength: '5 mg', purchasePrice: 4, sellingPrice: 10 },
];

// Map URL path substring to active tab key
const getActiveTabFromPath = (pathname) => {
  if (pathname.includes('/pharmacy/audit')) return 'audit';
  if (pathname.includes('/pharmacy/stock')) return 'inventory';
  if (pathname.includes('/pharmacy/expiry-alerts')) return 'alerts';
  if (pathname.includes('/pharmacy/dispense-queue')) return 'queue';
  return 'queue';
};

export const PharmacistDashboard = () => {
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAvailable, isToggling, handleToggle, statusMessage } = useAvailability();
  const refreshPendingWork = useDepartmentNotificationStore((state) => state.fetchPendingWork);

  // Drive active view from current URL path (sidebar navigation)
  const activeTab = getActiveTabFromPath(location.pathname);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [alerts, setAlerts] = useState({ lowStock: [], outOfStock: [], nearExpiry: [], expired: [] });
  const [stockAdjustments, setStockAdjustments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showSubReqModal, setShowSubReqModal] = useState(false);
  const [selectedRx, setSelectedRx] = useState(null);

  useScrollLock(showAddMedModal || showAddBatchModal || showSubReqModal || showAdjustModal || showTransferModal);

  // Forms
  const [medForm, setMedForm] = useState({
    name: '', genericName: '', brandName: '', category: 'Antibiotic', dosageForm: 'TABLET',
    strength: '500 mg', manufacturer: '', supplier: '', purchasePrice: 10, sellingPrice: 15,
    taxPercentage: 12, minimumStockLevel: 20, reorderQuantity: 100, prescriptionRequired: true
  });

  const [batchForm, setBatchForm] = useState({
    medicineId: '', batchNumber: '', location: 'MAIN_PHARMACY', mfgDate: '', expiryDate: '',
    purchasePrice: 10, sellingPrice: 15, quantity: 100, storageLocation: 'Rack 1', reason: 'Initial Stock'
  });

  const [transferForm, setTransferForm] = useState({
    batchId: '', destinationLocation: 'EMERGENCY_PHARMACY', transferQuantity: 10, reason: 'Emergency Ward Stocking'
  });

  const [adjustForm, setAdjustForm] = useState({
    batchId: '', type: 'DAMAGE', quantityChanged: -5, reason: 'Damaged packaging during transport'
  });

  const [subForm, setSubForm] = useState({
    prescriptionId: '', originalMedicineName: '', suggestedMedicineId: '', reason: 'Brand out of stock, offering bioequivalent generic'
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rxRes, medRes, alertRes, auditRes] = await Promise.all([
        axiosClient.get('/pharmacy/prescriptions'),
        axiosClient.get('/pharmacy/medicines'),
        axiosClient.get('/pharmacy/alerts'),
        axiosClient.get('/pharmacy/stock-movements'),
      ]);
      setPrescriptions(rxRes.data || []);
      setMedicines(medRes.data || []);
      setAlerts(alertRes.data || { lowStock: [], outOfStock: [], nearExpiry: [], expired: [] });
      setStockAdjustments(auditRes.data || []);
    } catch (error) {
      console.error('Failed to load pharmacy data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => { fetchData(); refreshPendingWork(); };
    socket.on('workflow:notification', refresh);
    socket.on('workflow:pending_changed', refresh);
    return () => {
      socket.off('workflow:notification', refresh);
      socket.off('workflow:pending_changed', refresh);
    };
  }, [socket, refreshPendingWork]);

  const pending = prescriptions.filter((item) => item.dispenseStatus === 'PENDING_DISPENSE' || item.dispenseStatus === 'PARTIALLY_DISPENSED');
  const dispensed = prescriptions.filter((item) => item.dispenseStatus === 'DISPENSED');

  // Actions
  const handleDispense = async (id, external = false) => {
    try {
      await axiosClient.patch(`/pharmacy/prescriptions/${id}/dispense`, {
        items: external ? [{ purchasedExternally: true, note: 'Purchased by patient externally' }] : [],
        pharmacyNotes: external ? 'Marked external purchase' : 'Dispensed via FEFO',
      });
      await Promise.all([fetchData(), refreshPendingWork()]);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dispense');
    }
  };

  const handleCreateMedicine = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post('/pharmacy/medicines', medForm);
      setShowAddMedModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add medicine');
    }
  };

  const handleAddBatch = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post('/pharmacy/batches', batchForm);
      setShowAddBatchModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add batch');
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post('/pharmacy/stock/transfer', transferForm);
      setShowTransferModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to transfer stock');
    }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post('/pharmacy/stock/adjust', adjustForm);
      setShowAdjustModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to adjust stock');
    }
  };

  const handleRequestSubstitution = async (e) => {
    e.preventDefault();
    if (!subForm.prescriptionId) {
      alert('Please open substitution request from a specific pending prescription.');
      return;
    }
    if (!subForm.suggestedMedicineId || subForm.suggestedMedicineId.startsWith('rec_')) {
      alert('Please select an available medicine from your inventory first.');
      return;
    }
    try {
      await axiosClient.post('/pharmacy/substitutions/request', subForm);
      setShowSubReqModal(false);
      setSubForm({ prescriptionId: '', originalMedicineName: '', suggestedMedicineId: '', reason: 'Brand out of stock, offering bioequivalent generic' });
      alert('Substitution request sent to Doctor for approval!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send substitution request');
    }
  };

  const filteredMedicines = medicines.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Pharmacy & Medicine Inventory</h2>
          <p className="text-xs text-slate-500 mt-1">{user?.name || 'Pharmacist'} — Multi-Location FEFO Inventory & Dispensing System</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => setShowAddMedModal(true)}>
            <Plus size={16} className="mr-1" /> Add Medicine SKU
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowAddBatchModal(true)}>
            <Boxes size={16} className="mr-1" /> Add Stock Batch
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTransferModal(true)}>
            <ArrowRightLeft size={16} className="mr-1" /> Stock Transfer
          </Button>
        </div>
      </div>

      {/* Availability / Online Toggle Banner */}
      <AvailabilityBanner
        role="Pharmacist"
        isAvailable={isAvailable}
        isToggling={isToggling}
        onToggle={handleToggle}
        pendingCount={pending.length}
      />

      {statusMessage && (
        <div className={`p-3 rounded-xl border text-xs font-bold ${statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          {statusMessage.text}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Prescriptions Pending" value={`${pending.length} Orders`} subtitle="FEFO Auto E-Prescription Queue" icon={Pill} color="sky" />
        <StatCard title="Today Dispensed" value={`${dispensed.length} Orders`} subtitle="Auto Invoice Billing Sync" icon={CheckCircle2} color="emerald" />
        <StatCard title="Near-Expiry / Expired" value={`${alerts.nearExpiry.length + alerts.expired.length} Batches`} subtitle="Requires Immediate Action" icon={AlertTriangle} color="amber" />
        <StatCard title="Total Medicine SKUs" value={`${medicines.length} SKUs`} subtitle={`${alerts.outOfStock.length} Out of Stock`} icon={Boxes} color="purple" />
      </div>



      {/* TAB 1: E-Prescription Queue */}
      {activeTab === 'queue' && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Pill size={18} className="text-indigo-500" />
              Pending Prescriptions
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">FEFO Auto-Allocation</span>
              <button onClick={fetchData} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" title="Refresh">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-slate-500">Loading prescriptions...</p>
            </div>
          ) : pending.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {pending.map((rx) => (
                <div key={rx._id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 text-sm">{rx.patientId?.firstName} {rx.patientId?.lastName}</p>
                      <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">{rx.prescriptionNo}</span>
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">{rx.dispenseStatus}</span>
                    </div>
                    <p className="text-slate-500">Dr. {rx.doctorId?.name} · {rx.medicines?.length || 0} Prescribed Items</p>

                    {/* Medicines List */}
                    <div className="mt-2 space-y-1 bg-slate-50 p-2.5 rounded border border-slate-100">
                      {rx.medicines?.map((med, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-700">
                          <div>
                            <span className="font-bold">{med.medicineName}</span> ({med.dosageForm} - {med.dosage}) — {med.frequency} for {med.durationDays} days
                            <span className="ml-2 text-slate-400 font-mono">[{med.treatmentType}]</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${med.itemStatus === 'DISPENSED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                            {med.itemStatus}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button variant="success" size="sm" onClick={() => handleDispense(rx._id, false)}>
                      <CheckCircle2 size={14} className="mr-1" /> Dispense (FEFO)
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDispense(rx._id, true)}>
                      External Purchase
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSubForm({
                          prescriptionId: rx._id,
                          originalMedicineName: rx.medicines?.[0]?.medicineName || '',
                          suggestedMedicineId: medicines[0]?._id || '',
                          reason: 'Brand unavailable, offering bioequivalent alternative',
                        });
                        setShowSubReqModal(true);
                      }}
                    >
                      Request Substitution
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center space-y-3">
              <CheckCircle2 size={36} className="mx-auto text-emerald-400" />
              <p className="text-slate-600 font-semibold text-sm">No pending prescriptions in queue</p>
              <p className="text-xs text-slate-400">All e-prescriptions are dispensed or this queue is empty. Doctor-issued prescriptions will appear here automatically.</p>
              <button onClick={fetchData} className="mt-2 text-xs text-indigo-600 hover:underline flex items-center gap-1 mx-auto">
                <RefreshCw size={12} /> Refresh Queue
              </button>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: Medicine SKUs Inventory */}
      {activeTab === 'inventory' && (
        <Card>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search medicines by name, generic composition, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-bold">{filteredMedicines.length} Medicines Found</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Medicine Name</th>
                  <th className="p-3">Generic Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Form & Strength</th>
                  <th className="p-3">Sell Price</th>
                  <th className="p-3">Available Stock</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMedicines.map((med) => (
                  <tr key={med._id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{med.name}</td>
                    <td className="p-3 text-slate-600">{med.genericName}</td>
                    <td className="p-3 text-slate-600">{med.category}</td>
                    <td className="p-3 text-slate-600">{med.dosageForm} ({med.strength})</td>
                    <td className="p-3 font-bold text-slate-900">₹{med.sellingPrice}</td>
                    <td className="p-3 font-bold text-indigo-700">{med.totalQuantity ?? 0} units</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold ${med.stockStatus === 'IN_STOCK' ? 'bg-emerald-100 text-emerald-800' : med.stockStatus === 'LOW_STOCK' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                        {med.stockStatus}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setBatchForm((prev) => ({ ...prev, medicineId: med._id }));
                          setShowAddBatchModal(true);
                        }}
                      >
                        Add Batch
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: Alerts */}
      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-base font-bold text-amber-900 mb-3 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" /> Low Stock Medicines ({alerts.lowStock.length})
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {alerts.lowStock.map((med) => (
                <div key={med._id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{med.name}</p>
                    <p className="text-slate-500">{med.genericName} · Min level: {med.minimumStockLevel}</p>
                  </div>
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    {med.totalQuantity} units left
                  </span>
                </div>
              ))}
              {alerts.lowStock.length === 0 && <p className="text-slate-500 py-4 text-center">No low stock items.</p>}
            </div>
          </Card>

          <Card>
            <h3 className="text-base font-bold text-rose-900 mb-3 flex items-center gap-2">
              <ShieldAlert size={18} className="text-rose-600" /> Expired or Near-Expiry Stock ({alerts.nearExpiry.length + alerts.expired.length})
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {alerts.expired.map((b, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between bg-rose-50/50 px-2 rounded">
                  <div>
                    <p className="font-bold text-rose-900">{b.name} (Batch: {b.batchNumber})</p>
                    <p className="text-rose-700">Location: {b.location} · Expired on {new Date(b.expiryDate).toLocaleDateString()}</p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setAdjustForm({ batchId: b._id, type: 'EXPIRED_DISPOSAL', quantityChanged: -b.quantity, reason: 'Expired stock disposal' });
                      setShowAdjustModal(true);
                    }}
                  >
                    Dispose
                  </Button>
                </div>
              ))}
              {alerts.nearExpiry.map((b, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{b.name} (Batch: {b.batchNumber})</p>
                    <p className="text-amber-700">Expires soon: {new Date(b.expiryDate).toLocaleDateString()}</p>
                  </div>
                  <span className="font-bold text-amber-800">{b.quantity} units</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: Stock Movement Audit */}
      {activeTab === 'audit' && (
        <Card>
          <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
            <FileText size={18} className="text-indigo-600" /> Complete Inventory Stock Audit Trail
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Medicine</th>
                  <th className="p-3">Batch No</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Qty Change</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockAdjustments.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="p-3 font-bold text-slate-900">{log.medicineId?.name || 'Medicine'}</td>
                    <td className="p-3 font-mono">{log.batchNumber || 'N/A'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold ${log.type === 'ADD_STOCK' ? 'bg-emerald-100 text-emerald-800' : log.type === 'DISPENSE' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-800'}`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{log.sourceLocation} {log.destinationLocation ? `→ ${log.destinationLocation}` : ''}</td>
                    <td className={`p-3 font-bold ${log.quantityChanged > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {log.quantityChanged > 0 ? `+${log.quantityChanged}` : log.quantityChanged}
                    </td>
                    <td className="p-3 text-slate-600">{log.reason}</td>
                    <td className="p-3 font-bold text-slate-900">{log.performedByName || log.performedBy?.name || 'Staff'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL: ADD MEDICINE */}
      {showAddMedModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Add New Medicine SKU</h3>
              <button
                type="button"
                onClick={() => setShowAddMedModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateMedicine} className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 space-y-1">
                <label className="font-bold text-indigo-900 text-xs">Quick Auto-Fill Standard Recommendation *</label>
                <select
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const rec = RECOMMENDED_MEDICINES.find(r => r.name === e.target.value);
                    if (rec) setMedForm({ ...medForm, ...rec });
                  }}
                  className="w-full p-2 border border-indigo-200 bg-white rounded font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Click to choose standard medicine recommendation --</option>
                  {RECOMMENDED_MEDICINES.map((r) => (
                    <option key={r.name} value={r.name}>{r.name} ({r.genericName}) — {r.dosageForm} {r.strength}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Medicine Name *</label>
                  <input type="text" required value={medForm.name} onChange={(e) => setMedForm({ ...medForm, name: e.target.value })} className="w-full p-2 border rounded mt-1" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Generic Name *</label>
                  <input type="text" required value={medForm.genericName} onChange={(e) => setMedForm({ ...medForm, genericName: e.target.value })} className="w-full p-2 border rounded mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Category *</label>
                  <input type="text" required value={medForm.category} onChange={(e) => setMedForm({ ...medForm, category: e.target.value })} className="w-full p-2 border rounded mt-1" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Form *</label>
                  <select value={medForm.dosageForm} onChange={(e) => setMedForm({ ...medForm, dosageForm: e.target.value })} className="w-full p-2 border rounded mt-1">
                    {['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'DROPS', 'INHALER', 'IV_FLUID', 'OINTMENT'].map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Strength *</label>
                  <input type="text" required value={medForm.strength} onChange={(e) => setMedForm({ ...medForm, strength: e.target.value })} className="w-full p-2 border rounded mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Purchase Price (₹)</label>
                  <input type="number" value={medForm.purchasePrice} onChange={(e) => setMedForm({ ...medForm, purchasePrice: Number(e.target.value) })} className="w-full p-2 border rounded mt-1" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Selling Price (₹)</label>
                  <input type="number" value={medForm.sellingPrice} onChange={(e) => setMedForm({ ...medForm, sellingPrice: Number(e.target.value) })} className="w-full p-2 border rounded mt-1" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">GST Tax %</label>
                  <input type="number" value={medForm.taxPercentage} onChange={(e) => setMedForm({ ...medForm, taxPercentage: Number(e.target.value) })} className="w-full p-2 border rounded mt-1" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="ghost" onClick={() => setShowAddMedModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Save Medicine SKU</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD STOCK BATCH */}
      {showAddBatchModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Add New Batch Stock</h3>
              <button
                type="button"
                onClick={() => setShowAddBatchModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddBatch} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Select Medicine SKU *</label>
                <select required value={batchForm.medicineId} onChange={(e) => setBatchForm({ ...batchForm, medicineId: e.target.value })} className="w-full p-2.5 border rounded mt-1 font-bold text-slate-900 bg-slate-50">
                  <option value="">-- Choose Medicine --</option>
                  {medicines.map((m) => (
                    <option key={m._id} value={m._id}>{m.name} ({m.genericName}) — SKU: {m.strength}</option>
                  ))}
                  {medicines.length === 0 && RECOMMENDED_MEDICINES.map((r, i) => (
                    <option key={i} value={`rec_${i}`}>{r.name} ({r.genericName}) — Recommended Standard</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Batch Number *</label>
                  <input type="text" required placeholder="e.g. BATCH-2026-99" value={batchForm.batchNumber} onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })} className="w-full p-2 border rounded mt-1" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Storage Location</label>
                  <select value={batchForm.location} onChange={(e) => setBatchForm({ ...batchForm, location: e.target.value })} className="w-full p-2 border rounded mt-1">
                    {['MAIN_PHARMACY', 'EMERGENCY_PHARMACY', 'ICU_STOCK', 'WARD_STOCK', 'OT_STOCK'].map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Expiry Date *</label>
                  <input type="date" required value={batchForm.expiryDate} onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })} className="w-full p-2 border rounded mt-1" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Quantity (Units) *</label>
                  <input type="number" required min="1" value={batchForm.quantity} onChange={(e) => setBatchForm({ ...batchForm, quantity: Number(e.target.value) })} className="w-full p-2 border rounded mt-1" />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Audit Log Reason</label>
                <input type="text" value={batchForm.reason} onChange={(e) => setBatchForm({ ...batchForm, reason: e.target.value })} className="w-full p-2 border rounded mt-1" />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="ghost" onClick={() => setShowAddBatchModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Add Batch Stock</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUBSTITUTION REQUEST */}
      {showSubReqModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Request Medicine Substitution</h3>
              <button
                type="button"
                onClick={() => setShowSubReqModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Info box: Where does this go? */}
            <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info size={15} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800">
                <strong>Where does this go?</strong> — The assigned Doctor will receive an instant notification in their{' '}
                <strong>"Department Responses"</strong> tab. They will review and approve or reject the substitution.
                You'll be notified once they respond via the notification bell.
              </p>
            </div>

            <form onSubmit={handleRequestSubstitution} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Original Prescribed Medicine</label>
                <input type="text" disabled value={subForm.originalMedicineName} className="w-full p-2 border bg-slate-100 rounded mt-1" />
              </div>
              <div>
                <label className="font-bold text-slate-700">Suggested Available Alternative *</label>
                <select required value={subForm.suggestedMedicineId} onChange={(e) => setSubForm({ ...subForm, suggestedMedicineId: e.target.value })} className="w-full p-2 border rounded mt-1">
                  <option value="">-- Select from your inventory --</option>
                  {medicines.map((m) => (
                    <option key={m._id} value={m._id}>{m.name} ({m.genericName}) — ₹{m.sellingPrice}</option>
                  ))}
                </select>
                {medicines.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ No medicines in inventory yet. Add medicines first before requesting substitution.</p>
                )}
              </div>
              <div>
                <label className="font-bold text-slate-700">Reason for Substitution *</label>
                <textarea required rows="2" value={subForm.reason} onChange={(e) => setSubForm({ ...subForm, reason: e.target.value })} className="w-full p-2 border rounded mt-1" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="ghost" onClick={() => setShowSubReqModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={!subForm.suggestedMedicineId || subForm.suggestedMedicineId.startsWith('rec_')}>Send to Doctor</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
