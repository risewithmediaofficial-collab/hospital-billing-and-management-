import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import {
  X, CreditCard, CheckCircle, Printer, AlertCircle, MessageCircle,
  Building2, Receipt, ArrowRight, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { useDepartmentNotificationStore } from '../../store/departmentNotificationStore';
import { printReceipt } from '../../utils/printReceipt';

export const ProcessPaymentModal = ({ isOpen, onClose, invoice, onSuccess }) => {
  const resolvePending = useDepartmentNotificationStore((state) => state.resolvePending);
  useScrollLock(isOpen);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('CARD');
  const [transactionRef, setTransactionRef] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && invoice) {
      setAmountPaid(String(invoice.balanceAmount || invoice.grandTotal || ''));
      setPaymentMode('CARD');
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
    addrObj?.postalCode ? `PIN: ${addrObj.postalCode}` : 'PIN: 600001'
  ].filter(Boolean).join(', ');

  const hospPhone = hospObj?.contactPhone || '6380140927';
  const hospEmail = hospObj?.contactEmail || 'billing@testhospital.com';

  const invNo = invoice?.invoiceNo || 'INV-TH-2026-00001';
  const rcNo = receipt?.receiptNo || 'PENDING COLLECTION';
  const paymentDate = receipt?.createdAt ? new Date(receipt.createdAt) : new Date();
  const currentTender = receipt?.paymentMode || paymentMode;
  const currentAmountPaid = receipt ? receipt.amountPaid : (Number(amountPaid) || invoice.grandTotal || 0);

  const items = invoice?.items && invoice.items.length > 0 ? invoice.items : [
    { description: 'OPD General Consultation Fee', qty: 1, unitPrice: invoice.grandTotal, totalPrice: invoice.grandTotal }
  ];

  const subtotal = invoice?.subtotal || items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
  const discount = invoice?.discountAmount || 0;
  const grandTotal = invoice?.grandTotal || (subtotal - discount);
  const balanceDue = Math.max(0, grandTotal - currentAmountPaid);

  const handleProcess = async (autoPrint = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosClient.post('/billing/payments/receipts', {
        invoiceId: invoice._id,
        amountPaid: Number(amountPaid),
        paymentMode,
        transactionRef,
      });

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
      setError(err.response?.data?.error?.message || err.error?.message || 'Failed to process payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendWhatsApp = () => {
    const rawClean = patPhone.replace(/[^0-9]/g, '');
    const msg = `*${hospName} — Official Bill & Receipt*\n\n` +
      `Dear ${patName},\n` +
      `Thank you for visiting ${hospName}.\n\n` +
      `*Receipt Details:*\n` +
      `• Receipt No: ${receipt?.receiptNo || 'REC-PAID'}\n` +
      `• Invoice No: ${invNo}\n` +
      `• UHID: ${patUhid}\n` +
      `• Mobile: ${patPhone}\n` +
      `• Attending Doctor: ${docName}\n` +
      `• Tender Mode: ${receipt?.paymentMode || paymentMode}\n` +
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
                {receipt ? 'Official Payment Receipt & Cleared Bill' : 'Collect Payment & Preview Bill'}
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
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  className="font-bold flex items-center gap-1.5"
                  onClick={() => printReceipt({ receipt, invoice, hospital: hospObj })}
                >
                  <Printer size={14} /> Print Receipt
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                  onClick={handleSendWhatsApp}
                >
                  <MessageCircle size={14} /> WhatsApp
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: LIVE OFFICIAL BILL PREVIEW (7 Cols) */}
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

              {/* PRINTABLE BILL CONTAINER */}
              <div
                id="printable-official-bill"
                className="printable-receipt-card bg-white text-slate-900 border border-slate-300 rounded-2xl p-5 shadow-xs font-sans text-xs space-y-3.5"
              >
                {/* HEADER: Hospital Name & Address */}
                <div className="text-center border-b-2 border-slate-800 pb-2.5 space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <Building2 size={18} className="text-indigo-600 shrink-0" />
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-950 uppercase">
                      {hospName}
                    </h2>
                  </div>
                  <p className="text-[11px] font-medium text-slate-700">
                    {formattedAddress}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Phone: {hospPhone} &nbsp;|&nbsp; Email: {hospEmail}
                  </p>
                  <div className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[9px] font-black uppercase tracking-wider text-slate-800">
                    Official Medical Cash Receipt & Treatment Bill
                  </div>
                </div>

                {/* PATIENT & BILL METADATA */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Patient:</span>
                    <span className="font-bold text-slate-900">{patName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Receipt No:</span>
                    <span className={`font-mono font-bold ${receipt ? 'text-indigo-700' : 'text-slate-500'}`}>
                      {rcNo}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">UHID:</span>
                    <span className="font-mono font-bold text-slate-900">{patUhid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Invoice No:</span>
                    <span className="font-mono font-bold text-slate-900">{invNo}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Mobile Phone:</span>
                    <span className="font-mono text-slate-800">{patPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Date & Time:</span>
                    <span className="text-slate-800">
                      {paymentDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-slate-200 pt-1">
                    <span className="text-slate-500 font-medium">Attending Doctor:</span>
                    <span className="font-bold text-slate-900">{docName}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1">
                    <span className="text-slate-500 font-medium">Tender Mode:</span>
                    <span className="font-bold text-indigo-700 uppercase">{currentTender}</span>
                  </div>
                </div>

                {/* TREATMENT ITEM BREAKDOWN */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-extrabold uppercase text-[10px] text-slate-900 tracking-wider">
                      Treatment Item Breakdown
                    </p>
                    <span className="text-[10px] text-slate-500">({items.length} Services)</span>
                  </div>

                  <div className="border border-slate-300 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 uppercase text-[9px] font-bold border-b border-slate-300">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">Treatment / Service</th>
                          <th className="p-2 text-center">Qty</th>
                          <th className="p-2 text-right">Unit Price</th>
                          <th className="p-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-900">
                        {items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="p-2 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                            <td className="p-2 font-medium">
                              {it.description}
                              {it.category && (
                                <span className="ml-1 px-1 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  {it.category}
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-center font-mono">{it.qty || 1}x</td>
                            <td className="p-2 text-right font-mono text-slate-700">{formatCurrency(it.unitPrice)}</td>
                            <td className="p-2 text-right font-mono font-bold text-slate-950">{formatCurrency(it.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TOTALS SUMMARY */}
                <div className="flex justify-end pt-1">
                  <div className="w-full sm:w-64 space-y-1 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-amber-600">
                        <span>Discount:</span>
                        <span className="font-mono font-medium">— {formatCurrency(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                      <span>Grand Total:</span>
                      <span className="font-mono">{formatCurrency(grandTotal)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-extrabold">
                      <span>Amount Paid:</span>
                      <span className="font-mono">{formatCurrency(currentAmountPaid)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Balance Due:</span>
                      <span className="font-mono">{formatCurrency(balanceDue)}</span>
                    </div>
                  </div>
                </div>

                {/* FOOTER: SEAL & SIGNATURE */}
                <div className="pt-4 border-t-2 border-slate-800 grid grid-cols-2 items-end gap-3">
                  <div className="space-y-1 text-[9px] text-slate-500">
                    <div className="w-16 h-16 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-center p-1 text-[8px] text-slate-400 bg-slate-50/50">
                      Hospital Seal / Stamp
                    </div>
                    <p className="font-medium">Thank you for your visit.</p>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="h-6"></div>
                    <div className="border-t border-slate-800 w-36 ml-auto pt-1">
                      <p className="font-extrabold text-[10px] text-slate-900 uppercase tracking-wider">
                        Authorized Signatory
                      </p>
                      <p className="text-[8px] text-slate-500">Cashier / Billing Desk</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-dashed border-slate-300 flex items-center justify-between text-[8px] text-slate-500 font-sans">
                  <span>Powered by <strong className="text-slate-900 font-bold">Risewithmedia.com</strong></span>
                  <span className="font-mono font-semibold text-indigo-600">hms.risewithmedia.com</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: CASHIER PAYMENT DESK (5 Cols) */}
            <div className="lg:col-span-5 no-print">
              <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <CreditCard size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Payment Collection</h4>
                      <p className="text-[10px] text-slate-500">Select tender & confirm receipt</p>
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
                    <Input
                      label="Payment Amount (₹)"
                      type="number"
                      step="0.01"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      required
                      autoComplete="off"
                    />

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                        Payment Tender Mode
                      </label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                      >
                        <option value="CARD">Credit / Debit Card</option>
                        <option value="CASH">Cash at Counter</option>
                        <option value="UPI">UPI / QR Code</option>
                        <option value="INSURANCE">TPA / Insurance Claim</option>
                        <option value="SPLIT">Split Payment (Cash + Digital)</option>
                      </select>
                    </div>

                    <Input
                      label="Transaction Reference / Note"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      required
                      autoComplete="off"
                    />

                    {/* Quick Tender Mode Buttons */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Quick Select Tender:</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { mode: 'CASH', label: 'Cash' },
                          { mode: 'CARD', label: 'Card' },
                          { mode: 'UPI', label: 'UPI' },
                        ].map((t) => (
                          <button
                            key={t.mode}
                            type="button"
                            onClick={() => setPaymentMode(t.mode)}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all ${
                              paymentMode === t.mode
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-300'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <Button
                        type="submit"
                        variant="success"
                        size="lg"
                        className="w-full font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                        isLoading={isLoading}
                      >
                        <Printer size={16} />
                        <span>Collect & Print Receipt</span>
                      </Button>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-1/2 font-medium"
                          onClick={onClose}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          className="w-1/2 font-bold"
                          isLoading={isLoading}
                          onClick={() => handleProcess(false)}
                        >
                          Collect Only
                        </Button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4 pt-1">
                    <div className="p-4 rounded-xl bg-white border border-slate-200 text-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                        <CheckCircle2 size={24} />
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Receipt Cleared</h4>
                      <p className="font-mono text-emerald-700 font-bold text-xs">{receipt.receiptNo}</p>
                    </div>

                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="success"
                        className="w-full font-bold flex items-center justify-center gap-2"
                        onClick={() => printReceipt({ receipt, invoice, hospital: hospObj })}
                      >
                        <Printer size={16} />
                        <span>Print Official Receipt</span>
                      </Button>

                      <Button
                        type="button"
                        className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2"
                        onClick={handleSendWhatsApp}
                      >
                        <MessageCircle size={16} />
                        <span>Send via WhatsApp</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full font-bold"
                        onClick={handleReset}
                      >
                        Done / Close
                      </Button>
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
