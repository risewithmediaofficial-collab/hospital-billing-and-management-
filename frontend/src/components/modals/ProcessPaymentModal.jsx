import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, CreditCard, CheckCircle, Printer, AlertCircle, MessageCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const ProcessPaymentModal = ({ isOpen, onClose, invoice, onSuccess }) => {
  useScrollLock(isOpen);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('CARD');
  const [transactionRef, setTransactionRef] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && invoice) {
      setAmountPaid(invoice.balanceAmount || invoice.grandTotal || '');
      setPaymentMode('CARD');
      setTransactionRef(`TXN-${Date.now().toString().slice(-6)}`);
      setReceipt(null);
      setError(null);
    }
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosClient.post('/billing/payments/receipts', {
        invoiceId: invoice._id,
        amountPaid: Number(amountPaid),
        paymentMode,
        transactionRef,
      });
      setReceipt(response.data.receipt);
      if (onSuccess) onSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.error?.message || 'Failed to process payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendWhatsApp = () => {
    const rawPhone = invoice?.patientId?.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    const patName = `${invoice?.patientId?.firstName || ''} ${invoice?.patientId?.lastName || ''}`.trim() || 'Patient';
    const msg = `*Hospital Billing Receipt*\n\nDear ${patName},\nThank you for visiting our Healthcare Facility.\n\n*Receipt Summary:*\n• Receipt No: ${receipt?.receiptNo || 'REC-PAID'}\n• Invoice No: ${invoice?.invoiceNo || 'INV'}\n• UHID: ${invoice?.patientId?.uhid || 'N/A'}\n• Amount Paid: ₹${receipt?.amountPaid || invoice?.grandTotal}\n• Payment Mode: ${receipt?.paymentMode || 'CASH'}\n• Date: ${new Date().toLocaleDateString()}\n\nThank you for choosing our hospital services!`;
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/${cleanPhone.length >= 10 ? cleanPhone : ''}?text=${encoded}`, '_blank');
  };

  const handleReset = () => { setReceipt(null); onClose(); };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-container max-w-xl" onClick={(e) => e.stopPropagation()}>

        {/* Sticky Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
              <CreditCard size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">Collect Payment & Issue Receipt</h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate">Invoice: <span className="font-mono font-bold text-slate-700">{invoice.invoiceNo}</span></p>
            </div>
          </div>
          <button onClick={handleReset} className="modal-close-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="modal-body">
          {receipt ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle size={30} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Payment Received!</h3>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Receipt No:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">{receipt.receiptNo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-black text-slate-900 text-base">{formatCurrency(receipt.amountPaid)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="font-bold text-indigo-700">{receipt.paymentMode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Transaction Ref:</span>
                  <span className="font-mono text-slate-700">{receipt.transactionRef}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <Button variant="success" className="w-full font-bold flex items-center justify-center gap-1.5" onClick={handleReset}>
                  <Printer size={16} /> Print Thermal Receipt
                </Button>
                <Button
                  type="button"
                  className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5"
                  onClick={handleSendWhatsApp}
                >
                  <MessageCircle size={16} /> Send via WhatsApp
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 text-xs">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              {/* Invoice Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Invoice No:</span>
                  <span className="font-bold text-slate-900 font-mono">{invoice.invoiceNo}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-bold text-indigo-700">{invoice.patientId?.firstName} {invoice.patientId?.lastName}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-1.5">
                  <span className="text-slate-600 font-bold">Total Invoice Amount:</span>
                  <span className="font-black text-slate-900 text-base">{formatCurrency(invoice.grandTotal)}</span>
                </div>
              </div>

              <Input
                label="Payment Amount"
                type="number"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                required
                autoComplete="off"
              />

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Payment Tender</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full glass-input rounded-lg px-3.5 py-2 text-sm text-slate-900 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                >
                  <option value="CASH">💵 Cash</option>
                  <option value="UPI">📱 UPI / QR Code</option>
                  <option value="CREDIT_CARD">💳 Credit Card</option>
                  <option value="DEBIT_CARD">💳 Debit Card</option>
                  <option value="INSURANCE">🏥 TPA / Insurance Claim</option>
                  <option value="SPLIT">⚡ Split Payment (Cash + Digital)</option>
                </select>
              </div>

              <Input
                label="Transaction Ref / Reference #"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                required
                autoComplete="off"
              />

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="w-1/2" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="success" className="w-1/2 font-bold" isLoading={isLoading}>
                  Collect & Issue Receipt
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
