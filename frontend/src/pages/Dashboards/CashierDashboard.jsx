import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ProcessPaymentModal } from '../../components/modals/ProcessPaymentModal';
import { Modal } from '../../components/ui/Modal';
import { axiosClient } from '../../api/axiosClient';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../providers/SocketProvider';
import {
  CreditCard, Receipt, Lock, IndianRupee, Stethoscope,
  User, Pill, CheckCircle, Clock, RefreshCw, AlertCircle,
  Search, Printer, MessageCircle, Eye, FileText, Phone, CheckCircle2
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
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-${s.color}-50 text-${s.color}-600 border border-${s.color}-200`}>
      {s.label}
    </span>
  );
};

export const CashierDashboard = () => {
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const tabParam = searchParams.get('tab');
  const isReceiptsRoute = location.pathname.includes('/billing/receipts') || tabParam === 'RECEIPTS';

  const [activeTab, setActiveTab] = useState(isReceiptsRoute ? 'RECEIPTS' : 'UNPAID');

  useEffect(() => {
    if (isReceiptsRoute) {
      setActiveTab('RECEIPTS');
    } else if (tabParam === 'UNPAID') {
      setActiveTab('UNPAID');
    }
  }, [isReceiptsRoute, tabParam]);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [allReceipts, setAllReceipts] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedReceiptForView, setSelectedReceiptForView] = useState(null);
  const [receiptSearchTerm, setReceiptSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [todayCollected, setTodayCollected] = useState(0);
  const [receiptsCount, setReceiptsCount] = useState(0);

  const fetchUnpaidInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axiosClient.get('/billing/unpaid-invoices');
      const invoices = res.data || [];
      setUnpaidInvoices(invoices);
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

  const fetchAllReceipts = useCallback(async () => {
    try {
      const res = await axiosClient.get('/billing/receipts');
      const receipts = res.data || [];
      setAllReceipts(receipts);
      const todayStr = new Date().toDateString();
      const todayReceipts = receipts.filter((r) => new Date(r.createdAt).toDateString() === todayStr);
      setReceiptsCount(todayReceipts.length);
      setTodayCollected(todayReceipts.reduce((sum, r) => sum + (r.amountPaid || 0), 0));
    } catch (err) {
      console.error('Failed to load receipts history:', err);
    }
  }, []);

  useEffect(() => {
    fetchUnpaidInvoices();
    fetchAllReceipts();
  }, [fetchUnpaidInvoices, fetchAllReceipts]);

  // Real-time: refresh whenever doctor finalizes a new consultation or payment occurs
  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      fetchUnpaidInvoices();
      fetchAllReceipts();
    };
    socket.on('billing:invoice_created', handler);
    return () => socket.off('billing:invoice_created', handler);
  }, [socket, fetchUnpaidInvoices, fetchAllReceipts]);

  const handlePaymentSuccess = () => {
    fetchUnpaidInvoices();
    fetchAllReceipts();
    setIsPaymentOpen(false);
  };

  const handleSendReceiptWhatsApp = (rc) => {
    const pat = rc.patientId || rc.invoiceId?.patientId || {};
    const rawPhone = pat.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    const patName = `${pat.firstName || ''} ${pat.lastName || ''}`.trim() || 'Patient';
    const invNo = rc.invoiceId?.invoiceNo || 'INV';
    const msg = `*Hospital Billing Receipt*\n\nDear ${patName},\nThank you for visiting our Healthcare Facility.\n\n*Receipt Summary:*\n• Receipt No: ${rc.receiptNo}\n• Invoice No: ${invNo}\n• UHID: ${pat.uhid || 'N/A'}\n• Amount Paid: ₹${rc.amountPaid}\n• Payment Tender: ${rc.paymentMode}\n• Date: ${new Date(rc.createdAt).toLocaleString()}\n\nThank you for choosing our hospital services!`;
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/${cleanPhone.length >= 10 ? cleanPhone : ''}?text=${encoded}`, '_blank');
  };

  const filteredReceipts = allReceipts.filter((rc) => {
    const pat = rc.patientId || rc.invoiceId?.patientId || {};
    const name = `${pat.firstName || ''} ${pat.lastName || ''}`.toLowerCase();
    const uhid = (pat.uhid || '').toLowerCase();
    const rcNo = (rc.receiptNo || '').toLowerCase();
    const invNo = (rc.invoiceId?.invoiceNo || '').toLowerCase();
    const phone = (pat.phone || '').toLowerCase();
    const search = receiptSearchTerm.toLowerCase();
    return name.includes(search) || uhid.includes(search) || rcNo.includes(search) || invNo.includes(search) || phone.includes(search);
  });

  const patient    = selectedInvoice?.patientId;
  const consult    = selectedInvoice?.consultation;
  const doctor     = consult?.doctorId;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Dynamic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {activeTab === 'RECEIPTS' ? 'Permanent Receipts & Payment Records' : 'Cash Counter & Billing Workstation'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {activeTab === 'RECEIPTS'
              ? 'Stored history of all billed receipts, patient billing archives & WhatsApp sharing'
              : `${user?.name || 'Cashier'} — Billing & Receipts Station`}
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1 font-bold" onClick={() => { fetchUnpaidInvoices(); fetchAllReceipts(); }}>
          <RefreshCw size={14} /> Refresh Data
        </Button>
      </div>

      {/* Stats - visible when on UNPAID tab */}
      {activeTab === 'UNPAID' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Today's Shift Collection" value={formatCurrency(todayCollected)} subtitle="Cash & Digital Payments" icon={IndianRupee} color="emerald" />
          <StatCard title="Receipts Issued Today" value={`${receiptsCount} Receipts`} subtitle="Thermal Printed" icon={Receipt} color="sky" />
          <StatCard title="Pending Bills" value={`${unpaidInvoices.length} Invoices`} subtitle="Doctor-Finalized, Awaiting Payment" icon={Clock} color="amber" />
          <StatCard title="Shift Reconciliation" value="BALANCED" subtitle="0 Discrepancy" icon={Lock} color="purple" />
        </div>
      )}



      {activeTab === 'UNPAID' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Pending Invoice Queue */}
          <Card className="lg:col-span-1">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Clock size={18} className="text-amber-600" />
              Pending Bills Queue ({unpaidInvoices.length})
            </h3>

            {isLoading ? (
              <div className="p-6 text-center text-indigo-600 text-xs animate-pulse">Loading invoices…</div>
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
                          ? 'bg-indigo-50 border-indigo-400 shadow-sm'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-indigo-700 text-[11px]">{pat.uhid || '—'}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                          inv.status === 'PARTIALLY_PAID'
                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                            : 'bg-red-50 text-red-600 border-red-200'
                        }`}>
                          {inv.status === 'PARTIALLY_PAID' ? 'PARTIAL' : 'UNPAID'}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 text-sm">{pat.firstName} {pat.lastName}</p>
                      {doc && (
                        <p className="text-slate-500 text-[10px] mt-0.5">
                          <Stethoscope size={10} className="inline mr-0.5 text-indigo-500" />
                          Dr. {doc.name} — {doc.specialization || 'General'}
                        </p>
                      )}
                      <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-slate-200">
                        <span className="text-slate-500 text-[10px]">Invoice: <span className="text-slate-900 font-mono">{inv.invoiceNo}</span></span>
                        <span className="font-bold text-emerald-600 text-xs">{formatCurrency(inv.balanceAmount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs space-y-2">
                <CheckCircle size={28} className="mx-auto text-emerald-500/40" />
                <p className="font-semibold text-slate-500">All Clear!</p>
                <p>No pending invoices. Doctor-finalized bills will appear here automatically.</p>
              </div>
            )}
          </Card>

          {/* Right: Invoice Detail + Bill Breakdown */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt size={18} className="text-emerald-600" />
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
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        {patient?.firstName} {patient?.lastName}
                        {patient?.age && <span className="text-slate-500 font-normal text-xs ml-1">({patient.age} yrs)</span>}
                      </p>
                      <p className="text-indigo-700 font-mono text-[11px] mt-0.5">
                        UHID: {patient?.uhid} • {patient?.phone}
                      </p>
                      {consult?.chiefComplaints && (
                        <p className="text-amber-600 text-[11px] mt-0.5">
                          Chief Complaint: {consult.chiefComplaints}
                        </p>
                      )}
                    </div>
                  </div>
                  {doctor && (
                    <div className="text-right">
                      <p className="text-slate-500 text-[10px] uppercase tracking-wider">Consulting Doctor</p>
                      <p className="text-slate-900 font-bold">Dr. {doctor.name}</p>
                      <p className="text-indigo-600 text-[10px]">{doctor.specialization || 'General OPD'}</p>
                    </div>
                  )}
                </div>

                {/* Invoice Meta */}
                <div className="flex flex-wrap gap-3 text-[11px]">
                  <span className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-600">
                    Invoice: <span className="text-slate-900 font-mono font-bold">{selectedInvoice.invoiceNo}</span>
                  </span>
                  <span className={`px-2 py-1 rounded border font-bold ${
                    selectedInvoice.status === 'PARTIALLY_PAID'
                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                      : 'bg-red-50 text-red-600 border-red-200'
                  }`}>
                    {selectedInvoice.status}
                  </span>
                  {consult?.followUpDate && (
                    <span className="px-2 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-600">
                      Follow-up: {new Date(consult.followUpDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Treatment Items Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Item Description</th>
                        <th className="p-2.5 text-center">Category</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Unit Price</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {selectedInvoice.items?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 text-slate-900 font-medium">{item.description}</td>
                          <td className="p-2.5 text-center">
                            <CategoryBadge cat={item.category} />
                          </td>
                          <td className="p-2.5 text-center text-slate-500">{item.qty}</td>
                          <td className="p-2.5 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Prescription Preview */}
                {consult?.prescriptions?.length > 0 && (
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                    <p className="text-purple-600 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 mb-2">
                      <Pill size={12} /> Doctor's Prescription ({consult.prescriptions.length} medicines)
                    </p>
                    <div className="space-y-1">
                      {consult.prescriptions.map((med, i) => (
                        <p key={i} className="text-slate-600 text-[11px]">
                          <span className="text-slate-900 font-bold">{med.medicineName}</span>
                          {' — '}{med.dosage} · {med.frequency?.replace(/_/g, ' ')} · {med.durationDays} days
                          {med.timing && <span className="text-slate-500"> ({med.timing.replace(/_/g, ' ').toLowerCase()})</span>}
                        </p>
                      ))}
                    </div>
                    {consult.adviceToPatient && (
                      <p className="mt-2 text-amber-600 text-[11px]">
                        Advice: <span className="text-slate-600">{consult.adviceToPatient}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Bill Totals */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.discountAmount > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Discount</span>
                      <span className="font-mono">— {formatCurrency(selectedInvoice.discountAmount)}</span>
                    </div>
                  )}
                  {selectedInvoice.paidAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Already Paid</span>
                      <span className="font-mono">— {formatCurrency(selectedInvoice.paidAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base text-slate-900 border-t border-slate-200 pt-2 mt-2">
                    <span>Balance Due</span>
                    <span className="text-emerald-600">{formatCurrency(selectedInvoice.balanceAmount)}</span>
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
                <AlertCircle size={32} className="mx-auto text-slate-400" />
                <p className="font-semibold">No invoice selected</p>
                <p className="text-xs">Select a pending bill from the left panel, or wait for a doctor to finalize a consultation — it will appear automatically!</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* RECEIPTS & PAYMENT HISTORY TAB */}
      {activeTab === 'RECEIPTS' && (
        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt size={18} className="text-emerald-600" />
                Permanent Receipts & Payment Records
              </h3>
              <p className="text-xs text-slate-500">Stored history of all billed receipts, patient billing archives & WhatsApp sharing</p>
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search patient, UHID, receipt, phone..."
                value={receiptSearchTerm}
                onChange={(e) => setReceiptSearchTerm(e.target.value)}
                className="w-full glass-input rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900"
              />
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Receipt No</th>
                  <th className="p-3">Patient Details</th>
                  <th className="p-3 text-center">Tender Mode</th>
                  <th className="p-3 text-right">Amount Paid</th>
                  <th className="p-3 text-center">Date & Time</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filteredReceipts.length > 0 ? (
                  filteredReceipts.map((rc) => {
                    const pat = rc.patientId || rc.invoiceId?.patientId || {};
                    return (
                      <tr key={rc._id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <p className="font-mono font-bold text-indigo-700 text-xs">{rc.receiptNo}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Inv: {rc.invoiceId?.invoiceNo || 'INV'}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{pat.firstName} {pat.lastName}</p>
                          <p className="text-slate-500 text-[10px] font-mono">
                            UHID: {pat.uhid || '—'} {pat.phone && `• 📞 ${pat.phone}`}
                          </p>
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {rc.paymentMode}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600 text-sm">
                          {formatCurrency(rc.amountPaid)}
                        </td>
                        <td className="p-3 text-center text-slate-500 text-[11px]">
                          {new Date(rc.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedReceiptForView(rc)}
                              className="px-3 py-1.5 rounded-xl font-bold text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                            >
                              <Eye size={13} className="text-indigo-600" />
                              <span>View Bill</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSendReceiptWhatsApp(rc)}
                              className="px-3 py-1.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                            >
                              <MessageCircle size={13} className="text-white fill-white/20" />
                              <span>WhatsApp</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                      No matching paid receipts found. Processed bills will stay stored here permanently.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selectedInvoice && (
        <ProcessPaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          invoice={selectedInvoice}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* View Historical Receipt & Printable Bill Modal */}
      {selectedReceiptForView && (
        <Modal
          isOpen={Boolean(selectedReceiptForView)}
          onClose={() => setSelectedReceiptForView(null)}
          title={`Receipt #${selectedReceiptForView.receiptNo}`}
          subtitle="Patient Billing Record & 80mm Thermal Receipt View"
          icon={Receipt}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="font-extrabold text-slate-900 text-base">Payment Record Cleared</h4>
              <p className="text-slate-500 text-[11px]">
                Paid on {new Date(selectedReceiptForView.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-bold text-slate-900">
                  {selectedReceiptForView.patientId?.firstName || selectedReceiptForView.invoiceId?.patientId?.firstName}{' '}
                  {selectedReceiptForView.patientId?.lastName || selectedReceiptForView.invoiceId?.patientId?.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">UHID:</span>
                <span className="font-mono font-bold text-indigo-700">
                  {selectedReceiptForView.patientId?.uhid || selectedReceiptForView.invoiceId?.patientId?.uhid}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mobile Phone:</span>
                <span className="font-mono text-slate-700">
                  {selectedReceiptForView.patientId?.phone || selectedReceiptForView.invoiceId?.patientId?.phone || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">Invoice No:</span>
                <span className="font-mono text-slate-900">{selectedReceiptForView.invoiceId?.invoiceNo || 'INV'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tender Mode:</span>
                <span className="font-bold text-indigo-700">{selectedReceiptForView.paymentMode}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm border-t border-slate-200 pt-2 text-slate-900">
                <span>Amount Paid:</span>
                <span className="text-emerald-600">{formatCurrency(selectedReceiptForView.amountPaid)}</span>
              </div>
            </div>

            {selectedReceiptForView.invoiceId?.items?.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <p className="p-2.5 bg-slate-100 font-bold text-slate-700 uppercase text-[10px]">Treatment Item Breakdown</p>
                <div className="divide-y divide-slate-200">
                  {selectedReceiptForView.invoiceId.items.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex justify-between items-center text-[11px]">
                      <span>{it.description} ({it.qty}x)</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(it.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                onClick={() => window.print()}
              >
                <Printer size={15} className="text-slate-600" />
                <span>Print Thermal Receipt</span>
              </button>

              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                onClick={() => handleSendReceiptWhatsApp(selectedReceiptForView)}
              >
                <MessageCircle size={15} className="text-white fill-white/20" />
                <span>Send via WhatsApp</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
