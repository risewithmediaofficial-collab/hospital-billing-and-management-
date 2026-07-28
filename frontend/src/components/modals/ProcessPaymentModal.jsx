import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, CreditCard, CheckCircle, Printer } from 'lucide-react';
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

  const handleReset = () => {
    setReceipt(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="max-w-md w-full glass-panel rounded-2xl p-6 relative border border-emerald-500/30">
        <button onClick={handleReset} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X size={20} />
        </button>

        {receipt ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle size={28} />
            </div>
            <h3 className="text-xl font-bold text-white">Payment Received!</h3>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs space-y-1">
              <p><span className="text-slate-400">Receipt No:</span> <span className="font-mono font-bold text-emerald-400">{receipt.receiptNo}</span></p>
              <p><span className="text-slate-400">Amount Paid:</span> <span className="font-bold text-white">{formatCurrency(receipt.amountPaid)}</span></p>
              <p><span className="text-slate-400">Payment Mode:</span> <span className="font-bold text-sky-400">{receipt.paymentMode}</span></p>
              <p><span className="text-slate-400">Transaction Ref:</span> <span className="text-slate-300">{receipt.transactionRef}</span></p>
            </div>
            <Button variant="primary" className="w-full font-bold flex items-center justify-center gap-2" onClick={handleReset}>
              <Printer size={18} />
              Print Thermal Receipt (80mm)
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="text-emerald-400" size={22} />
              <h3 className="text-lg font-bold text-white">Collect Payment & Print Receipt</h3>
            </div>

            {error && <div className="p-2.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>}

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
              <p><span className="text-slate-400">Invoice No:</span> <span className="font-bold text-white">{invoice.invoiceNo}</span></p>
              <p><span className="text-slate-400">Patient:</span> <span className="font-bold text-sky-400">{invoice.patientId?.firstName} {invoice.patientId?.lastName}</span></p>
              <p><span className="text-slate-400">Total Invoice Amount:</span> <span className="font-bold text-white">{formatCurrency(invoice.grandTotal)}</span></p>
            </div>

            <Input
              label="Payment Amount ($)"
              type="number"
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              required
              autoComplete="off"
            />

            <div>
              <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[10px]">Payment Tender</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full glass-input rounded-lg p-2 text-xs text-white"
              >
                <option value="CASH" className="bg-slate-900">💵 Cash</option>
                <option value="UPI" className="bg-slate-900">📱 UPI / QR Code</option>
                <option value="CREDIT_CARD" className="bg-slate-900">💳 Credit Card</option>
                <option value="DEBIT_CARD" className="bg-slate-900">💳 Debit Card</option>
                <option value="INSURANCE" className="bg-slate-900">🏥 TPA / Insurance Claim</option>
                <option value="SPLIT" className="bg-slate-900">⚡ Split Payment (Cash + Digital)</option>
              </select>
            </div>

            <Input
              label="Transaction Ref / Reference #"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              required
              autoComplete="off"
            />

            <div className="pt-2 flex gap-2">
              <Button type="button" variant="outline" className="w-1/2" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="success" className="w-1/2 font-bold" isLoading={isLoading}>
                Collect & Issue
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
