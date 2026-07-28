import React, { useState, useEffect, useCallback } from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ProcessPaymentModal } from '../../components/modals/ProcessPaymentModal';
import { axiosClient } from '../../api/axiosClient';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../providers/SocketProvider';
import {
  CreditCard, Receipt, Lock, DollarSign, Stethoscope,
  User, Pill, CheckCircle, Clock, RefreshCw, AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

// Map category codes to friendly labels + colors
const CATEGORY_STYLES = {
  CONSULTATION: { label: 'Consultation', color: 'sky' },
  PHARMACY:     { label: 'Pharmacy / Rx', color: 'purple' },
  LAB:          { label: 'Laboratory', color: 'amber' },
  RADIOLOGY:    { label: 'Radiology', color: 'emerald' },
  BED_TARIFF:   { label: 'Bed / Ward', color: 'rose' },
  OTHER:        { label: 'Other', color: 'slate' },
};

const CategoryBadge = ({ cat }) => {
  const s = CATEGORY_STYLES[cat] || CATEGORY_STYLES.OTHER;
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-${s.color}-500/10 text-${s.color}-400 border border-${s.color}-500/20`}>
      {s.label}
    </span>
  );
};

export const CashierDashboard = () => {
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [todayCollected, setTodayCollected] = useState(0);
  const [receiptsCount, setReceiptsCount] = useState(0);

  const fetchUnpaidInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axiosClient.get('/billing/unpaid-invoices');
      const invoices = res.data || [];
      setUnpaidInvoices(invoices);
      // Auto-select first invoice if none selected or if the selected one is gone
      setSelectedInvoice((prev) => {
        if (prev && invoices.some((i) => i._id === prev._id)) return prev;
        return invoices.length > 0 ? invoices[0] : null;
      });
    } catch (err) {
      console.error('Failed to load unpaid invoices:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTodayStats = useCallback(async () => {
    try {
      const res = await axiosClient.get('/billing/receipts');
      const receipts = res.data || [];
      const todayStr = new Date().toDateString();
      const todayReceipts = receipts.filter((r) => new Date(r.createdAt).toDateString() === todayStr);
      setReceiptsCount(todayReceipts.length);
      setTodayCollected(todayReceipts.reduce((sum, r) => sum + (r.amountPaid || 0), 0));
    } catch (err) {
      console.error('Failed to load receipts stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchUnpaidInvoices();
    fetchTodayStats();
  }, [fetchUnpaidInvoices, fetchTodayStats]);

  // Real-time: refresh whenever doctor finalizes a new consultation
  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      fetchUnpaidInvoices();
      fetchTodayStats();
    };
    socket.on('billing:invoice_created', handler);
    return () => socket.off('billing:invoice_created', handler);
  }, [socket, fetchUnpaidInvoices, fetchTodayStats]);

  const handlePaymentSuccess = () => {
    fetchUnpaidInvoices();
    fetchTodayStats();
    setIsPaymentOpen(false);
  };

  const patient    = selectedInvoice?.patientId;
  const consult    = selectedInvoice?.consultation;
  const doctor     = consult?.doctorId;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Cash Counter & Billing Workstation</h2>
          <p className="text-xs text-slate-400 mt-1">{user?.name || 'Cashier'} — Billing & Receipts Station</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1 font-bold" onClick={fetchUnpaidInvoices}>
          <RefreshCw size={14} /> Refresh Queue
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Shift Collection" value={formatCurrency(todayCollected)} subtitle="Cash & Digital Payments" icon={DollarSign} color="emerald" />
        <StatCard title="Receipts Issued Today" value={`${receiptsCount} Receipts`} subtitle="Thermal Printed" icon={Receipt} color="sky" />
        <StatCard title="Pending Bills" value={`${unpaidInvoices.length} Invoices`} subtitle="Doctor-Finalized, Awaiting Payment" icon={Clock} color="amber" />
        <StatCard title="Shift Reconciliation" value="BALANCED" subtitle="0 Discrepancy" icon={Lock} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pending Invoice Queue */}
        <Card className="lg:col-span-1">
          <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <Clock size={18} className="text-amber-400" />
            Pending Bills Queue ({unpaidInvoices.length})
          </h3>

          {isLoading ? (
            <div className="p-6 text-center text-sky-400 text-xs animate-pulse">Loading invoices…</div>
          ) : unpaidInvoices.length > 0 ? (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {unpaidInvoices.map((inv) => {
                const pat = inv.patientId || {};
                const doc = inv.consultation?.doctorId;
                const isSelected = selectedInvoice?._id === inv._id;
                return (
                  <div
                    key={inv._id}
                    onClick={() => setSelectedInvoice(inv)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all text-xs ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-sky-400 text-[11px]">{pat.uhid || '—'}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                        inv.status === 'PARTIALLY_PAID'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {inv.status === 'PARTIALLY_PAID' ? 'PARTIAL' : 'UNPAID'}
                      </span>
                    </div>
                    <p className="font-bold text-white text-sm">{pat.firstName} {pat.lastName}</p>
                    {doc && (
                      <p className="text-slate-400 text-[10px] mt-0.5">
                        <Stethoscope size={10} className="inline mr-0.5 text-sky-400" />
                        Dr. {doc.name} — {doc.specialization || 'General'}
                      </p>
                    )}
                    <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-slate-800">
                      <span className="text-slate-400 text-[10px]">Invoice: <span className="text-white font-mono">{inv.invoiceNo}</span></span>
                      <span className="font-bold text-emerald-400 text-xs">{formatCurrency(inv.balanceAmount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 text-xs space-y-2">
              <CheckCircle size={28} className="mx-auto text-emerald-500/40" />
              <p className="font-semibold text-slate-400">All Clear!</p>
              <p>No pending invoices. Doctor-finalized bills will appear here automatically.</p>
            </div>
          )}
        </Card>

        {/* Right: Invoice Detail + Bill Breakdown */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt size={18} className="text-emerald-400" />
              Itemised Bill & Treatment Summary
            </h3>
            {selectedInvoice && (
              <Button size="sm" variant="success" className="font-bold" onClick={() => setIsPaymentOpen(true)}>
                Collect Payment & Issue Receipt
              </Button>
            )}
          </div>

          {selectedInvoice ? (
            <div className="space-y-4 text-xs">
              {/* Patient Info Banner */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-sky-500/20 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">
                      {patient?.firstName} {patient?.lastName}
                      {patient?.age && <span className="text-slate-400 font-normal text-xs ml-1">({patient.age} yrs)</span>}
                    </p>
                    <p className="text-sky-400 font-mono text-[11px] mt-0.5">
                      UHID: {patient?.uhid} • {patient?.phone}
                    </p>
                    {consult?.chiefComplaints && (
                      <p className="text-amber-400 text-[11px] mt-0.5">
                        Chief Complaint: {consult.chiefComplaints}
                      </p>
                    )}
                  </div>
                </div>
                {doctor && (
                  <div className="text-right">
                    <p className="text-slate-400 text-[10px] uppercase tracking-wider">Consulting Doctor</p>
                    <p className="text-white font-bold">Dr. {doctor.name}</p>
                    <p className="text-sky-400 text-[10px]">{doctor.specialization || 'General OPD'}</p>
                  </div>
                )}
              </div>

              {/* Invoice Meta */}
              <div className="flex flex-wrap gap-3 text-[11px]">
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">
                  Invoice: <span className="text-white font-mono font-bold">{selectedInvoice.invoiceNo}</span>
                </span>
                <span className={`px-2 py-1 rounded border font-bold ${
                  selectedInvoice.status === 'PARTIALLY_PAID'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {selectedInvoice.status}
                </span>
                {consult?.followUpDate && (
                  <span className="px-2 py-1 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400">
                    Follow-up: {new Date(consult.followUpDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Treatment Items Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 text-center">Category</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {selectedInvoice.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="p-2.5 text-white font-medium">{item.description}</td>
                        <td className="p-2.5 text-center">
                          <CategoryBadge cat={item.category} />
                        </td>
                        <td className="p-2.5 text-center text-slate-400">{item.qty}</td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-white">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Prescription Preview (from consultation) */}
              {consult?.prescriptions?.length > 0 && (
                <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
                  <p className="text-purple-400 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 mb-2">
                    <Pill size={12} /> Doctor's Prescription ({consult.prescriptions.length} medicines)
                  </p>
                  <div className="space-y-1">
                    {consult.prescriptions.map((med, i) => (
                      <p key={i} className="text-slate-300 text-[11px]">
                        <span className="text-white font-bold">{med.medicineName}</span>
                        {' — '}{med.dosage} · {med.frequency?.replace(/_/g, ' ')} · {med.durationDays} days
                        {med.timing && <span className="text-slate-500"> ({med.timing.replace(/_/g, ' ').toLowerCase()})</span>}
                      </p>
                    ))}
                  </div>
                  {consult.adviceToPatient && (
                    <p className="mt-2 text-amber-400 text-[11px]">
                      Advice: <span className="text-slate-300">{consult.adviceToPatient}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Bill Totals */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                {selectedInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Discount</span>
                    <span className="font-mono">— {formatCurrency(selectedInvoice.discountAmount)}</span>
                  </div>
                )}
                {selectedInvoice.paidAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Already Paid</span>
                    <span className="font-mono">— {formatCurrency(selectedInvoice.paidAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-white border-t border-slate-700 pt-2 mt-2">
                  <span>Balance Due</span>
                  <span className="text-emerald-400">{formatCurrency(selectedInvoice.balanceAmount)}</span>
                </div>
              </div>

              {/* Collect Button */}
              <Button
                variant="success"
                className="w-full font-bold py-3"
                onClick={() => setIsPaymentOpen(true)}
              >
                Collect {formatCurrency(selectedInvoice.balanceAmount)} & Print Receipt
              </Button>
            </div>
          ) : (
            <div className="p-10 text-center text-slate-500 space-y-2 text-sm">
              <AlertCircle size={32} className="mx-auto text-slate-600" />
              <p className="font-semibold">No invoice selected</p>
              <p className="text-xs">Select a pending bill from the left panel, or wait for a doctor to finalize a consultation — it will appear automatically!</p>
            </div>
          )}
        </Card>
      </div>

      {selectedInvoice && (
        <ProcessPaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          invoice={selectedInvoice}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};
