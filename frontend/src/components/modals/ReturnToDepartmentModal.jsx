import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  RotateCcw,
  MessageSquare,
  Pill,
  TestTube,
  FileCheck2,
  Stethoscope,
  AlertTriangle,
  Send,
  Info
} from 'lucide-react';

const QUICK_TEMPLATES = {
  PHARMACY: [
    'Medicine unit price is ₹0 or missing. Please verify selling price and re-dispense.',
    'Discrepancy in prescribed quantity vs dispensed units. Please review and re-calculate.',
    'Patient requested to change medicine brand/batch. Please re-open prescription.',
    'Stock batch pricing needs adjustment before payment collection.',
  ],
  LABORATORY: [
    'Lab investigation tariff rate discrepancy. Please verify and re-submit charge.',
    'Sample collection was cancelled or postponed by patient.',
    'Additional test added by consultant requires price recalculation.',
  ],
  RADIOLOGY: [
    'Imaging scan charge verification needed before cashier settlement.',
    'Scan was cancelled or rescheduled.',
  ],
  DOCTOR: [
    'Consultation fee waiver or discount clarification requested.',
    'Doctor prescription review requested for patient complaint.',
  ],
};

export const ReturnToDepartmentModal = ({
  isOpen,
  onClose,
  invoice,
  onConfirmReturn,
  isSubmitting = false,
}) => {
  const [department, setDepartment] = useState('PHARMACY');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customNote, setCustomNote] = useState('');

  if (!isOpen || !invoice) return null;

  const patient = invoice.patientId || {};
  const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient';
  const uhid = patient.uhid || 'N/A';

  const templates = QUICK_TEMPLATES[department] || [];

  const handleTemplateSelect = (text) => {
    setSelectedTemplate(text);
    setCustomNote(text);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalNote = customNote.trim() || selectedTemplate || 'Returned from Central Billing for review / price correction';
    onConfirmReturn({
      invoiceId: invoice._id,
      targetDepartment: department,
      reason: selectedTemplate || 'Bill Clarification / Price Correction',
      note: finalNote,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Return to Department / Request Clarification"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Patient Summary Banner */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
          <div>
            <p className="font-extrabold text-slate-900 text-sm">{patientName}</p>
            <p className="text-[11px] font-mono text-indigo-600">UHID: {uhid} • Invoice: {invoice.invoiceNo}</p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            {invoice.status || 'UNPAID'}
          </span>
        </div>

        {/* Target Department Selection */}
        <div>
          <label className="font-bold text-slate-700 block mb-1.5">
            Select Destination Department to Send Query & Return:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'PHARMACY', label: 'Pharmacy Desk', icon: Pill, color: 'text-purple-600' },
              { id: 'LABORATORY', label: 'Laboratory Desk', icon: TestTube, color: 'text-amber-600' },
              { id: 'RADIOLOGY', label: 'Radiology Desk', icon: FileCheck2, color: 'text-sky-600' },
              { id: 'DOCTOR', label: 'Attending Doctor', icon: Stethoscope, color: 'text-emerald-600' },
            ].map((dept) => {
              const Icon = dept.icon;
              const isSelected = department === dept.id;
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => {
                    setDepartment(dept.id);
                    setSelectedTemplate('');
                    setCustomNote('');
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Icon size={16} className={dept.color} />
                  <span className="text-xs">{dept.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Workflow Info Alert */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-blue-900">
          <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            {department === 'PHARMACY' && (
              <>
                Returning to <strong>Pharmacy Desk</strong> will move this prescription back into the <strong>Pending Dispense Queue</strong>. The Pharmacist will see your query, fix the batch price, and re-dispense it back to Central Billing.
              </>
            )}
            {department === 'LABORATORY' && (
              <>
                Sending to <strong>Laboratory Desk</strong> will notify the Lab Technologist with your clarification message.
              </>
            )}
            {department === 'RADIOLOGY' && (
              <>
                Sending to <strong>Radiology Desk</strong> will notify the Radiologist with your clarification message.
              </>
            )}
            {department === 'DOCTOR' && (
              <>
                Sending to <strong>Doctor Desk</strong> will alert the attending consultant in their <strong>Department Responses</strong> tab.
              </>
            )}
          </p>
        </div>

        {/* Quick Templates */}
        <div>
          <label className="font-bold text-slate-700 block mb-1">Quick Clarification Reasons:</label>
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {templates.map((tpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleTemplateSelect(tpl)}
                className={`w-full p-2 text-left text-[11px] rounded-lg border transition-colors cursor-pointer ${
                  selectedTemplate === tpl
                    ? 'bg-indigo-600 text-white border-indigo-600 font-medium'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Message / Query Notes */}
        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Detailed Query / Instructions for {department === 'PHARMACY' ? 'Pharmacist' : department === 'DOCTOR' ? 'Doctor' : 'Department Staff'} *
          </label>
          <textarea
            required
            rows={3}
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Type your message or instruction here..."
            className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-white"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !customNote.trim()}
            className="flex items-center gap-1.5"
          >
            {isSubmitting ? (
              'Sending...'
            ) : (
              <>
                <RotateCcw size={14} /> Send Query & Return Item
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
