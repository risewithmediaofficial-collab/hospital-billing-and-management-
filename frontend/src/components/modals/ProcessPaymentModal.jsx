import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import {
  X, CreditCard, CheckCircle, Printer, AlertCircle, MessageCircle,
  Building2, Receipt, ArrowRight, ShieldCheck, CheckCircle2,
  Plus, Trash2, Split, IndianRupee, QrCode, Banknote, Smartphone
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { useDepartmentNotificationStore } from '../../store/departmentNotificationStore';
import { printReceipt } from '../../utils/printReceipt';

export const ProcessPaymentModal = ({ isOpen, onClose, invoice, onSuccess }) => {
  const resolvePending = useDepartmentNotificationStore((state) => state.resolvePending);
  useScrollLock(isOpen);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('CARD');
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitRows, setSplitRows] = useState([
    { mode: 'CASH', amount: '', reference: '' },
    { mode: 'UPI', amount: '', reference: '' },
  ]);
  const [transactionRef, setTransactionRef] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && invoice) {
      const initialAmount = String(invoice.balanceAmount || invoice.grandTotal || '');
      setAmountPaid(initialAmount);
      setPaymentMode('CARD');
      setIsSplitMode(false);
      const half = (Number(initialAmount) / 2).toFixed(2);
      const remainingHalf = (Number(initialAmount) - Number(half)).toFixed(2);
      setSplitRows([
        { mode: 'CASH', amount: half, reference: 'Counter Cash' },
        { mode: 'UPI', amount: remainingHalf, reference: '' },
      ]);
      setTransactionRef(`TXN-${Date.now().toString().slice(-6)}`);
      setReceipt(null);
      setError(null);
    }
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  // Extract patient context
  const pat = invoice?.patientId || receipt?.patientId || {};
  const patName = `${pat.firstName || ''} ${pat.lastName || ''}`.trim() || 'Walk-in Patient';
  const patUhid = pat.uhid || invoice?.patientUhid || 'N/A';
  const patPhone = pat.phone || 'N/A';

  // Extract doctor context
  const docObj = invoice?.doctorId || invoice?.consultation?.doctorId;
  const rawDocName = invoice?.doctorName || docObj?.name;
  const docName = rawDocName ? (rawDocName.startsWith('Dr.') ? rawDocName : `Dr. ${rawDocName}`) : 'Dr. Test Doctor';

  // Extract hospital context & full address
  const hospObj = receipt?.hospitalId || invoice?.hospitalId || {};
  const hospName = hospObj?.name || 'Test Hospital Main Campus';

  const addrObj = hospObj?.address || {};
  const formattedAddress = [
    addrObj?.street || '123 Healthcare Boulevard, Medical Enclave',
    addrObj?.city || 'Chennai',
    addrObj?.state || 'Tamil Nadu',
    addrObj?.postalCode ? `PIN: ${addrObj.postalCode}` : 'PIN: 600001',
  ].filter(Boolean).join(', ');

  const hospPhone = hospObj?.contactPhone || '6380140927';
  const hospEmail = hospObj?.contactEmail || 'billing@testhospital.com';

  const invNo = invoice?.invoiceNo || 'INV-TH-2026-00001';
  const rcNo = receipt?.receiptNo || 'PENDING COLLECTION';
  const paymentDate = receipt?.createdAt ? new Date(receipt.createdAt) : new Date();
  const currentTender = receipt?.paymentMode || (isSplitMode ? 'SPLIT' : paymentMode);
  const currentAmountPaid = receipt ? receipt.amountPaid : (Number(amountPaid) || invoice.grandTotal || 0);

  const items = invoice?.items && invoice.items.length > 0 ? invoice.items : [
    { description: 'OPD General Consultation Fee', qty: 1, unitPrice: invoice.grandTotal, totalPrice: invoice.grandTotal },
  ];

  const subtotal = invoice?.subtotal || items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
  const discount = invoice?.discountAmount || 0;
  const grandTotal = invoice?.grandTotal || (subtotal - discount);
  const balanceDue = Math.max(0, grandTotal - currentAmountPaid);

  // Split calculation metrics
  const totalSplitSum = splitRows.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
  const totalPayable = Number(amountPaid) || 0;
  const splitDiff = totalPayable - totalSplitSum;
  const isSplitBalanced = Math.abs(splitDiff) < 0.01;

  const handleApply5050 = (mode1 = 'CASH', mode2 = 'UPI') => {
    const half = (totalPayable / 2).toFixed(2);
    const remainder = (totalPayable - Number(half)).toFixed(2);
    setSplitRows([
      { mode: mode1, amount: half, reference: mode1 === 'CASH' ? 'Counter Cash' : '' },
      { mode: mode2, amount: remainder, reference: '' },
    ]);
  };

  const handleAddSplitRow = () => {
    const defaultRem = Math.max(0, splitDiff).toFixed(2);
    setSplitRows([...splitRows, { mode: 'CARD', amount: defaultRem !== '0.00' ? defaultRem : '', reference: '' }]);
  };

  const handleRemoveSplitRow = (idx) => {
    if (splitRows.length <= 1) return;
    setSplitRows(splitRows.filter((_, i) => i !== idx));
  };

  const handleSplitRowChange = (idx, field, val) => {
    const updated = [...splitRows];
    updated[idx] = { ...updated[idx], [field]: val };
    setSplitRows(updated);
  };

  const handleProcess = async (autoPrint = false) => {
    setIsLoading(true);
    setError(null);
    try {
      if (isSplitMode) {
        if (!isSplitBalanced) {
          setError(`Split amounts (₹${totalSplitSum.toFixed(2)}) must equal Total Amount Paid (₹${totalPayable.toFixed(2)}).`);
          setIsLoading(false);
          return;
        }
      }

      const payload = {
        invoiceId: invoice._id,
        amountPaid: Number(amountPaid),
        paymentMode: isSplitMode ? 'SPLIT' : paymentMode,
        splitPayments: isSplitMode ? splitRows.filter((r) => Number(r.amount) > 0) : [],
        transactionRef: isSplitMode ? 'TXN-SPLIT-MULTI' : transactionRef,
      };

      const response = await axiosClient.post('/billing/payments/receipts', payload);
      const newReceipt = response.data.receipt;
      setReceipt(newReceipt);

      if (response.data.invoice?.status === 'PAID') {
        resolvePending(invoice._id);
      }

      if (onSuccess) {
        onSuccess(response.data);
      }

      if (autoPrint) {
        setTimeout(() => {
          printReceipt({ receipt: newReceipt, invoice, hospital: hospObj });
        }, 200);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || err.error?.message || 'Failed to process payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendWhatsApp = () => {
    const rawClean = patPhone.replace(/[^0-9]/g, '');
    let breakdownText = '';
    if (receipt?.splitPayments && receipt.splitPayments.length > 0) {
      breakdownText = `• Payment Breakdown: ${receipt.splitPayments.map((s) => `${s.mode}: ₹${s.amount.toFixed(2)}${s.reference ? ` (${s.reference})` : ''}`).join(', ')}\n`;
    }

    const msg =
      `*${hospName} — Official Bill & Receipt*\n\n` +
      `Dear ${patName},\n` +
      `Thank you for visiting ${hospName}.\n\n` +
      `*Receipt Details:*\n` +
      `• Receipt No: ${receipt?.receiptNo || 'REC-PAID'}\n` +
      `• Invoice No: ${invNo}\n` +
      `• UHID: ${patUhid}\n` +
      `• Mobile: ${patPhone}\n` +
      `• Attending Doctor: ${docName}\n` +
      `• Tender Mode: ${receipt?.paymentMode || (isSplitMode ? 'SPLIT' : paymentMode)}\n` +
      breakdownText +
      `• Amount Paid: ${formatCurrency(receipt ? receipt.amountPaid : currentAmountPaid)}\n` +
      `• Date: ${paymentDate.toLocaleString()}\n\n` +
      `Address: ${formattedAddress}\n` +
      `Phone: ${hospPhone}\n\n` +
      `Thank you for choosing our healthcare services!`;
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/${rawClean.length >= 10 ? rawClean : ''}?text=${encoded}`, '_blank');
  };

  const handleReset = () => {
    setReceipt(null);
    onClose();
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-container max-w-5xl" onClick={(e) => e.stopPropagation()}>
        {/* Sticky Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
              <CreditCard size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">
                {receipt ? 'Official Payment Receipt & Cleared Bill' : 'Collect Payment & Issue Receipt'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Invoice: <span className="font-mono font-bold text-slate-700">{invoice.invoiceNo}</span> • Patient: <span className="font-bold text-indigo-600">{patName}</span>
              </p>
            </div>
          </div>
          <button onClick={handleReset} className="modal-close-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {error && (
            <div className="no-print mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {receipt && (
            <div className="no-print mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-emerald-950">Payment Cleared Successfully!</p>
                  <p className="text-[11px] text-emerald-700">Receipt #{receipt.receiptNo} has been issued and stored in permanent records.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="success" size="sm" className="font-bold flex items-center gap-1.5" onClick={() => printReceipt({ receipt, invoice, hospital: hospObj })}>
                  <Printer size={14} /> Print Receipt
                </Button>
                <Button type="button" size="sm" className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5" onClick={handleSendWhatsApp}>
                  <MessageCircle size={14} /> WhatsApp
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Receipt size={14} className="text-indigo-600" />
                  Live Official Bill Preview
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {receipt ? 'Status: PAID' : 'Status: READY TO COLLECT'}
                </span>
              </div>

              <div id="printable-official-bill" className="printable-receipt-card bg-white text-slate-900 border border-slate-300 rounded-2xl p-5 shadow-xs font-sans text-xs space-y-3.5">
                <div className="text-center border-b-2 border-slate-800 pb-2.5 space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <Building2 size={18} className="text-indigo-600 shrink-0" />
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-950 uppercase">{hospName}</h2>
                  </div>
                  <p className="text-[11px] font-medium text-slate-700">{formattedAddress}</p>
                  <p className="text-[10px] text-slate-500 font-mono">Phone: {hospPhone} &nbsp;|&nbsp; Email: {hospEmail}</p>
                  <div className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[9px] font-black uppercase tracking-wider text-slate-800">
                    Official Medical Cash Receipt & Treatment Bill
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-[11px]">
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Patient:</span><span className="font-bold text-slate-900">{patName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Receipt No:</span><span className={`font-mono font-bold ${receipt ? 'text-indigo-700' : 'text-slate-500'}`}>{rcNo}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">UHID:</span><span className="font-mono font-bold text-slate-900">{patUhid}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Invoice No:</span><span className="font-mono font-bold text-slate-900">{invNo}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Mobile Phone:</span><span className="font-mono text-slate-800">{patPhone}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Date & Time:</span><span className="text-slate-800">{paymentDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span></div>
                  <div className="flex justify-between border-t border-slate-200 pt-1"><span className="text-slate-500 font-medium">Attending Doctor:</span><span className="font-bold text-slate-900">{docName}</span></div>
                  <div className="flex justify-between border-t border-slate-200 pt-1"><span className="text-slate-500 font-medium">Tender Mode:</span><span className="font-bold text-indigo-700 uppercase">{currentTender}</span></div>
                  
                  {((receipt?.splitPayments && receipt.splitPayments.length > 0) || (isSplitMode && splitRows.length > 0)) && (
                    <div className="col-span-2 mt-1 p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 text-[10px]">
                      <span className="font-black text-emerald-900 block mb-0.5">Split Tender Allocation:</span>
                      <div className="flex flex-wrap gap-2 text-emerald-800 font-medium">
                        {(receipt?.splitPayments || splitRows).map((s, idx) => (
                          <span key={idx} className="bg-white px-2 py-0.5 rounded border border-emerald-200">
                            <strong>{s.mode}:</strong> ₹{Number(s.amount || 0).toFixed(2)}
                            {s.reference ? ` (${s.reference})` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-extrabold uppercase text-[10px] text-slate-900 tracking-wider">Treatment Item Breakdown</p>
                    <span className="text-[10px] text-slate-500">({items.length} Services)</span>
                  </div>
                  <div className="border border-slate-300 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 uppercase text-[9px] font-bold border-b border-slate-300">
                        <tr><th className="p-2">#</th><th className="p-2">Treatment / Service</th><th className="p-2 text-center">Qty</th><th className="p-2 text-right">Unit Price</th><th className="p-2 text-right">Total</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-900">
                        {items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="p-2 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                            <td className="p-2 font-medium">{it.description}</td>
                            <td className="p-2 text-center font-mono">{it.qty || 1}x</td>
                            <td className="p-2 text-right font-mono text-slate-700">{formatCurrency(it.unitPrice)}</td>
                            <td className="p-2 text-right font-mono font-bold text-slate-950">{formatCurrency(it.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <div className="w-64 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-600"><span>Subtotal:</span><span className="font-mono font-bold">{formatCurrency(subtotal)}</span></div>
                    {discount > 0 && (<div className="flex justify-between text-amber-700 font-medium"><span>Discount:</span><span className="font-mono">— {formatCurrency(discount)}</span></div>)}
                    <div className="flex justify-between text-slate-950 font-extrabold border-t border-slate-300 pt-1.5 text-xs"><span>Grand Total:</span><span className="font-mono">{formatCurrency(grandTotal)}</span></div>
                    <div className="flex justify-between text-emerald-700 font-extrabold text-xs"><span>Amount Paid:</span><span className="font-mono">{formatCurrency(currentAmountPaid)}</span></div>
                    <div className="flex justify-between text-slate-500 font-medium border-t border-slate-200 pt-1 text-[10px]"><span>Remaining Balance:</span><span className="font-mono font-bold text-rose-600">{formatCurrency(balanceDue)}</span></div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-dashed border-slate-300 flex items-center justify-between text-[8px] text-slate-500 font-sans">
                  <span>Powered by <strong className="text-slate-900 font-bold">Risewithmedia.com</strong></span>
                  <span className="font-mono font-semibold text-indigo-600">hms.risewithmedia.com</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 no-print">
              <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <CreditCard size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Payment Collection</h4>
                      <p className="text-[10px] text-slate-500">Single or multi-mode split tender</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Payable Balance</span>
                    <span className="font-extrabold text-sm text-slate-950 font-mono">{formatCurrency(invoice.balanceAmount || invoice.grandTotal)}</span>
                  </div>
                </div>

                {!receipt ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleProcess(true);
                    }}
                    autoComplete="off"
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-xl">
                      <button type="button" onClick={() => setIsSplitMode(false)} className={`py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${!isSplitMode ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'}`}>
                        <CreditCard size={14} /> Single Mode
                      </button>
                      <button type="button" onClick={() => { setIsSplitMode(true); handleApply5050('CASH', 'UPI'); }} className={`py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${isSplitMode ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
                        <Split size={14} /> ⚡ Split Tender
                      </button>
                    </div>

                    <Input
                      label="Total Collection Amount (₹)"
                      type="number"
                      step="0.01"
                      value={amountPaid}
                      onChange={(e) => {
                        setAmountPaid(e.target.value);
                        if (isSplitMode) {
                          const half = (Number(e.target.value) / 2).toFixed(2);
                          const rem = (Number(e.target.value) - Number(half)).toFixed(2);
                          setSplitRows([
                            { mode: 'CASH', amount: half, reference: 'Counter Cash' },
                            { mode: 'UPI', amount: rem, reference: '' },
                          ]);
                        }
                      }}
                      required
                    />

                    {!isSplitMode ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Payment Mode</label>
                          <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15">
                            <option value="CARD">💳 Credit / Debit Card</option>
                            <option value="CASH">💵 Cash at Counter</option>
                            <option value="UPI">📱 UPI / QR Code</option>
                            <option value="NET_BANKING">🏦 Net Banking</option>
                            <option value="INSURANCE">🏥 Insurance</option>
                          </select>
                        </div>
                        <Input label="Transaction Reference" value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} required />
                      </div>
                    ) : (
                      <div className="space-y-3 p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-[11px] text-slate-800 flex items-center gap-1.5"><Split size={14} className="text-indigo-600" /> Multi-Payment Allocation</span>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => handleApply5050('CASH', 'UPI')} className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200">50/50 Cash+UPI</button>
                          </div>
                        </div>
                        <div className="space-y-2.5">
                          {splitRows.map((row, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <select value={row.mode} onChange={(e) => handleSplitRowChange(idx, 'mode', e.target.value)} className="w-1/2 rounded-md bg-white border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900">
                                  <option value="CASH">💵 Cash</option>
                                  <option value="UPI">📱 UPI</option>
                                  <option value="CARD">💳 Card</option>
                                </select>
                                <div className="w-1/2 relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                                  <input type="number" step="0.01" value={row.amount} onChange={(e) => handleSplitRowChange(idx, 'amount', e.target.value)} className="w-full bg-white border border-slate-200 rounded-md pl-6 pr-2 py-1 text-xs font-mono font-bold text-slate-900" required />
                                </div>
                                {splitRows.length > 1 && <button type="button" onClick={() => handleRemoveSplitRow(idx)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 size={13} /></button>}
                              </div>
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={handleAddSplitRow} className="w-full py-1.5 rounded-lg border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 text-xs font-bold flex items-center justify-center gap-1.5"><Plus size={13} /> Add Mode</button>
                        <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-bold ${isSplitBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                          <span>Total: ₹{totalSplitSum.toFixed(2)}</span>
                          <span>{isSplitBalanced ? '✅ Balanced' : `⚠️ ₹${splitDiff.toFixed(2)}`}</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <Button type="submit" variant="success" size="lg" className="w-full font-bold flex items-center justify-center gap-2" isLoading={isLoading} disabled={isSplitMode && !isSplitBalanced}>
                        <Printer size={16} /> Collect & Print
                      </Button>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" className="w-1/2 font-medium" onClick={onClose}>Cancel</Button>
                        <Button type="button" variant="primary" className="w-1/2 font-bold" isLoading={isLoading} disabled={isSplitMode && !isSplitBalanced} onClick={() => handleProcess(false)}>Collect Only</Button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4 pt-1">
                    <div className="p-4 rounded-xl bg-white border border-slate-200 text-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200"><CheckCircle2 size={24} /></div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Receipt Cleared</h4>
                      <p className="font-mono text-emerald-700 font-bold text-xs">{receipt.receiptNo}</p>
                    </div>
                    <div className="space-y-2">
                      <Button type="button" variant="success" className="w-full font-bold" onClick={() => printReceipt({ receipt, invoice, hospital: hospObj })}><Printer size={16} /> Print Receipt</Button>
                      <Button type="button" className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSendWhatsApp}><MessageCircle size={16} /> WhatsApp</Button>
                      <Button type="button" variant="outline" className="w-full font-bold" onClick={handleReset}>Done / Close</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
