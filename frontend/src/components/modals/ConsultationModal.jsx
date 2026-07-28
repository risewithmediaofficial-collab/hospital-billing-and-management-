import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useSocket } from '../../providers/SocketProvider';
import { formatCurrency } from '../../utils/formatters';
import {
  Stethoscope,
  X,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  UserCheck,
  Calendar,
  TestTube,
  FileCheck,
  AlertTriangle,
  Receipt,
  RotateCcw,
  Check,
  Ban,
  ExternalLink,
} from 'lucide-react';

export const ConsultationModal = ({ isOpen, onClose, token, patient, onSuccess }) => {
  useScrollLock(isOpen);
  const { socket } = useSocket();

  const [chiefComplaints, setChiefComplaints] = useState('');
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [adviceToPatient, setAdviceToPatient] = useState('');

  // Doctor Fees & Charges
  const [consultationFee, setConsultationFee] = useState(150);
  const [emergencyFee, setEmergencyFee] = useState(0);
  const [doctorProcedureCharges, setDoctorProcedureCharges] = useState([]);

  // Prescriptions
  const [prescriptions, setPrescriptions] = useState([
    { medicineName: '', dosage: '1 Tablet', frequency: 'TWICE_DAILY', durationDays: 5, timing: 'AFTER_FOOD', instructions: '' },
  ]);

  // Department Orders & Reports
  const [departmentOrders, setDepartmentOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Finalization Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Action Modals (Cancel / Correction)
  const [actionOrder, setActionOrder] = useState(null);
  const [actionType, setActionType] = useState(null); // 'CANCEL' | 'CORRECTION'
  const [actionNote, setActionNote] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchDepartmentOrders = useCallback(async () => {
    const patId = patient?._id || patient?.id;
    if (!patId) return;
    setIsLoadingOrders(true);
    try {
      const res = await axiosClient.get(`/diagnostics/patient/${patId}`);
      setDepartmentOrders(res.data || []);
    } catch (err) {
      console.error('Failed to load department orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [patient]);

  useEffect(() => {
    if (isOpen && token) {
      setChiefComplaints(token.chiefComplaints || '');
      setHistoryOfPresentIllness('');
      setFollowUpDate('');
      setAdviceToPatient('');
      setConsultationFee(150);
      setEmergencyFee(0);
      setDoctorProcedureCharges([]);
      setPrescriptions([
        { medicineName: '', dosage: '1 Tablet', frequency: 'TWICE_DAILY', durationDays: 5, timing: 'AFTER_FOOD', instructions: '' },
      ]);
      setErrorMsg(null);
      setShowConfirmModal(false);
      fetchDepartmentOrders();
    }
  }, [isOpen, token, fetchDepartmentOrders]);

  // Socket real-time updates for department reports & status changes
  useEffect(() => {
    if (!socket || !isOpen) return;

    const handleUpdate = (data) => {
      const patId = patient?._id || patient?.id;
      if (data.patientId === patId || data.patientId?._id === patId) {
        fetchDepartmentOrders();
      }
    };

    socket.on('investigation:status_updated', handleUpdate);
    socket.on('diagnostics:report_ready', handleUpdate);

    return () => {
      socket.off('investigation:status_updated', handleUpdate);
      socket.off('diagnostics:report_ready', handleUpdate);
    };
  }, [socket, isOpen, patient, fetchDepartmentOrders]);

  if (!isOpen || !token || !patient) return null;

  // Pending validation check
  const pendingOrders = departmentOrders.filter(
    (ord) =>
      ['REQUESTED', 'DEPARTMENT_RECEIVED', 'ACCEPTED', 'IN_PROGRESS'].includes(ord.status) &&
      ord.chargeStatus !== 'CANCELLED'
  );
  const hasPendingOrders = pendingOrders.length > 0;

  // Department Charges sum
  const completedDeptOrders = departmentOrders.filter(
    (ord) => ['REPORT_UPLOADED', 'COMPLETED', 'DOCTOR_REVIEW'].includes(ord.status) && ord.chargeStatus !== 'CANCELLED'
  );
  const totalDepartmentCharges = completedDeptOrders.reduce(
    (sum, ord) => sum + (ord.totalDepartmentCharge || ord.price || 0),
    0
  );

  // Doctor Procedure sum
  const totalDoctorProcedureCharges = doctorProcedureCharges.reduce(
    (sum, proc) => sum + (Number(proc.amount) || 0),
    0
  );

  // Grand Total Calculation
  const grandTotal = Number(consultationFee || 0) + Number(emergencyFee || 0) + totalDoctorProcedureCharges + totalDepartmentCharges;

  // Handlers for Medicine Rows
  const handleAddMedicineRow = () => {
    setPrescriptions((prev) => [
      ...prev,
      { medicineName: '', dosage: '1 Tablet', frequency: 'TWICE_DAILY', durationDays: 5, timing: 'AFTER_FOOD', instructions: '' },
    ]);
  };

  const handleRemoveMedicineRow = (index) => {
    setPrescriptions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMedicineChange = (index, field, value) => {
    setPrescriptions((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Handlers for Doctor Procedure Rows
  const handleAddProcedureRow = () => {
    setDoctorProcedureCharges((prev) => [...prev, { description: '', amount: 100 }]);
  };

  const handleRemoveProcedureRow = (index) => {
    setDoctorProcedureCharges((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleProcedureChange = (index, field, value) => {
    setDoctorProcedureCharges((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Actions on Department Orders (Cancel / Correction / Approve)
  const handleCancelOrderSubmit = async () => {
    if (!actionNote.trim()) {
      alert('A mandatory cancellation reason must be provided.');
      return;
    }
    try {
      await axiosClient.post(`/diagnostics/orders/${actionOrder._id}/cancel`, {
        cancellationReason: actionNote.trim(),
      });
      setActionOrder(null);
      setActionType(null);
      setActionNote('');
      fetchDepartmentOrders();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to cancel order');
    }
  };

  const handleCorrectionSubmit = async () => {
    if (!actionNote.trim()) {
      alert('A correction note must be provided.');
      return;
    }
    try {
      await axiosClient.post(`/diagnostics/orders/${actionOrder._id}/request-correction`, {
        correctionNote: actionNote.trim(),
      });
      setActionOrder(null);
      setActionType(null);
      setActionNote('');
      fetchDepartmentOrders();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to request correction');
    }
  };

  const handleApproveCharge = async (orderId) => {
    try {
      await axiosClient.post(`/diagnostics/orders/${orderId}/approve-charge`);
      fetchDepartmentOrders();
    } catch (err) {
      console.error('Failed to approve charge:', err);
    }
  };

  // Final submit handler after confirmation
  const handleFinalizeConfirmed = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    const validPrescriptions = prescriptions.filter((p) => p.medicineName.trim() !== '');

    try {
      await axiosClient.post('/emr/consultations', {
        appointmentId: token._id,
        patientId: patient._id || patient.id,
        chiefComplaints,
        historyOfPresentIllness,
        prescriptions: validPrescriptions,
        consultationFee: Number(consultationFee) || 150,
        emergencyFee: Number(emergencyFee) || 0,
        doctorProcedureCharges,
        followUpDate: followUpDate || undefined,
        adviceToPatient,
      });

      await axiosClient.patch(`/appointments/tokens/${token._id}/status`, {
        status: 'COMPLETED',
      });

      setShowConfirmModal(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setShowConfirmModal(false);
      setErrorMsg(err.response?.data?.error?.message || err.error?.message || err.message || 'Failed to finalize consultation record');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="max-w-4xl w-full glass-panel rounded-2xl p-6 relative border border-emerald-500/30 my-auto max-h-[88vh] overflow-y-auto space-y-4 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 transition-all z-20"
          title="Cancel / Close Consultation"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Stethoscope size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Clinical Consultation & Department Charges Review Desk</h3>
            <p className="text-[11px] text-slate-400">
              Patient: <span className="text-sky-400 font-bold">{patient.firstName} {patient.lastName}</span> (UHID: <span className="font-mono text-white">{patient.uhid}</span> • Token #{token.tokenNumber})
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2 text-xs">
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* Pending Department Orders Error Banner */}
        {hasPendingOrders && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-start gap-2 text-xs animate-pulse">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">Pending Department Requests Validation Warning</p>
              <p className="mt-0.5">
                One or more department requests are still pending ({pendingOrders.length} pending: {pendingOrders.map((p) => p.testName).join(', ')}). Complete all required services and charges before finalizing the bill.
              </p>
            </div>
          </div>
        )}

        {/* 1. Department Reports & Submitted Charges */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="font-bold text-sky-400 flex items-center gap-1.5 text-sm">
              <TestTube size={16} /> Department Reports & Submitted Charges ({departmentOrders.length})
            </span>
            <span className="text-[11px] text-slate-400">
              Total Dept Charges: <strong className="text-emerald-400 font-mono">{formatCurrency(totalDepartmentCharges)}</strong>
            </span>
          </div>

          {isLoadingOrders ? (
            <p className="text-slate-400 text-center py-3">Loading department reports...</p>
          ) : departmentOrders.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {departmentOrders.map((ord) => (
                <div key={ord._id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">
                      [{ord.testCategory}] {ord.testName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                        ord.status === 'COMPLETED' || ord.status === 'REPORT_UPLOADED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : ord.chargeStatus === 'CANCELLED'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {ord.chargeStatus === 'CANCELLED' ? 'CANCELLED' : ord.status}
                      </span>
                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        {formatCurrency(ord.totalDepartmentCharge || ord.price || 0)}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Technician: <span className="text-slate-200">{ord.technicianName || 'Pending'}</span> • Requested: {new Date(ord.createdAt).toLocaleTimeString()}
                  </p>

                  {ord.reportSummary && (
                    <p className="text-[11px] text-slate-300 bg-slate-900 p-1.5 rounded border border-slate-800 italic">
                      Findings: "{ord.reportSummary}"
                    </p>
                  )}

                  {ord.cancellationReason && (
                    <p className="text-[11px] text-red-400">Reason: {ord.cancellationReason}</p>
                  )}

                  {/* Actions for Doctor */}
                  {ord.chargeStatus !== 'CANCELLED' && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px]">
                      <span className="text-slate-400">Charge Status: <strong className="text-sky-400">{ord.chargeStatus || 'SUBMITTED'}</strong></span>
                      <div className="flex gap-1.5">
                        {ord.chargeStatus !== 'APPROVED' && ord.chargeStatus !== 'INCLUDED_IN_FINAL_BILL' && (
                          <button
                            type="button"
                            onClick={() => handleApproveCharge(ord._id)}
                            className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-bold border border-emerald-500/30 flex items-center gap-1"
                          >
                            <Check size={10} /> Approve Charge
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => { setActionOrder(ord); setActionType('CORRECTION'); setActionNote(''); }}
                          className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 font-bold border border-purple-500/30 flex items-center gap-1"
                        >
                          <RotateCcw size={10} /> Correction
                        </button>
                        <button
                          type="button"
                          onClick={() => { setActionOrder(ord); setActionType('CANCEL'); setActionNote(''); }}
                          className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 font-bold border border-red-500/30 flex items-center gap-1"
                        >
                          <Ban size={10} /> Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-2">No department test requests created for this visit.</p>
          )}
        </div>

        {/* 2. Doctor Consultation & Procedure Charges */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
          <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm mb-1">
            <Receipt size={16} /> Doctor Fees & Procedure Charges
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Doctor Consultation Fee (₹)</label>
              <Input
                type="number"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                className="py-1.5 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Emergency Fee / Surcharge (₹)</label>
              <Input
                type="number"
                value={emergencyFee}
                onChange={(e) => setEmergencyFee(e.target.value)}
                className="py-1.5 text-xs font-mono font-bold"
              />
            </div>
          </div>

          {/* Procedure Charges Rows */}
          <div className="pt-2">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-slate-300 font-bold text-xs">In-Clinic Procedure Charges</label>
              <Button size="xs" variant="outline" type="button" onClick={handleAddProcedureRow} className="gap-1 font-bold">
                <Plus size={12} /> Add Procedure Charge
              </Button>
            </div>
            {doctorProcedureCharges.map((proc, idx) => (
              <div key={idx} className="flex gap-2 items-center mb-1">
                <Input
                  placeholder="Procedure description (e.g. Suturing, Injection, Dressing)..."
                  value={proc.description}
                  onChange={(e) => handleProcedureChange(idx, 'description', e.target.value)}
                  className="py-1 text-xs flex-1"
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  value={proc.amount}
                  onChange={(e) => handleProcedureChange(idx, 'amount', e.target.value)}
                  className="py-1 text-xs w-28 font-mono"
                />
                <button type="button" onClick={() => handleRemoveProcedureRow(idx)} className="text-red-400 hover:text-red-300">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Clinical Examination & Chief Complaint Inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-slate-300 font-bold mb-1">Chief Complaint</label>
            <textarea
              className="w-full glass-input rounded-lg p-2 text-xs text-white"
              rows={2}
              value={chiefComplaints}
              onChange={(e) => setChiefComplaints(e.target.value)}
              required
            ></textarea>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Present Illness History</label>
            <textarea
              className="w-full glass-input rounded-lg p-2 text-xs text-white"
              rows={2}
              value={historyOfPresentIllness}
              onChange={(e) => setHistoryOfPresentIllness(e.target.value)}
            ></textarea>
          </div>
        </div>

        {/* 4. Structured Rx Prescriptions */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <label className="block text-slate-300 font-bold">Structured Rx Prescription</label>
            <Button size="xs" variant="outline" type="button" onClick={handleAddMedicineRow} className="gap-1 font-bold">
              <Plus size={12} /> Add Medicine
            </Button>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-2">Medicine Name</th>
                  <th className="p-2">Dosage</th>
                  <th className="p-2">Frequency</th>
                  <th className="p-2">Days</th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {prescriptions.map((med, idx) => (
                  <tr key={idx}>
                    <td className="p-2">
                      <Input
                        placeholder="Medicine name..."
                        value={med.medicineName}
                        onChange={(e) => handleMedicineChange(idx, 'medicineName', e.target.value)}
                        className="py-1 text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={med.dosage}
                        onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                        className="py-1 text-xs w-24"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={med.frequency}
                        onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                        className="glass-input rounded p-1 text-xs bg-slate-900"
                      >
                        <option value="ONCE_DAILY">Once Daily</option>
                        <option value="TWICE_DAILY">Twice Daily</option>
                        <option value="THRICE_DAILY">Thrice Daily</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={med.durationDays}
                        onChange={(e) => handleMedicineChange(idx, 'durationDays', e.target.value)}
                        className="py-1 text-xs w-16"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <button type="button" onClick={() => handleRemoveMedicineRow(idx)} className="text-red-400 hover:text-red-300">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Consolidated Bill Preview Box */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs space-y-1.5">
          <div className="flex justify-between font-bold text-sky-400 text-sm border-b border-slate-800 pb-1.5">
            <span>Consolidated Bill Preview</span>
            <span>Total: {formatCurrency(grandTotal)}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Doctor Consultation Fee:</span>
            <span className="font-mono">{formatCurrency(consultationFee)}</span>
          </div>
          {emergencyFee > 0 && (
            <div className="flex justify-between text-slate-300">
              <span>Emergency Surcharge:</span>
              <span className="font-mono">{formatCurrency(emergencyFee)}</span>
            </div>
          )}
          {totalDoctorProcedureCharges > 0 && (
            <div className="flex justify-between text-slate-300">
              <span>Doctor Procedure Charges:</span>
              <span className="font-mono">{formatCurrency(totalDoctorProcedureCharges)}</span>
            </div>
          )}
          {totalDepartmentCharges > 0 && (
            <div className="flex justify-between text-emerald-400 font-medium">
              <span>Department Charges ({completedDeptOrders.length} Services):</span>
              <span className="font-mono">{formatCurrency(totalDepartmentCharges)}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-1/3 font-bold py-3 text-xs"
            onClick={onClose}
          >
            Cancel / Keep Draft
          </Button>
          <Button
            type="button"
            variant="success"
            className="w-2/3 font-bold py-3 text-xs gap-2"
            disabled={hasPendingOrders}
            onClick={() => setShowConfirmModal(true)}
          >
            <CheckCircle2 size={18} />
            Finalize Consultation & Send to Billing Desk
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full glass-panel rounded-2xl p-6 border border-emerald-500/40 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 size={28} />
            </div>

            <h3 className="text-xl font-bold text-white">Finalize Consultation & Bill?</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to finalize this consultation and bill? After finalization, the patient will be sent to the Billing Department queue.
            </p>

            <div className="p-3 rounded-xl bg-slate-900 text-xs font-mono space-y-1 text-left border border-slate-800">
              <div className="flex justify-between text-slate-400">
                <span>Patient:</span>
                <span className="text-white font-bold">{patient.firstName} {patient.lastName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Grand Total Bill:</span>
                <span className="text-emerald-400 font-bold">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="w-1/2 font-bold" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </Button>
              <Button type="button" variant="success" className="w-1/2 font-bold" isLoading={isLoading} onClick={handleFinalizeConfirmed}>
                Confirm & Send to Billing
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Dialog (Cancel or Request Correction) */}
      {actionOrder && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full glass-panel rounded-2xl p-6 border border-sky-500/40 space-y-3">
            <h3 className="text-lg font-bold text-white">
              {actionType === 'CANCEL' ? 'Cancel Department Request' : 'Request Department Correction'}
            </h3>
            <p className="text-xs text-slate-400">
              Target Test: <strong className="text-white">{actionOrder.testName}</strong>
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                {actionType === 'CANCEL' ? 'Mandatory Cancellation Reason:' : 'Correction Details / Remarks:'}
              </label>
              <textarea
                className="w-full glass-input rounded-lg p-2 text-xs text-white"
                rows={3}
                placeholder={actionType === 'CANCEL' ? 'Enter reason for cancellation...' : 'Enter note for technician...'}
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                required
              ></textarea>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="w-1/2 font-bold" onClick={() => { setActionOrder(null); setActionType(null); }}>
                Back
              </Button>
              <Button
                type="button"
                variant={actionType === 'CANCEL' ? 'danger' : 'primary'}
                className="w-1/2 font-bold"
                onClick={actionType === 'CANCEL' ? handleCancelOrderSubmit : handleCorrectionSubmit}
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
