import React, { useRef } from 'react';
import { Modal } from '../ui/Modal';
import {
  Printer, MessageCircle, Building2, CheckCircle2, ShieldCheck,
  Stethoscope, Phone, Mail, MapPin, Receipt as ReceiptIcon
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { printReceipt } from '../../utils/printReceipt';

export const OfficialReceiptModal = ({
  isOpen,
  onClose,
  receipt,
  invoice,
  hospital,
}) => {
  const receiptRef = useRef(null);

  if (!isOpen || (!receipt && !invoice)) return null;

  // Extract patient context
  const pat = receipt?.patientId || invoice?.patientId || receipt?.invoiceId?.patientId || {};
  const patName = `${pat.firstName || ''} ${pat.lastName || ''}`.trim() || 'Walk-in Patient';
  const patUhid = pat.uhid || invoice?.patientUhid || 'N/A';
  const patPhone = pat.phone || 'N/A';

  // Extract doctor context
  const docObj = receipt?.invoiceId?.doctorId || invoice?.doctorId || receipt?.invoiceId?.consultation?.doctorId || invoice?.consultation?.doctorId;
  const rawDocName = receipt?.invoiceId?.doctorName || invoice?.doctorName || docObj?.name;
  const docName = rawDocName ? (rawDocName.startsWith('Dr.') ? rawDocName : `Dr. ${rawDocName}`) : 'Dr. Test Doctor';
  const docSpecialty = docObj?.specialization || 'Consultant Specialist';

  // Extract hospital context & full address
  const hospObj = receipt?.hospitalId || hospital || invoice?.hospitalId || {};
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

  // Extract invoice & items
  const invData = receipt?.invoiceId || invoice || {};
  const invNo = invData.invoiceNo || 'INV-TH-2026-00001';
  const rcNo = receipt?.receiptNo || 'REC-2026-00001';
  const paymentDate = receipt?.createdAt ? new Date(receipt.createdAt) : new Date();
  const tenderMode = receipt?.paymentMode || 'CARD';
  const paidAmount = receipt?.amountPaid || invData.paidAmount || invData.grandTotal || 0;
  const items = invData.items && invData.items.length > 0 ? invData.items : [
    { description: 'OPD General Consultation Fee', qty: 1, unitPrice: paidAmount, totalPrice: paidAmount }
  ];

  const subtotal = invData.subtotal || items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
  const discount = invData.discountAmount || 0;
  const grandTotal = invData.grandTotal || subtotal - discount;
  const balanceDue = Math.max(0, (invData.balanceAmount !== undefined ? invData.balanceAmount : grandTotal - paidAmount));

  // Extract follow up date
  const rawFollowUp = receipt?.followUpDate ||
    invData?.followUpDate ||
    invData?.consultation?.followUpDate ||
    receipt?.invoiceId?.consultation?.followUpDate ||
    pat?.followUpDate ||
    null;

  const followUpDateFormatted = rawFollowUp ? new Date(rawFollowUp).toLocaleDateString([], {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }) : null;

  const handlePrint = () => {
    printReceipt({ receipt, invoice, hospital, followUpDate: followUpDateFormatted });
  };

  const handleSendWhatsApp = () => {
    const rawClean = patPhone.replace(/[^0-9]/g, '');
    const msg = `*${hospName} — Official Bill & Receipt*\n\n` +
      `Dear ${patName},\n` +
      `Thank you for visiting ${hospName}.\n\n` +
      `*Receipt Details:*\n` +
      `• Receipt No: ${rcNo}\n` +
      `• Invoice No: ${invNo}\n` +
      `• UHID: ${patUhid}\n` +
      `• Mobile: ${patPhone}\n` +
      `• Attending Doctor: ${docName}\n` +
      (followUpDateFormatted ? `• Next Follow-up Visit: ${followUpDateFormatted}\n` : '') +
      `• Tender Mode: ${tenderMode}\n` +
      `• Amount Paid: ${formatCurrency(paidAmount)}\n` +
      `• Date: ${paymentDate.toLocaleString()}\n\n` +
      `Address: ${formattedAddress}\n` +
      `For queries: ${hospPhone}\n\n` +
      `Thank you for placing your trust in our healthcare services!`;
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/${rawClean.length >= 10 ? rawClean : ''}?text=${encoded}`, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Medical Receipt & Bill"
      subtitle="Executive 80mm / A4 Thermal Printable Patient Bill"
      icon={ReceiptIcon}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* PRINTABLE RECEIPT CARD */}
        <div
          ref={receiptRef}
          id="printable-official-bill"
          className="printable-receipt-card bg-white text-slate-900 border border-slate-300 rounded-2xl p-6 shadow-xs font-sans text-xs space-y-4"
        >
          {/* HEADER: Hospital Name & Address */}
          <div className="text-center border-b-2 border-slate-800 pb-3 space-y-1">
            <div className="flex items-center justify-center gap-2">
              <Building2 size={20} className="text-indigo-600 shrink-0" />
              <h2 className="text-xl font-extrabold tracking-tight text-slate-950 uppercase">
                {hospName}
              </h2>
            </div>
            <p className="text-[11px] font-medium text-slate-700">
              {formattedAddress}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              📞 Phone: {hospPhone} &nbsp;|&nbsp; ✉️ Email: {hospEmail}
            </p>
            <div className="inline-block mt-1 px-3 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[10px] font-black uppercase tracking-wider text-slate-800">
              Official Medical Cash Receipt & Treatment Bill
            </div>
          </div>

          {/* PATIENT & BILL METADATA GRID */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Patient:</span>
              <span className="font-bold text-slate-900">{patName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Receipt No:</span>
              <span className="font-mono font-bold text-indigo-700">{rcNo}</span>
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
              <span className="text-slate-800">{paymentDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>

            <div className="flex justify-between border-t border-slate-200 pt-1">
              <span className="text-slate-500 font-medium">Attending Doctor:</span>
              <span className="font-bold text-slate-900">{docName}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1">
              <span className="text-slate-500 font-medium">Tender Mode:</span>
              <span className="font-bold text-indigo-700 uppercase">{tenderMode}</span>
            </div>

            {followUpDateFormatted && (
              <div className="flex justify-between items-center col-span-2 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 mt-1">
                <span className="text-indigo-900 font-bold text-[11px] flex items-center gap-1.5">
                  <span>📅</span> Next Recommended Follow-Up Visit:
                </span>
                <span className="font-mono font-black text-indigo-700 text-xs">
                  {followUpDateFormatted}
                </span>
              </div>
            )}
          </div>

          {/* TREATMENT ITEM BREAKDOWN TABLE */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="font-extrabold uppercase text-[11px] text-slate-900 tracking-wider">
                Treatment Item Breakdown
              </p>
              <span className="text-[10px] text-slate-500">({items.length} Billable Services)</span>
            </div>

            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Service / Treatment Description</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-900">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="p-2.5 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                      <td className="p-2.5 font-medium">
                        {it.description}
                        {it.category && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            {it.category}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-mono">{it.qty || 1}x</td>
                      <td className="p-2.5 text-right font-mono text-slate-700">{formatCurrency(it.unitPrice)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-950">{formatCurrency(it.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FINANCIAL SUMMARY TOTALS */}
          <div className="flex justify-end pt-1">
            <div className="w-full sm:w-72 space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Gross Subtotal:</span>
                <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Authorized Discount:</span>
                  <span className="font-mono font-medium">— {formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                <span>Grand Total:</span>
                <span className="font-mono">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-extrabold text-xs">
                <span>Amount Paid:</span>
                <span className="font-mono">{formatCurrency(paidAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Balance Remaining:</span>
                <span className="font-mono">{formatCurrency(balanceDue)}</span>
              </div>
            </div>
          </div>

          {/* FOOTER: SEAL & AUTHORIZED SIGNATURE SPACE */}
          <div className="pt-6 border-t-2 border-slate-800 grid grid-cols-2 items-end gap-4">
            <div className="space-y-1 text-[10px] text-slate-500">
              <div className="w-20 h-20 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-center p-1 text-[9px] text-slate-400 bg-slate-50/50">
                Hospital Seal / Stamp
              </div>
              <p className="font-medium">Thank you for choosing {hospName}.</p>
              <p className="text-[9px] text-slate-400">Authentic computer-generated medical bill & receipt.</p>
            </div>

            <div className="text-right space-y-1">
              <div className="h-10"></div>
              <div className="border-t border-slate-800 w-44 ml-auto pt-1">
                <p className="font-extrabold text-[11px] text-slate-900 uppercase tracking-wider">
                  Authorized Signatory
                </p>
                <p className="text-[9px] text-slate-500">Cashier / Billing In-Charge</p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-dashed border-slate-300 flex items-center justify-between text-[9px] text-slate-500 font-sans">
            <span>Powered by <strong className="text-slate-900 font-bold">Risewithmedia.com</strong></span>
            <span className="font-mono font-semibold text-indigo-600">hms.risewithmedia.com</span>
          </div>
        </div>

        {/* MODAL ACTION BUTTONS (Hidden during print) */}
        <div className="no-print grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
          <button
            type="button"
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            onClick={handlePrint}
          >
            <Printer size={16} className="text-slate-700" />
            <span>Print Official Receipt</span>
          </button>

          <button
            type="button"
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            onClick={handleSendWhatsApp}
          >
            <MessageCircle size={16} className="text-white fill-white/20" />
            <span>Send via WhatsApp</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
