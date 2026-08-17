import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';
import {
  Pill, Plus, Trash2, Receipt, CheckCircle2, ShoppingCart,
  Calculator, AlertTriangle, Sparkles, ExternalLink
} from 'lucide-react';

export const PharmacyBillingModal = ({
  isOpen,
  onClose,
  prescription,
  onSendToDoctor,
  onDispense,
  onExternalPurchase,
  isSubmitting = false,
}) => {
  const [items, setItems] = useState([]);
  const [pharmacyNotes, setPharmacyNotes] = useState('');

  useEffect(() => {
    if (prescription && isOpen) {
      const initialItems = (prescription.medicines || []).map((med) => {
        const defaultQty = Number(med.dispensedQty || med.quantity) || ((Number(med.durationDays) || 5) * 2);
        const defaultUnitPrice = Number(med.price || med.unitPrice) || 20.0;
        return {
          medicineName: med.medicineName || 'Medicine',
          genericName: med.genericName || '',
          dosageForm: med.dosageForm || 'TABLET',
          dosage: med.dosage || '1 Tablet',
          frequency: med.frequency || 'TWICE_DAILY',
          durationDays: med.durationDays || 5,
          treatmentType: med.treatmentType || 'ORAL_TAKE_HOME',
          qty: defaultQty,
          unitPrice: defaultUnitPrice,
          totalPrice: defaultQty * defaultUnitPrice,
          isCustom: false,
        };
      });

      setItems(initialItems.length > 0 ? initialItems : [
        {
          medicineName: 'Paracetamol 500mg',
          dosageForm: 'TABLET',
          qty: 10,
          unitPrice: 20.0,
          totalPrice: 200.0,
          isCustom: false,
        }
      ]);
      setPharmacyNotes(prescription.pharmacyNotes || 'Prescription verified & pricing calculated');
    }
  }, [prescription, isOpen]);

  if (!isOpen || !prescription) return null;

  const handleQtyChange = (index, val) => {
    const qty = Math.max(1, Number(val) || 1);
    setItems((prev) => {
      const u = [...prev];
      u[index].qty = qty;
      u[index].totalPrice = Math.round(qty * Number(u[index].unitPrice || 0) * 100) / 100;
      return u;
    });
  };

  const handleUnitPriceChange = (index, val) => {
    const unitPrice = Math.max(0, Number(val) || 0);
    setItems((prev) => {
      const u = [...prev];
      u[index].unitPrice = unitPrice;
      u[index].totalPrice = Math.round(Number(u[index].qty || 1) * unitPrice * 100) / 100;
      return u;
    });
  };

  const handleItemNameChange = (index, val) => {
    setItems((prev) => {
      const u = [...prev];
      u[index].medicineName = val;
      return u;
    });
  };

  const handleAddCustomItem = () => {
    setItems((prev) => [
      ...prev,
      {
        medicineName: 'Syringe 5ml / Medical Consumable',
        dosageForm: 'CONSUMABLE',
        qty: 1,
        unitPrice: 15.0,
        totalPrice: 15.0,
        isCustom: true,
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const totalMedicineCharge = items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

  const patientName = prescription.patientId
    ? `${prescription.patientId.firstName || ''} ${prescription.patientId.lastName || ''}`.trim()
    : 'Patient';
  const uhid = prescription.patientId?.uhid || prescription.uhid || 'N/A';

  const handleConfirmSendToDoctor = () => {
    onSendToDoctor({
      items,
      totalMedicineCharge,
      pharmacyNotes: pharmacyNotes.trim() || `Medicine bill ₹${totalMedicineCharge} calculated by pharmacy`,
    });
  };

  const handleConfirmDispense = () => {
    onDispense({
      items,
      totalMedicineCharge,
      pharmacyNotes: pharmacyNotes.trim() || 'Dispensed via Pharmacy FEFO',
    });
  };

  const handleConfirmExternal = () => {
    onExternalPurchase({
      isExternal: true,
      pharmacyNotes: pharmacyNotes.trim() || 'Purchased externally by patient (No Hospital Charge)',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pharmacy Pricing & Dispensing Calculator" maxWidth="max-w-3xl">
      <div className="space-y-5 text-slate-800">

        {/* Patient & Prescription Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-sm">{patientName}</span>
              <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-indigo-100 text-indigo-800">
                {uhid}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Prescription: <strong className="text-slate-700 font-mono">#{prescription.prescriptionNo}</strong> · Prescribed by Dr. {prescription.doctorId?.name || 'Consultant'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">Status</span>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
              {prescription.dispenseStatus}
            </span>
          </div>
        </div>

        {/* Itemized Medicine Calculation Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Calculator size={14} className="text-indigo-600" />
              Itemized Medicine Pricing Breakdown
            </h4>
            <button
              type="button"
              onClick={handleAddCustomItem}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus size={13} /> Add Extra Consumable / Item
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Medicine / Item Details</th>
                  <th className="p-2.5 w-24 text-center">Quantity</th>
                  <th className="p-2.5 w-28 text-right">Unit Price (₹)</th>
                  <th className="p-2.5 w-28 text-right">Total (₹)</th>
                  <th className="p-2.5 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5">
                      {item.isCustom ? (
                        <input
                          type="text"
                          value={item.medicineName}
                          onChange={(e) => handleItemNameChange(idx, e.target.value)}
                          placeholder="Item name (e.g. Syringe 5ml)"
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-bold focus:ring-1 focus:ring-indigo-500"
                        />
                      ) : (
                        <div>
                          <p className="font-extrabold text-slate-900">{item.medicineName}</p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {item.dosageForm} · {item.frequency} for {item.durationDays} days
                          </p>
                        </div>
                      )}
                    </td>

                    {/* Quantity Input */}
                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleQtyChange(idx, e.target.value)}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-center text-xs font-black text-slate-900 focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                      />
                    </td>

                    {/* Unit Price Input */}
                    <td className="p-2.5 text-right">
                      <div className="relative">
                        <span className="absolute left-2 top-1 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleUnitPriceChange(idx, e.target.value)}
                          className="w-24 pl-5 pr-2 py-1 border border-slate-300 rounded text-right text-xs font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                        />
                      </div>
                    </td>

                    {/* Line Total */}
                    <td className="p-2.5 text-right font-black text-indigo-700 font-mono text-sm">
                      ₹{item.totalPrice.toFixed(2)}
                    </td>

                    {/* Remove Action */}
                    <td className="p-2.5 text-center">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                          title="Remove row"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Calculation Summary Banner */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-indigo-50 via-indigo-50/80 to-purple-50 border border-indigo-200 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              ₹
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">Auto-Calculated Medicine Total</p>
              <p className="text-[11px] text-slate-500 font-medium">
                {items.length} prescribed items · {totalQty} total units calculated
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-indigo-900 font-extrabold block">Payable Total</span>
            <span className="text-2xl font-black text-indigo-700 font-mono tracking-tight">
              {formatCurrency(totalMedicineCharge)}
            </span>
          </div>
        </div>

        {/* Pharmacy Remarks / Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Pharmacy Notes / Dispense Remarks:
          </label>
          <input
            type="text"
            value={pharmacyNotes}
            onChange={(e) => setPharmacyNotes(e.target.value)}
            placeholder="e.g. Dispensed generic equivalent / dosage explained to patient"
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleConfirmExternal}
            disabled={isSubmitting}
            className="text-amber-800 border-amber-300 hover:bg-amber-50 font-bold gap-1.5"
            title="Mark as purchased outside without hospital charges"
          >
            <ShoppingCart size={13} />
            External Purchase (₹0 Charge)
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmSendToDoctor}
              isLoading={isSubmitting}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 font-extrabold shadow-xs"
              title="Send itemized calculated bill to Doctor for inclusion in patient consultation final invoice"
            >
              <Receipt size={14} />
              Send Bill to Doctor (₹{totalMedicineCharge.toFixed(2)})
            </Button>
          </div>
        </div>

      </div>
    </Modal>
  );
};
