import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  BarChart3, Scan, TestTube, Pill, Stethoscope, CreditCard, Users,
  Activity, Search, Download, Filter, FileText, CheckCircle2, Clock,
  Calendar, ShieldAlert, IndianRupee, Eye, EyeOff, Key, Edit, Lock, X, ChevronRight
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';

export const SuperAdminReportsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const metric = searchParams.get('metric') || 'overview';

  const [isLoading, setIsLoading] = useState(true);
  const [hospitals, setHospitals] = useState([]);
  const [showPasswords, setShowPasswords] = useState({});

  // Password Change Modal State
  const [selectedStaffForPassword, setSelectedStaffForPassword] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState('');
  const [passwordUpdateError, setPasswordUpdateError] = useState('');

  // Domain Datasets
  const [radiologyOrders, setRadiologyOrders] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [pharmacyData, setPharmacyData] = useState({ medicines: [], alerts: { lowStock: [], expired: [] } });
  const [doctorsData, setDoctorsData] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [nurseTasks, setNurseTasks] = useState([]);

  const fetchReportsData = async () => {
    setIsLoading(true);
    try {
      const [hospRes, diagRes, pharmRes, staffRes, invRes, patRes, nurseRes] = await Promise.all([
        axiosClient.get('/saas/hospitals').catch(() => ({ data: [] })),
        axiosClient.get('/diagnostics/orders').catch(() => ({ data: [] })),
        axiosClient.get('/pharmacy/medicines').catch(() => ({ data: [] })),
        axiosClient.get('/auth/staff').catch(() => ({ data: [] })),
        axiosClient.get('/billing/receipts').catch(() => ({ data: [] })),
        axiosClient.get('/patients/search').catch(() => ({ data: [] })),
        axiosClient.get('/pharmacy/nurse-tasks').catch(() => ({ data: [] })),
      ]);

      setHospitals(hospRes.data || []);
      const allOrders = diagRes.data || [];
      setRadiologyOrders(allOrders.filter((o) => ['XRAY', 'MRI', 'CT_SCAN', 'ULTRASOUND', 'RADIOLOGY'].includes(o.testCategory)));
      setLabOrders(allOrders.filter((o) => ['LABORATORY', 'BLOOD_TEST', 'URINE_ANALYSIS', 'URINE_TEST', 'CULTURE_TEST', 'BIOPSY', 'PATHOLOGY'].includes(o.testCategory)));

      setPharmacyData({ medicines: pharmRes.data || [], alerts: { lowStock: [], expired: [] } });
      setDoctorsData((staffRes.data || []).filter((s) => s.role === 'DOCTOR'));
      setInvoices(invRes.data || []);
      setPatients(patRes.data || []);
      setNurseTasks(nurseRes.data || []);
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const toggleShowPassword = (id) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMetricChange = (newMetric) => {
    setSearchParams({ metric: newMetric });
  };

  const handleOpenPasswordModal = (staff) => {
    setSelectedStaffForPassword(staff);
    setNewPasswordInput('');
    setPasswordUpdateSuccess('');
    setPasswordUpdateError('');
  };

  const handleSavePassword = async () => {
    if (!newPasswordInput || newPasswordInput.trim().length < 4) {
      setPasswordUpdateError('Password must be at least 4 characters long');
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordUpdateError('');
    setPasswordUpdateSuccess('');

    try {
      await axiosClient.patch(`/auth/staff/${selectedStaffForPassword._id}/password`, {
        newPassword: newPasswordInput.trim()
      });

      setDoctorsData((prev) =>
        prev.map((d) => {
          if (d._id === selectedStaffForPassword._id) {
            return { ...d, assignedPasswordHint: newPasswordInput.trim() };
          }
          return d;
        })
      );

      setPasswordUpdateSuccess(`Password updated successfully for ${selectedStaffForPassword.name}`);
      setTimeout(() => {
        setSelectedStaffForPassword(null);
      }, 1200);
    } catch (err) {
      console.error(err);
      setPasswordUpdateError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const METRIC_TABS = [
    { id: 'overview', label: 'Executive Overview', icon: BarChart3 },
    { id: 'radiology', label: 'Radiology & Imaging', icon: Scan },
    { id: 'laboratory', label: 'Pathology & Lab', icon: TestTube },
    { id: 'pharmacy', label: 'Pharmacy & Stock', icon: Pill },
    { id: 'doctors', label: 'Doctors & Credentials', icon: Stethoscope },
    { id: 'billing', label: 'Billing & Revenue', icon: CreditCard },
    { id: 'patients', label: 'Patients & Admissions', icon: Users },
    { id: 'nursing', label: 'Nursing & Ward Tasks', icon: Activity },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={24} className="text-indigo-600" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Executive Platform Analytics & Reports</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Live Clinical, Financial, Diagnostic & Multi-Hospital Operational Reporting Console
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="font-bold text-xs">
            <Download size={14} className="mr-1" /> Export PDF / Print Report
          </Button>
        </div>
      </div>

      {/* Metric Selector Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs font-bold scrollbar-none">
        {METRIC_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = metric === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleMetricChange(tab.id)}
              className={`px-4 py-2.5 rounded-t-xl flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── METRIC 1: RADIOLOGY REPORTS ── */}
      {metric === 'radiology' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Radiology Orders" value={`${radiologyOrders.length} Scans`} subtitle="X-Ray, MRI, CT & USG" icon={Scan} color="purple" />
            <StatCard title="Completed Reports" value={`${radiologyOrders.filter(o => ['REPORT_UPLOADED', 'COMPLETED'].includes(o.status)).length} Uploaded`} subtitle="PACS DICOM Scans" icon={CheckCircle2} color="emerald" />
            <StatCard title="Pending Review" value={`${radiologyOrders.filter(o => ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS'].includes(o.status)).length} Pending`} subtitle="In Processing Queue" icon={Clock} color="amber" />
            <StatCard title="Radiology Revenue" value={formatCurrency(radiologyOrders.reduce((sum, o) => sum + (o.totalDepartmentCharge || o.price || 0), 0))} subtitle="Billing Charges Logged" icon={IndianRupee} color="sky" />
          </div>

          <Card>
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Scan size={18} className="text-purple-600" />
                Radiology & PACS Imaging Diagnostic Reports ({radiologyOrders.length})
              </span>
              <span className="text-xs text-slate-500 font-mono">Live PACS RIS Feed</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Modality / Test</th>
                    <th className="p-3">Patient Name</th>
                    <th className="p-3">UHID / Token</th>
                    <th className="p-3">Technician / Radiologist</th>
                    <th className="p-3">Findings / Summary</th>
                    <th className="p-3">Charge</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {radiologyOrders.map((ord) => (
                    <tr key={ord._id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{ord.testCategory}: {ord.testName}</td>
                      <td className="p-3 font-bold text-indigo-900">{ord.patientName}</td>
                      <td className="p-3 font-mono font-bold text-indigo-700">{ord.uhid} (#{ord.tokenNumber || '—'})</td>
                      <td className="p-3 text-slate-600">{ord.technicianName || 'Pending Assignment'}</td>
                      <td className="p-3 text-slate-700 italic max-w-xs truncate">{ord.reportSummary || 'Awaiting report upload'}</td>
                      <td className="p-3 font-bold text-emerald-700">{formatCurrency(ord.totalDepartmentCharge || ord.price || 50)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${['REPORT_UPLOADED', 'COMPLETED'].includes(ord.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-500 font-mono">{formatDateTime(ord.createdAt)}</td>
                    </tr>
                  ))}
                  {radiologyOrders.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-slate-500">No radiology orders recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── METRIC 2: LABORATORY REPORTS ── */}
      {metric === 'laboratory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Lab Tests" value={`${labOrders.length} Tests`} subtitle="Pathology & CBC" icon={TestTube} color="indigo" />
            <StatCard title="Completed Reports" value={`${labOrders.filter(o => ['REPORT_UPLOADED', 'COMPLETED'].includes(o.status)).length} Uploaded`} subtitle="Verified Pathology" icon={CheckCircle2} color="emerald" />
            <StatCard title="Pending Lab Intake" value={`${labOrders.filter(o => ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS'].includes(o.status)).length} Pending`} subtitle="In Processing Queue" icon={Clock} color="amber" />
            <StatCard title="Laboratory Revenue" value={formatCurrency(labOrders.reduce((sum, o) => sum + (o.totalDepartmentCharge || o.price || 0), 0))} subtitle="Billing Charges Logged" icon={IndianRupee} color="sky" />
          </div>

          <Card>
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <TestTube size={18} className="text-indigo-600" />
              Pathology & Laboratory Diagnostic Reports ({labOrders.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Test Name</th>
                    <th className="p-3">Patient Name</th>
                    <th className="p-3">UHID / Token</th>
                    <th className="p-3">Technician</th>
                    <th className="p-3">Findings / Summary</th>
                    <th className="p-3">Charge</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {labOrders.map((ord) => (
                    <tr key={ord._id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{ord.testName}</td>
                      <td className="p-3 font-bold text-indigo-900">{ord.patientName}</td>
                      <td className="p-3 font-mono font-bold text-indigo-700">{ord.uhid} (#{ord.tokenNumber || '—'})</td>
                      <td className="p-3 text-slate-600">{ord.technicianName || 'Lab Technician'}</td>
                      <td className="p-3 text-slate-700 italic max-w-xs truncate">{ord.reportSummary || 'Awaiting lab findings'}</td>
                      <td className="p-3 font-bold text-emerald-700">{formatCurrency(ord.totalDepartmentCharge || ord.price || 50)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${['REPORT_UPLOADED', 'COMPLETED'].includes(ord.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-500 font-mono">{formatDateTime(ord.createdAt)}</td>
                    </tr>
                  ))}
                  {labOrders.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-slate-500">No laboratory test orders recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── METRIC 3: PHARMACY REPORTS ── */}
      {metric === 'pharmacy' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Medicine SKUs" value={`${pharmacyData.medicines.length} SKUs`} subtitle="Central Store Stock" icon={Pill} color="rose" />
            <StatCard title="Out of Stock" value={`${pharmacyData.medicines.filter(m => (m.totalQuantity ?? 0) === 0).length} SKUs`} subtitle="Requires Procurement" icon={ShieldAlert} color="red" />
            <StatCard title="Low Stock Items" value={`${pharmacyData.medicines.filter(m => (m.totalQuantity ?? 0) > 0 && (m.totalQuantity ?? 0) <= (m.minimumStockLevel || 10)).length} SKUs`} subtitle="Below Reorder Level" icon={Clock} color="amber" />
            <StatCard title="Prescription Dispenses" value="74 Orders" subtitle="FEFO Auto-Batched" icon={CheckCircle2} color="emerald" />
          </div>

          <Card>
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Pill size={18} className="text-rose-600" />
              Pharmacy Inventory SKU & Stock Reports ({pharmacyData.medicines.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Medicine Name</th>
                    <th className="p-3">Generic Name</th>
                    <th className="p-3">Form & Strength</th>
                    <th className="p-3">Sell Price</th>
                    <th className="p-3">Available Quantity</th>
                    <th className="p-3">Stock Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pharmacyData.medicines.map((m) => (
                    <tr key={m._id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{m.name}</td>
                      <td className="p-3 text-slate-600">{m.genericName}</td>
                      <td className="p-3 text-slate-600">{m.dosageForm} ({m.strength})</td>
                      <td className="p-3 font-bold text-slate-900">₹{m.sellingPrice}</td>
                      <td className="p-3 font-bold text-indigo-700">{m.totalQuantity ?? 0} units</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-bold ${(m.totalQuantity ?? 0) === 0 ? 'bg-rose-100 text-rose-800' : (m.totalQuantity ?? 0) <= (m.minimumStockLevel || 10) ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {(m.totalQuantity ?? 0) === 0 ? 'OUT_OF_STOCK' : (m.totalQuantity ?? 0) <= (m.minimumStockLevel || 10) ? 'LOW_STOCK' : 'IN_STOCK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {pharmacyData.medicines.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">No pharmacy medicines configured.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── METRIC 4: DOCTORS & CREDENTIALS ── */}
      {metric === 'doctors' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Appointed Doctors" value={`${doctorsData.length} Physicians`} subtitle="Cross-Department OPD" icon={Stethoscope} color="emerald" />
            <StatCard title="On Duty Available" value={`${doctorsData.filter(d => d.isAvailable !== false).length} Active`} subtitle="Available in OPD Cabins" icon={CheckCircle2} color="emerald" />
            <StatCard title="Consultations Completed" value="48 Visits" subtitle="OPD Checked" icon={Activity} color="purple" />
            <StatCard title="Consultation Revenue" value="₹7,200" subtitle="Fees Logged" icon={IndianRupee} color="sky" />
          </div>

          <Card>
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Stethoscope size={18} className="text-emerald-600" />
                Doctor Credentials, OPD Cabins & Access Control ({doctorsData.length})
              </span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Doctor Name</th>
                    <th className="p-3">Specialization</th>
                    <th className="p-3">Login Email</th>
                    <th className="p-3">Assigned Password / Credential</th>
                    <th className="p-3">OPD Cabin</th>
                    <th className="p-3">Duty Status</th>
                    <th className="p-3 text-right">Super Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctorsData.map((d) => {
                    const isShown = showPasswords[d._id];
                    const pwdHint = d.assignedPasswordHint || d.credentialHint || 'Doctor123!';
                    return (
                      <tr key={d._id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{d.name}</td>
                        <td className="p-3 font-semibold text-slate-700">{d.specialization || 'General Physician'}</td>
                        <td className="p-3 font-mono font-bold text-indigo-900">{d.email}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 w-max">
                            <Key size={13} className="text-amber-500 shrink-0" />
                            <span className="font-mono font-bold text-slate-900">
                              {isShown ? pwdHint : '••••••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleShowPassword(d._id)}
                              className="text-slate-400 hover:text-slate-700 ml-1"
                              title="Toggle Password Visibility"
                            >
                              {isShown ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-indigo-700">{d.cabinNo || 'Cabin 101'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-bold ${d.isAvailable !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {d.isAvailable !== false ? 'ON DUTY' : 'OFF DUTY'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] font-bold bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                            onClick={() => handleOpenPasswordModal(d)}
                          >
                            <Edit size={12} className="mr-1" /> Change Password
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {doctorsData.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-500">No doctors registered.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── METRIC 5: BILLING & REVENUE ── */}
      {metric === 'billing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Revenue Collected" value={formatCurrency(invoices.reduce((acc, i) => acc + (i.paidAmount || i.grandTotal || 0), 0))} subtitle="All Invoices" icon={IndianRupee} color="emerald" />
            <StatCard title="Total Invoices Issued" value={`${invoices.length} Bills`} subtitle="OPD & IPD Bills" icon={CreditCard} color="purple" />
            <StatCard title="Paid Invoices" value={`${invoices.filter(i => i.status === 'PAID').length} Paid`} subtitle="Fully Settled" icon={CheckCircle2} color="emerald" />
            <StatCard title="Unpaid Invoices" value={`${invoices.filter(i => i.status === 'UNPAID' || i.status === 'PARTIALLY_PAID').length} Outstanding`} subtitle="Awaiting Payment" icon={ShieldAlert} color="amber" />
          </div>

          <Card>
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <CreditCard size={18} className="text-indigo-600" />
              Billing Ledger & Invoice Reports ({invoices.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Invoice No</th>
                    <th className="p-3">Patient Name</th>
                    <th className="p-3">Doctor</th>
                    <th className="p-3">Grand Total</th>
                    <th className="p-3">Paid Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-indigo-700">{inv.invoiceNo}</td>
                      <td className="p-3 font-bold text-slate-900">{inv.patientId?.firstName ? `${inv.patientId.firstName} ${inv.patientId.lastName}` : 'Patient'}</td>
                      <td className="p-3 text-slate-600">{inv.doctorName || 'Doctor'}</td>
                      <td className="p-3 font-bold text-slate-900">{formatCurrency(inv.grandTotal || 0)}</td>
                      <td className="p-3 font-bold text-emerald-700">{formatCurrency(inv.paidAmount || 0)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-bold ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500">{formatDate(inv.createdAt)}</td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-500">No invoice records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── METRIC 6: PATIENTS & ADMISSIONS ── */}
      {metric === 'patients' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Patients Registered" value={`${patients.length} UHIDs`} subtitle="Master Patient Index" icon={Users} color="sky" />
            <StatCard title="General Category" value={`${patients.filter(p => (p.category || 'GENERAL') === 'GENERAL').length}`} subtitle="Standard OPD" icon={Activity} color="emerald" />
            <StatCard title="VIP / Corporate" value={`${patients.filter(p => ['VIP', 'CORPORATE'].includes(p.category)).length}`} subtitle="Special Category" icon={Users} color="purple" />
            <StatCard title="New Today" value={`${patients.filter(p => new Date(p.createdAt).toDateString() === new Date().toDateString()).length}`} subtitle="Registrations" icon={Calendar} color="amber" />
          </div>

          <Card>
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Users size={18} className="text-sky-600" />
              Patient Administrative Directory ({patients.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Patient Name</th>
                    <th className="p-3">UHID</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Gender & Age</th>
                    <th className="p-3 text-right">Registration Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map((pat) => (
                    <tr key={pat._id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{pat.name || `${pat.firstName} ${pat.lastName}`}</td>
                      <td className="p-3 font-mono font-bold text-indigo-700">{pat.uhid}</td>
                      <td className="p-3 text-slate-700">{pat.phone}</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">{pat.category || 'GENERAL'}</span></td>
                      <td className="p-3 text-slate-600">{pat.gender || 'M'} • {pat.age ? `${pat.age} Yrs` : 'Adult'}</td>
                      <td className="p-3 text-right text-slate-500 font-mono">{formatDate(pat.createdAt)}</td>
                    </tr>
                  ))}
                  {patients.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">No patient records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── METRIC 7: NURSING & WARD TASKS ── */}
      {metric === 'nursing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Nurse Tasks" value={`${nurseTasks.length} Tasks`} subtitle="Injections & IV Fluids" icon={Activity} color="indigo" />
            <StatCard title="Administered" value={`${nurseTasks.filter(t => t.status === 'ADMINISTERED').length} Done`} subtitle="Doses Completed" icon={CheckCircle2} color="emerald" />
            <StatCard title="Pending Tasks" value={`${nurseTasks.filter(t => ['PENDING', 'ACCEPTED', 'SCHEDULED'].includes(t.status)).length} Pending`} subtitle="Nurse Action Required" icon={Clock} color="amber" />
            <StatCard title="Injections & IV" value={`${nurseTasks.filter(t => ['INJECTION', 'IV_FLUID'].includes(t.taskType)).length}`} subtitle="Medication Tasks" icon={Pill} color="purple" />
          </div>

          <Card>
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Activity size={18} className="text-indigo-600" />
              Nurse Medication & Bedside Administration Reports ({nurseTasks.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Medicine / Task</th>
                    <th className="p-3">Task Type</th>
                    <th className="p-3">Dose & Route</th>
                    <th className="p-3">Patient</th>
                    <th className="p-3">Doctor</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {nurseTasks.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{t.medicineName}</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">{t.taskType}</span></td>
                      <td className="p-3 text-slate-700">{t.dose} ({t.route})</td>
                      <td className="p-3 font-bold text-indigo-900">{t.patientId?.firstName ? `${t.patientId.firstName} ${t.patientId.lastName}` : 'Patient'}</td>
                      <td className="p-3 text-slate-600">{t.doctorId?.name || 'Doctor'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-bold ${t.status === 'ADMINISTERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {nurseTasks.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">No nurse tasks recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── METRIC 8: EXECUTIVE OVERVIEW ── */}
      {metric === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Registered Hospitals" value={`${hospitals.length} Tenants`} subtitle="Active Multi-Tenant Platform" icon={BarChart3} color="purple" />
            <StatCard title="Total Radiology Reports" value={`${radiologyOrders.length} Scans`} subtitle="X-Ray, MRI, CT, USG" icon={Scan} color="purple" />
            <StatCard title="Total Lab Reports" value={`${labOrders.length} Pathology`} subtitle="CBC & Blood Tests" icon={TestTube} color="indigo" />
            <StatCard title="Total Platform Revenue" value={formatCurrency(invoices.reduce((acc, i) => acc + (i.paidAmount || i.grandTotal || 0), 0))} subtitle="Collected Invoices" icon={IndianRupee} color="emerald" />
          </div>

          <Card>
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BarChart3 size={18} className="text-indigo-600" />
                Cross-Hospital Platform Performance Analytics
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200">
                <h4 className="font-bold text-purple-900 mb-1">Radiology Diagnostic Metric</h4>
                <p className="text-slate-600">Total Scans: <strong>{radiologyOrders.length}</strong></p>
                <p className="text-slate-600">Completed Reports: <strong>{radiologyOrders.filter(o => ['REPORT_UPLOADED', 'COMPLETED'].includes(o.status)).length}</strong></p>
                <Button size="sm" variant="outline" className="mt-3 text-[11px] font-bold" onClick={() => handleMetricChange('radiology')}>
                  View Radiology Reports <ChevronRight size={12} />
                </Button>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200">
                <h4 className="font-bold text-indigo-900 mb-1">Laboratory Diagnostic Metric</h4>
                <p className="text-slate-600">Total Tests: <strong>{labOrders.length}</strong></p>
                <p className="text-slate-600">Completed Reports: <strong>{labOrders.filter(o => ['REPORT_UPLOADED', 'COMPLETED'].includes(o.status)).length}</strong></p>
                <Button size="sm" variant="outline" className="mt-3 text-[11px] font-bold" onClick={() => handleMetricChange('laboratory')}>
                  View Laboratory Reports <ChevronRight size={12} />
                </Button>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
                <h4 className="font-bold text-emerald-900 mb-1">Pharmacy Inventory Metric</h4>
                <p className="text-slate-600">Configured SKUs: <strong>{pharmacyData.medicines.length}</strong></p>
                <p className="text-slate-600">Low/Out Stock: <strong>{pharmacyData.medicines.filter(m => (m.totalQuantity ?? 0) <= (m.minimumStockLevel || 10)).length}</strong></p>
                <Button size="sm" variant="outline" className="mt-3 text-[11px] font-bold" onClick={() => handleMetricChange('pharmacy')}>
                  View Pharmacy Reports <ChevronRight size={12} />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Change Password Modal for Super Admin */}
      {selectedStaffForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Lock size={20} className="text-indigo-600" />
                <h3 className="font-bold text-slate-900">Change Doctor Password</h3>
              </div>
              <button
                onClick={() => setSelectedStaffForPassword(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-500">Updating credentials for:</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedStaffForPassword.name}</p>
              <p className="text-xs font-mono text-indigo-700">{selectedStaffForPassword.email} ({selectedStaffForPassword.role})</p>
            </div>

            {passwordUpdateError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {passwordUpdateError}
              </div>
            )}

            {passwordUpdateSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} />
                {passwordUpdateSuccess}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">New Password</label>
              <input
                type="text"
                placeholder="Enter new password (e.g. Doctor123!)"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedStaffForPassword(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-indigo-600 text-white font-bold"
                disabled={isUpdatingPassword}
                onClick={handleSavePassword}
              >
                {isUpdatingPassword ? 'Saving Password...' : 'Save Password'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminReportsPage;
