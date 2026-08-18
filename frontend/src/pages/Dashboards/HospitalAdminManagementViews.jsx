import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { ROLE_NAMES } from '../../utils/constants';
import { useSocket } from '../../providers/SocketProvider';
import {
  Stethoscope, Activity, ConciergeBell, CreditCard, TestTube, Scan, Pill,
  Users, ClipboardList, BedDouble, ShieldAlert, Edit, Key, Eye, UserCog,
  CheckCircle, AlertCircle, TrendingUp, Clock, FileSpreadsheet, ShieldCheck,
  Trash2, Archive, Search
} from 'lucide-react';

export const HospitalAdminManagementViews = ({ viewType }) => {
  const { socket } = useSocket();
  const [staffList, setStaffList] = useState([]);
  const [patients, setPatients] = useState([]);
  const [receiptsList, setReceiptsList] = useState([]);
  const [deletedReceiptsList, setDeletedReceiptsList] = useState([]);
  const [deletedBillingSearch, setDeletedBillingSearch] = useState('');
  const [billingSummary, setBillingSummary] = useState({
    totalRevenue: 0,
    totalBills: 0,
    totalDeletedRevenue: 0,
    deletedBillsCount: 0,
    pendingBills: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [filterRole, setFilterRole] = useState(null);

  useEffect(() => {
    fetchData();
  }, [viewType]);

  useEffect(() => {
    if (!socket) return;
    const handleDoctorAvailability = (data) => {
      setStaffList((prev) =>
        prev.map((s) =>
          String(s._id) === String(data.id || data._id)
            ? { ...s, isAvailable: data.isAvailable !== undefined ? data.isAvailable : s.isAvailable, cabinNo: data.cabinNo || s.cabinNo }
            : s
        )
      );
    };

    const handleBillingUpdate = () => {
      fetchData();
    };

    socket.on('doctor:availability_changed', handleDoctorAvailability);
    socket.on('billing:invoice_created', handleBillingUpdate);
    socket.on('billing:payment_collected', handleBillingUpdate);
    socket.on('billing:receipt_deleted', handleBillingUpdate);
    socket.on('workflow:pending_changed', handleBillingUpdate);

    return () => {
      socket.off('doctor:availability_changed', handleDoctorAvailability);
      socket.off('billing:invoice_created', handleBillingUpdate);
      socket.off('billing:payment_collected', handleBillingUpdate);
      socket.off('billing:receipt_deleted', handleBillingUpdate);
      socket.off('workflow:pending_changed', handleBillingUpdate);
    };
  }, [socket]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [staffRes, patientsRes, billingRes, deletedBillingRes] = await Promise.all([
        axiosClient.get('/auth/staff').catch(() => ({ data: [] })),
        axiosClient.get('/patients').catch(() => []),
        axiosClient.get('/billing/receipts').catch(() => ({ data: [] })),
        axiosClient.get('/billing/deleted-receipts').catch(() => ({ data: [] })),
      ]);

      const staffData = (staffRes.data || staffRes || []).filter(s => !['SUPER_ADMIN', 'PATIENT', 'GUARDIAN'].includes(s.role) && s.email !== 'superadmin@gmail.com');
      setStaffList(staffData);

      const pList = Array.isArray(patientsRes) ? patientsRes : (patientsRes.data || []);
      setPatients(pList);

      const receipts = billingRes.data || billingRes || [];
      const deletedReceipts = deletedBillingRes.data || deletedBillingRes || [];
      setReceiptsList(receipts);
      setDeletedReceiptsList(deletedReceipts);

      const revenue = receipts.reduce((sum, r) => sum + (Number(r.amountPaid) || 0), 0);
      const deletedRevenue = deletedReceipts.reduce((sum, r) => sum + (Number(r.amountPaid) || 0), 0);

      setBillingSummary({
        totalRevenue: revenue,
        totalBills: receipts.length,
        totalDeletedRevenue: deletedRevenue,
        deletedBillsCount: deletedReceipts.length,
        pendingBills: Math.max(0, 15 - receipts.length),
      });
    } catch (err) {
      console.error('Failed to load management view data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredStaff = (targetRoles) => {
    return staffList.filter((s) => {
      const allRoles = [s.role, ...(s.additionalRoles || [])];
      return targetRoles.some((tr) => allRoles.includes(tr));
    });
  };

  // Render view-specific sections
  const renderViewContent = () => {
    switch (viewType) {
      case 'doctors': {
        const doctorStaff = getFilteredStaff(['DOCTOR']);
        const onDutyCount = doctorStaff.filter((d) => d.isAvailable !== false).length;

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                  <Stethoscope className="text-indigo-600" size={26} />
                  Doctors & Consultants Management Desk
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Executive Roster, On-Duty Availability, Department Allocations & Performance Analytics
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => window.location.href = '/hospital-admin/staff'}>
                <UserCog size={16} /> Manage Doctor Accounts & Privileges
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Appointed Doctors" value={`${doctorStaff.length} Physicians`} subtitle="OPD & IPD Consultants" icon={Stethoscope} color="sky" />
              <StatCard title="Doctors On Duty Now" value={`${onDutyCount} Active`} subtitle="Available in Cabins" icon={CheckCircle} color="emerald" />
              <StatCard title="Consultations Today" value="48 Visits" subtitle="Cross-Department OPD" icon={TrendingUp} color="purple" />
              <StatCard title="Avg Consultation Time" value="12 Mins" subtitle="Efficiency Metric" icon={Clock} color="amber" />
            </div>

            <Card>
              <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                Medical Officers & Consultants Roster ({doctorStaff.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100 text-neutral-600 uppercase text-[10px] border-b border-neutral-200">
                    <tr>
                      <th className="p-3">Doctor Name & Email</th>
                      <th className="p-3">Specialization</th>
                      <th className="p-3">Duty & Availability Status</th>
                      <th className="p-3">Consultations Today</th>
                      <th className="p-3">Account Access</th>
                      <th className="p-3 text-right">Management Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
                    {doctorStaff.map((doc) => {
                      const isOnDuty = doc.isAvailable !== false;
                      const isAccountActive = doc.isActive !== false && doc.status !== 'INACTIVE';
                      return (
                        <tr key={doc._id} className="hover:bg-neutral-50">
                          <td className="p-3 font-bold text-neutral-900">
                            {doc.name}
                            <p className="text-[10px] font-mono text-neutral-500">{doc.email}</p>
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-neutral-800">{doc.specialization || 'General Physician'}</p>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-max ${isOnDuty ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                              {isOnDuty ? `On Duty (${doc.cabinNo || 'Cabin 101'})` : 'Off Duty (Unavailable)'}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-neutral-700">12 Patients</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isAccountActive ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600 border border-slate-300'}`}>
                              {isAccountActive ? 'ACTIVE USER' : 'INACTIVE'}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-1.5">
                            <Button size="sm" variant="outline" className="text-[11px]" onClick={() => window.location.href = '/hospital-admin/staff'}>
                              <Edit size={13} /> Edit Access
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );
      }

      case 'nurses': {
        const nurseStaff = getFilteredStaff(['NURSE', 'NURSE_INCHARGE']);
        const onDutyCount = nurseStaff.filter((n) => n.isActive !== false).length;

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                  <Activity className="text-indigo-600" size={26} />
                  Nursing Staff Management & Ward Metrics
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Executive Nursing Roster, Shift Allocations, Assigned Wards & Patient Care Summary
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => window.location.href = '/hospital-admin/staff'}>
                <UserCog size={16} /> Manage Nursing Accounts
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Nursing Staff" value={`${nurseStaff.length} Nurses`} subtitle="Ward & In-Charge Nurses" icon={Activity} color="indigo" />
              <StatCard title="Shift Duty Active" value={`${onDutyCount} On Shift`} subtitle="Live Ward Care" icon={CheckCircle} color="emerald" />
              <StatCard title="Assigned IPD Beds" value="32 Beds" subtitle="Inpatient Care Matrix" icon={BedDouble} color="purple" />
              <StatCard title="Care Tasks Logged" value="142 Tasks" subtitle="Vitals & MAR Administered" icon={ClipboardList} color="sky" />
            </div>

            <Card>
              <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                Nursing Personnel Roster ({nurseStaff.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100 text-neutral-600 uppercase text-[10px] border-b border-neutral-200">
                    <tr>
                      <th className="p-3">Nurse Name & ID</th>
                      <th className="p-3">Assigned Ward & Unit</th>
                      <th className="p-3">Shift Details</th>
                      <th className="p-3">Assigned Patients</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Management Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
                    {nurseStaff.map((nurse) => (
                      <tr key={nurse._id} className="hover:bg-neutral-50">
                        <td className="p-3 font-bold text-neutral-900">
                          {nurse.name}
                          <p className="text-[10px] font-mono text-neutral-500">{nurse.email}</p>
                        </td>
                        <td className="p-3 font-semibold text-neutral-700">{nurse.assignedUnit || 'General Ward / ICU'}</td>
                        <td className="p-3 text-neutral-600">{nurse.shiftDetails || 'Morning Shift'}</td>
                        <td className="p-3 font-bold text-neutral-800">8 Inpatients</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${nurse.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-rose-50 text-rose-700 border border-rose-300'}`}>
                            {nurse.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline" className="text-[11px]" onClick={() => window.location.href = '/hospital-admin/staff'}>
                            <Edit size={13} /> Edit Access
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );
      }

      case 'reception': {
        const receptionStaff = getFilteredStaff(['RECEPTIONIST']);

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                  <ConciergeBell className="text-indigo-600" size={26} />
                  Reception & Front Desk Management
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Executive Front Desk Personnel Roster, Registrations & Token Calling Statistics
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => window.location.href = '/hospital-admin/staff'}>
                <UserCog size={16} /> Manage Reception Staff
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Front Desk Personnel" value={`${receptionStaff.length} Staff`} subtitle="Patient Registration" icon={ConciergeBell} color="purple" />
              <StatCard title="Registrations Today" value={`${patients.length} UHIDs`} subtitle="New & Returning" icon={Users} color="emerald" />
              <StatCard title="OPD Tokens Called" value="64 Tokens" subtitle="Queue Management" icon={TrendingUp} color="sky" />
              <StatCard title="Appointments Booked" value="28 Slots" subtitle="Scheduled Visits" icon={Clock} color="amber" />
            </div>

            <Card>
              <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                Reception Desk Roster ({receptionStaff.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100 text-neutral-600 uppercase text-[10px] border-b border-neutral-200">
                    <tr>
                      <th className="p-3">Staff Name</th>
                      <th className="p-3">Login Email</th>
                      <th className="p-3">Registrations Managed Today</th>
                      <th className="p-3">Shift</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
                    {receptionStaff.map((st) => (
                      <tr key={st._id} className="hover:bg-neutral-50">
                        <td className="p-3 font-bold text-neutral-900">{st.name}</td>
                        <td className="p-3 font-mono text-neutral-500">{st.email}</td>
                        <td className="p-3 font-bold text-neutral-800">18 Patients</td>
                        <td className="p-3 text-neutral-600">{st.shiftDetails || 'Day Shift'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${st.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-rose-50 text-rose-700 border border-rose-300'}`}>
                            {st.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline" className="text-[11px]" onClick={() => window.location.href = '/hospital-admin/staff'}>
                            <Edit size={13} /> Edit Access
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );
      }

      case 'billing': {
        const billingStaff = getFilteredStaff(['CASHIER', 'BILLING_STAFF']);

        const getCashierStats = (cashierId) => {
          const cReceipts = receiptsList.filter((r) => {
            const cid = r.cashierId?._id || r.cashierId?.id || r.cashierId;
            return String(cid) === String(cashierId);
          });
          const collected = cReceipts.reduce((sum, r) => sum + (Number(r.amountPaid) || 0), 0);
          return { collected, count: cReceipts.length };
        };

        const filteredDeletedReceipts = deletedReceiptsList.filter((rc) => {
          const pat = rc.patientId || rc.invoiceId?.patientId || {};
          const name = `${pat.firstName || ''} ${pat.lastName || ''}`.toLowerCase();
          const uhid = (pat.uhid || '').toLowerCase();
          const rcNo = (rc.receiptNo || '').toLowerCase();
          const invNo = (rc.invoiceId?.invoiceNo || '').toLowerCase();
          const reason = (rc.deletionReason || '').toLowerCase();
          const deletedBy = (rc.deletedByName || rc.deletedBy?.name || '').toLowerCase();
          const cashier = (rc.cashierId?.name || '').toLowerCase();
          const q = deletedBillingSearch.toLowerCase();
          return name.includes(q) || uhid.includes(q) || rcNo.includes(q) || invNo.includes(q) || reason.includes(q) || deletedBy.includes(q) || cashier.includes(q);
        });

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                  <CreditCard className="text-indigo-600" size={26} />
                  Billing & Revenue Management Desk
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Executive Financial Analytics, Cashier Collections & Voided Bills Audit Trail
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => window.location.href = '/hospital-admin/staff'}>
                <UserCog size={16} /> Manage Billing Staff
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Active Revenue (Net)" value={`₹${billingSummary.totalRevenue.toLocaleString()}`} subtitle="Valid Paid Receipts (Excludes Voided)" icon={CreditCard} color="emerald" />
              <StatCard title="Active Receipts Issued" value={`${billingSummary.totalBills} Receipts`} subtitle="Cleared Patient Bills" icon={FileSpreadsheet} color="purple" />
              <StatCard title="Deleted / Voided Bills" value={`${billingSummary.deletedBillsCount || 0} Voided`} subtitle={`₹${(billingSummary.totalDeletedRevenue || 0).toLocaleString()} Excluded from Revenue`} icon={Trash2} color="rose" />
              <StatCard title="Billing Personnel" value={`${billingStaff.length} Cashiers`} subtitle="Assigned Billing Desks" icon={Users} color="sky" />
            </div>

            {/* Cashiers Roster & Real Collections */}
            <Card>
              <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                Billing Cashiers & Counter Performance ({billingStaff.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100 text-neutral-600 uppercase text-[10px] border-b border-neutral-200">
                    <tr>
                      <th className="p-3">Cashier Name</th>
                      <th className="p-3">Login Email</th>
                      <th className="p-3">Total Active Collections</th>
                      <th className="p-3">Receipts Processed</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
                    {billingStaff.map((b) => {
                      const stats = getCashierStats(b._id);
                      return (
                        <tr key={b._id} className="hover:bg-neutral-50">
                          <td className="p-3 font-bold text-neutral-900">{b.name}</td>
                          <td className="p-3 font-mono text-neutral-500">{b.email}</td>
                          <td className="p-3 font-bold text-emerald-700 font-mono">₹{stats.collected.toLocaleString()}</td>
                          <td className="p-3 font-bold text-neutral-800">{stats.count} Receipts</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${b.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-rose-50 text-rose-700 border border-rose-300'}`}>
                              {b.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <Button size="sm" variant="outline" className="text-[11px]" onClick={() => window.location.href = '/hospital-admin/staff'}>
                              <Edit size={13} /> Edit Access
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Deleted Bills & Audit Trail Table */}
            <Card className="border-rose-200 bg-rose-50/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-rose-200">
                <div>
                  <h3 className="text-base font-bold text-rose-950 flex items-center gap-2">
                    <Trash2 size={18} className="text-rose-600" />
                    Deleted Bills & Voided Receipts Audit Trail ({deletedReceiptsList.length})
                  </h3>
                  <p className="text-xs text-rose-700/80">
                    Complete oversight of all voided patient bills, who billed them, who deleted them, reasons, and timestamps.
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Search deleted bills, cashier, reason..."
                    value={deletedBillingSearch}
                    onChange={(e) => setDeletedBillingSearch(e.target.value)}
                    className="w-full glass-input rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 border-rose-300 focus:border-rose-500"
                  />
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                </div>
              </div>

              <div className="border border-rose-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-rose-100/60 text-rose-900 uppercase text-[10px] border-b border-rose-200">
                    <tr>
                      <th className="p-3">Receipt / Invoice</th>
                      <th className="p-3">Patient Details</th>
                      <th className="p-3 text-right">Voided Amount</th>
                      <th className="p-3">Billed By</th>
                      <th className="p-3">Deleted By</th>
                      <th className="p-3">Mandatory Deletion Reason</th>
                      <th className="p-3 text-center">Date & Time Deleted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100 text-slate-800">
                    {filteredDeletedReceipts.length > 0 ? (
                      filteredDeletedReceipts.map((rc) => {
                        const pat = rc.patientId || rc.invoiceId?.patientId || {};
                        const rcDocObj = rc.invoiceId?.doctorId || rc.invoiceId?.consultation?.doctorId;
                        const rcDocName = rc.invoiceId?.doctorName || rcDocObj?.name || rc.invoiceId?.consultation?.doctorId?.name;
                        return (
                          <tr key={rc._id} className="hover:bg-rose-50/40">
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-700 text-xs line-through">{rc.receiptNo}</span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                                  VOIDED
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono">Inv: {rc.invoiceId?.invoiceNo || 'INV'}</p>
                            </td>
                            <td className="p-3">
                              <p className="font-bold text-slate-900">{pat.firstName} {pat.lastName}</p>
                              <p className="text-slate-500 text-[10px] font-mono">
                                UHID: {pat.uhid || '—'} {pat.phone && `• Phone: ${pat.phone}`}
                              </p>
                              {rcDocName && (
                                <p className="text-slate-500 text-[10px] font-medium mt-0.5">
                                  Dr: {rcDocName.startsWith('Dr.') ? rcDocName : `Dr. ${rcDocName}`}
                                </p>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-rose-600 text-sm">
                              ₹{(rc.amountPaid || 0).toLocaleString()}
                            </td>
                            <td className="p-3">
                              <p className="font-bold text-slate-800 text-[11px]">{rc.cashierId?.name || 'Cashier'}</p>
                              <p className="text-[10px] text-slate-400">{rc.cashierId?.email || 'Counter'}</p>
                            </td>
                            <td className="p-3">
                              <p className="font-bold text-rose-700 text-[11px]">{rc.deletedByName || rc.deletedBy?.name || 'Staff'}</p>
                              <p className="text-[10px] text-slate-400">{rc.deletedBy?.role || 'Authorized User'}</p>
                            </td>
                            <td className="p-3 max-w-xs">
                              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 font-medium text-[11px]">
                                {rc.deletionReason || 'Reason not specified'}
                              </div>
                            </td>
                            <td className="p-3 text-center text-slate-500 text-[11px]">
                              {rc.deletedAt
                                ? new Date(rc.deletedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                : new Date(rc.updatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                          {deletedReceiptsList.length === 0
                            ? 'No deleted bills in the hospital record. All billing collections are 100% active.'
                            : 'No matching deleted bills found for this search.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );
      }

      case 'laboratory': {
        const labStaff = getFilteredStaff(['LAB_TECH', 'LABORATORY_STAFF']);

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                  <TestTube className="text-indigo-600" size={26} />
                  Laboratory & Pathology Management Desk
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Executive Lab Roster, Diagnostic Sample Intake Metrics & Test Completion Reports
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => window.location.href = '/hospital-admin/staff'}>
                <UserCog size={16} /> Manage Laboratory Staff
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Lab Technicians" value={`${labStaff.length} Techs`} subtitle="Pathology Specialists" icon={TestTube} color="purple" />
              <StatCard title="Samples Processed" value="38 Samples" subtitle="CBC, Urine & Blood Culture" icon={CheckCircle} color="emerald" />
              <StatCard title="Pending Lab Orders" value="6 Orders" subtitle="Awaiting Sign-Off" icon={Clock} color="amber" />
              <StatCard title="Report Accuracy" value="99.4%" subtitle="Quality Assurance" icon={TrendingUp} color="sky" />
            </div>

            <Card>
              <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                Laboratory Staff Roster ({labStaff.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100 text-neutral-600 uppercase text-[10px] border-b border-neutral-200">
                    <tr>
                      <th className="p-3">Technician Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Tests Processed Today</th>
                      <th className="p-3">Shift</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
                    {labStaff.map((l) => (
                      <tr key={l._id} className="hover:bg-neutral-50">
                        <td className="p-3 font-bold text-neutral-900">{l.name}</td>
                        <td className="p-3 font-mono text-neutral-500">{l.email}</td>
                        <td className="p-3 font-bold text-neutral-800">14 Tests</td>
                        <td className="p-3 text-neutral-600">{l.shiftDetails || 'Morning Shift'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-rose-50 text-rose-700 border border-rose-300'}`}>
                            {l.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline" className="text-[11px]" onClick={() => window.location.href = '/hospital-admin/staff'}>
                            <Edit size={13} /> Edit Access
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );
      }

      case 'radiology': {
        const radioStaff = getFilteredStaff(['RADIOLOGIST', 'RADIOLOGY_STAFF']);

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                  <Scan className="text-indigo-600" size={26} />
                  Radiology & PACS Imaging Management
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Radiologist Roster, Modality Statistics (CT Scan, MRI, X-Ray, USG) & DICOM Report Sign-offs
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => window.location.href = '/hospital-admin/staff'}>
                <UserCog size={16} /> Manage Radiology Staff
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Radiologists & Techs" value={`${radioStaff.length} Specialists`} subtitle="PACS RIS Desk" icon={Scan} color="indigo" />
              <StatCard title="Scans Completed" value="22 Scans" subtitle="CT, MRI, X-Ray, USG" icon={CheckCircle} color="emerald" />
              <StatCard title="Pending DICOM Reports" value="3 Reports" subtitle="Awaiting Review" icon={Clock} color="amber" />
              <StatCard title="Modality Uptime" value="100%" subtitle="PACS Server Active" icon={TrendingUp} color="sky" />
            </div>

            <Card>
              <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                Radiology Personnel Roster ({radioStaff.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100 text-neutral-600 uppercase text-[10px] border-b border-neutral-200">
                    <tr>
                      <th className="p-3">Radiologist Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Modality / Unit</th>
                      <th className="p-3">Scans Conducted Today</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
                    {radioStaff.map((r) => (
                      <tr key={r._id} className="hover:bg-neutral-50">
                        <td className="p-3 font-bold text-neutral-900">{r.name}</td>
                        <td className="p-3 font-mono text-neutral-500">{r.email}</td>
                        <td className="p-3 font-semibold text-neutral-700">{r.assignedUnit || 'PACS / CT / X-Ray'}</td>
                        <td className="p-3 font-bold text-neutral-800">11 Scans</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-rose-50 text-rose-700 border border-rose-300'}`}>
                            {r.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline" className="text-[11px]" onClick={() => window.location.href = '/hospital-admin/staff'}>
                            <Edit size={13} /> Edit Access
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );
      }

      case 'pharmacy': {
        const pharmStaff = getFilteredStaff(['PHARMACIST', 'PHARMACY_STAFF']);

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                  <Pill className="text-indigo-600" size={26} />
                  Pharmacy & Stock Inventory Management
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Pharmacist Roster, Dispensing Summaries & FEFO Inventory Control Overview
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => window.location.href = '/hospital-admin/staff'}>
                <UserCog size={16} /> Manage Pharmacy Staff
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Pharmacy Personnel" value={`${pharmStaff.length} Pharmacists`} subtitle="FEFO Dispensing Desk" icon={Pill} color="rose" />
              <StatCard title="Prescriptions Filled" value="74 Prescriptions" subtitle="FEFO Auto-Batched" icon={CheckCircle} color="emerald" />
              <StatCard title="Inventory Items" value="420 Drugs" subtitle="In Central Pharmacy Store" icon={FileSpreadsheet} color="purple" />
              <StatCard title="Near Expiry Warnings" value="4 Batches" subtitle="30-Day Expiry Alerts" icon={AlertCircle} color="amber" />
            </div>

            <Card>
              <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                Pharmacy Staff Roster ({pharmStaff.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100 text-neutral-600 uppercase text-[10px] border-b border-neutral-200">
                    <tr>
                      <th className="p-3">Pharmacist Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Prescriptions Dispensed Today</th>
                      <th className="p-3">Shift</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
                    {pharmStaff.map((p) => (
                      <tr key={p._id} className="hover:bg-neutral-50">
                        <td className="p-3 font-bold text-neutral-900">{p.name}</td>
                        <td className="p-3 font-mono text-neutral-500">{p.email}</td>
                        <td className="p-3 font-bold text-neutral-800">28 Dispenses</td>
                        <td className="p-3 text-neutral-600">{p.shiftDetails || 'Full-time Shift'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-rose-50 text-rose-700 border border-rose-300'}`}>
                            {p.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline" className="text-[11px]" onClick={() => window.location.href = '/hospital-admin/staff'}>
                            <Edit size={13} /> Edit Access
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );
      }

      case 'patients': {
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                  <Users className="text-indigo-600" size={26} />
                  Hospital Patients Administrative Overview
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Executive Patient Directory, OPD/IPD Census, Category Allocations & Billing Status (Read-Only Management View)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Registered Patients" value={`${patients.length} UHIDs`} subtitle="Master Patient Index" icon={Users} color="sky" />
              <StatCard title="Active OPD Patients" value={`${patients.filter(p => p.admissionStatus !== 'ACTIVE_ADMISSION').length} Patients`} subtitle="Queued / In Consultation" icon={TrendingUp} color="emerald" />
              <StatCard title="Admitted IPD Patients" value={`${patients.filter(p => p.admissionStatus === 'ACTIVE_ADMISSION').length} Patients`} subtitle="Ward Bed Matrix" icon={BedDouble} color="purple" />
              <StatCard title="Emergency Admissions" value={`${patients.filter(p => p.category === 'EMERGENCY' || p.admissionStatus === 'EMERGENCY').length} Patients`} subtitle="Trauma / ICU Care" icon={ShieldAlert} color="rose" />
            </div>

            <Card>
              <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                Patient Administrative Register ({patients.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100 text-neutral-600 uppercase text-[10px] border-b border-neutral-200">
                    <tr>
                      <th className="p-3">Patient Name & UHID</th>
                      <th className="p-3">Phone & Age/Gender</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Current Status</th>
                      <th className="p-3 text-right">Registration Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
                    {patients.map((pat) => {
                      const patientFullName = pat.name || `${pat.firstName || ''} ${pat.lastName || ''}`.trim() || 'Patient';
                      const statusLabel = pat.admissionStatus === 'ACTIVE_ADMISSION' ? 'ADMITTED (IPD)' : (pat.admissionStatus === 'DISCHARGED' ? 'DISCHARGED' : 'REGISTERED (OPD)');
                      const statusClass = pat.admissionStatus === 'ACTIVE_ADMISSION' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      return (
                        <tr key={pat._id} className="hover:bg-neutral-50">
                          <td className="p-3 font-bold text-neutral-900">
                            {patientFullName}
                            <p className="text-[10px] font-mono text-indigo-600">{pat.uhid}</p>
                          </td>
                          <td className="p-3">
                            <p className="font-medium text-neutral-800">{pat.phone || 'N/A'}</p>
                            <p className="text-[10px] text-neutral-500">{pat.age ? `${pat.age} yrs` : 'Adult'} • {pat.gender || 'General'}</p>
                          </td>
                          <td className="p-3 font-semibold text-neutral-700">{pat.category || 'GENERAL'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="p-3 text-right text-neutral-500">
                            {new Date(pat.createdAt || Date.now()).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );
      }

      default: {
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-neutral-900 tracking-tight capitalize flex items-center gap-2">
              <ShieldCheck className="text-indigo-600" size= {26} />
              {viewType} Department Executive Management View
            </h2>
            <p className="text-xs text-neutral-500">
              Executive Data Summary, Operational Statistics & Staff Roster Controls
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Department Roster" value={`${staffList.length} Accounts`} subtitle="Configured Staff" icon={Users} color="sky" />
              <StatCard title="Operational Status" value="ACTIVE" subtitle="Real-time Sync" icon={CheckCircle} color="emerald" />
              <StatCard title="Daily Activity" value="Normal" subtitle="Zero Escalations" icon={TrendingUp} color="purple" />
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="animate-fade-in">
      {renderViewContent()}
    </div>
  );
};
