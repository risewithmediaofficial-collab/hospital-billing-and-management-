import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useSocket } from '../../providers/SocketProvider';
import { formatCurrency } from '../../utils/formatters';
import {
  Stethoscope, X, AlertCircle, Plus, Trash2, CheckCircle2,
  TestTube, AlertTriangle, Receipt, RotateCcw, Check, Ban,
} from 'lucide-react';

export const ConsultationModal = ({ isOpen, onClose, token, patient, onSuccess }) => {
  useScrollLock(isOpen);
  const { socket } = useSocket();

  const [chiefComplaints, setChiefComplaints] = useState('');
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [adviceToPatient, setAdviceToPatient] = useState('');

  const [consultationFee, setConsultationFee] = useState(150);
  const [emergencyFee, setEmergencyFee] = useState(0);
  const [doctorProcedureCharges, setDoctorProcedureCharges] = useState([]);

  const [prescriptions, setPrescriptions] = useState([
    { medicineName: '', dosage: '1 Tablet', frequency: 'TWICE_DAILY', durationDays: 5, timing: 'AFTER_FOOD', instructions: '' },
  ]);

  const [departmentOrders, setDepartmentOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionOrder, setActionOrder] = useState(null);
  const [actionType, setActionType] = useState(null);
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
      setPrescriptions([{ medicineName: '', dosage: '1 Tablet', frequency: 'TWICE_DAILY', durationDays: 5, timing: 'AFTER_FOOD', instructions: '' }]);
      setErrorMsg(null);
      setShowConfirmModal(false);
      fetchDepartmentOrders();
    }
  }, [isOpen, token, fetchDepartmentOrders]);

  useEffect(() => {
    if (!socket || !isOpen) return;
    const handleUpdate = (data) => {
      const patId = patient?._id || patient?.id;
      if (data.patientId === patId || data.patientId?._id === patId) fetchDepartmentOrders();
    };
    socket.on('investigation:status_updated', handleUpdate);
    socket.on('diagnostics:report_ready', handleUpdate);
    return () => {
      socket.off('investigation:status_updated', handleUpdate);
      socket.off('diagnostics:report_ready', handleUpdate);
    };
  }, [socket, isOpen, patient, fetchDepartmentOrders]);

  if (!isOpen || !token || !patient) return null;

  const pendingOrders = departmentOrders.filter(
    (ord) => ['REQUESTED', 'DEPARTMENT_RECEIVED', 'ACCEPTED', 'IN_PROGRESS'].includes(ord.status) && ord.chargeStatus !== 'CANCELLED'
  );
  const hasPendingOrders = pendingOrders.length > 0;

  const completedDeptOrders = departmentOrders.filter(
    (ord) => ['REPORT_UPLOADED', 'COMPLETED', 'DOCTOR_REVIEW'].includes(ord.status) && ord.chargeStatus !== 'CANCELLED'
  );
  const totalDepartmentCharges = completedDeptOrders.reduce((sum, ord) => sum + (ord.totalDepartmentCharge || ord.price || 0), 0);
  const totalDoctorProcedureCharges = doctorProcedureCharges.reduce((sum, proc) => sum + (Number(proc.amount) || 0), 0);
  const grandTotal = Number(consultationFee || 0) + Number(emergencyFee || 0) + totalDoctorProcedureCharges + totalDepartmentCharges;

  const handleAddMedicineRow = () => setPrescriptions((prev) => [...prev, { medicineName: '', dosage: '1 Tablet', frequency: 'TWICE_DAILY', durationDays: 5, timing: 'AFTER_FOOD', instructions: '' }]);
  const handleRemoveMedicineRow = (index) => setPrescriptions((prev) => prev.filter((_, idx) => idx !== index));
  const handleMedicineChange = (index, field, value) => setPrescriptions((prev) => { const u = [...prev]; u[index][field] = value; return u; });
  const handleAddProcedureRow = () => setDoctorProcedureCharges((prev) => [...prev, { description: '', amount: 100 }]);
  const handleRemoveProcedureRow = (index) => setDoctorProcedureCharges((prev) => prev.filter((_, idx) => idx !== index));
  const handleProcedureChange = (index, field, value) => setDoctorProcedureCharges((prev) => { const u = [...prev]; u[index][field] = value; return u; });

  const handleCancelOrderSubmit = async () => {
    if (!actionNote.trim()) { alert('A mandatory cancellation reason must be provided.'); return; }
    try {
      await axiosClient.post(`/diagnostics/orders/${actionOrder._id}/cancel`, { cancellationReason: actionNote.trim() });
      setActionOrder(null); setActionType(null); setActionNote('');
      fetchDepartmentOrders();
    } catch (err) { alert(err.response?.data?.error?.message || 'Failed to cancel order'); }
  };

  const handleCorrectionSubmit = async () => {
    if (!actionNote.trim()) { alert('A correction note must be provided.'); return; }
    try {
      await axiosClient.post(`/diagnostics/orders/${actionOrder._id}/request-correction`, { correctionNote: actionNote.trim() });
      setActionOrder(null); setActionType(null); setActionNote('');
      fetchDepartmentOrders();
    } catch (err) { alert(err.response?.data?.error?.message || 'Failed to request correction'); }
  };

  const handleApproveCharge = async (orderId) => {
    try { await axiosClient.post(`/diagnostics/orders/${orderId}/approve-charge`); fetchDepartmentOrders(); }
    catch (err) { console.error('Failed to approve charge:', err); }
  };

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
      await axiosClient.patch(`/appointments/tokens/${token._id}/status`, { status: 'COMPLETED' });
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

  const labelClass = 'block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider';
  const sectionBg = 'p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3';

  return (
    <>
      <div className="modal-overlay animate-fade-in">
        <div className="modal-container max-w-4xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

          {/* ── Sticky Header ── */}
          <div className="modal-header">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
                <Stethoscope size={19} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 leading-tight truncate">Clinical Consultation & Charges Review</h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  <span className="text-indigo-700 font-bold">{patient.firstName} {patient.lastName}</span>
                  &nbsp;({patient.uhid}) &bull; Token #{token.tokenNumber}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="modal-close-btn" title="Cancel / Close Consultation">
              <X size={18} />
            </button>
          </div>

          {/* ── Scrollable Body ── */}
          <div className="modal-body space-y-4 text-xs">

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle size={15} /> {errorMsg}
              </div>
            )}

            {/* Pending Orders Warning */}
            {hasPendingOrders && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">Pending Department Requests</p>
                  <p className="mt-0.5">
                    {pendingOrders.length} request(s) still pending: {pendingOrders.map((p) => p.testName).join(', ')}.
                    Complete all required services before finalizing the bill.
                  </p>
                </div>
              </div>
            )}

            {/* ── 1. Department Reports & Charges ── */}
            <div className={sectionBg}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                  <TestTube size={16} className="text-sky-600" /> Department Reports & Charges ({departmentOrders.length})
                </span>
                <span className="text-slate-500">
                  Total: <strong className="text-emerald-700 font-mono">{formatCurrency(totalDepartmentCharges)}</strong>
                </span>
              </div>

              {isLoadingOrders ? (
                <p className="text-slate-500 text-center py-3">Loading department reports...</p>
              ) : departmentOrders.length > 0 ? (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {departmentOrders.map((ord) => (
                    <div key={ord._id} className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">[{ord.testCategory}] {ord.testName}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                            ord.status === 'COMPLETED' || ord.status === 'REPORT_UPLOADED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : ord.chargeStatus === 'CANCELLED'
                              ? 'bg-red-50 text-red-600 border-red-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {ord.chargeStatus === 'CANCELLED' ? 'CANCELLED' : ord.status}
                          </span>
                          <span className="font-mono font-bold text-emerald-700">{formatCurrency(ord.totalDepartmentCharge || ord.price || 0)}</span>
                        </div>
                      </div>
                      <p className="text-slate-500">
                        Technician: <span className="text-slate-700">{ord.technicianName || 'Pending'}</span> &bull; {new Date(ord.createdAt).toLocaleTimeString()}
                      </p>
                      {ord.reportSummary && (
                        <p className="text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 italic">Findings: "{ord.reportSummary}"</p>
                      )}
                      {ord.cancellationReason && (
                        <p className="text-red-600">Reason: {ord.cancellationReason}</p>
                      )}
                      {ord.chargeStatus !== 'CANCELLED' && (
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                          <span className="text-slate-500">Charge: <strong className="text-indigo-700">{ord.chargeStatus || 'SUBMITTED'}</strong></span>
                          <div className="flex gap-1.5">
                            {ord.chargeStatus !== 'APPROVED' && ord.chargeStatus !== 'INCLUDED_IN_FINAL_BILL' && (
                              <button type="button" onClick={() => handleApproveCharge(ord._id)}
                                className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold border border-emerald-200 flex items-center gap-1">
                                <Check size={10} /> Approve Charge
                              </button>
                            )}
                            <button type="button" onClick={() => { setActionOrder(ord); setActionType('CORRECTION'); setActionNote(''); }}
                              className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold border border-purple-200 flex items-center gap-1">
                              <RotateCcw size={10} /> Correction
                            </button>
                            <button type="button" onClick={() => { setActionOrder(ord); setActionType('CANCEL'); setActionNote(''); }}
                              className="px-2 py-0.5 rounded bg-red-50 text-red-700 hover:bg-red-100 font-bold border border-red-200 flex items-center gap-1">
                              <Ban size={10} /> Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-3">No department test requests for this visit.</p>
              )}
            </div>

            {/* ── 2. Doctor Fees & Procedure Charges ── */}
            <div className={sectionBg}>
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                <Receipt size={16} className="text-indigo-600" /> Doctor Fees & Procedure Charges
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Doctor Consultation Fee (₹)</label>
                  <Input type="number" value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)} className="font-mono font-bold" />
                </div>
                <div>
                  <label className={labelClass}>Emergency Surcharge (₹)</label>
                  <Input type="number" value={emergencyFee} onChange={(e) => setEmergencyFee(e.target.value)} className="font-mono font-bold" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className={labelClass}>In-Clinic Procedure Charges</label>
                  <Button size="sm" variant="outline" type="button" onClick={handleAddProcedureRow} className="gap-1 font-bold text-xs">
                    <Plus size={12} /> Add Procedure
                  </Button>
                </div>
                {doctorProcedureCharges.map((proc, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-2">
                    <Input placeholder="Procedure (e.g. Suturing, Dressing)..." value={proc.description} onChange={(e) => handleProcedureChange(idx, 'description', e.target.value)} className="flex-1" />
                    <Input type="number" placeholder="₹ Amount" value={proc.amount} onChange={(e) => handleProcedureChange(idx, 'amount', e.target.value)} className="w-28 font-mono" />
                    <button type="button" onClick={() => handleRemoveProcedureRow(idx)} className="text-red-500 hover:text-red-700 flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 3. Clinical Notes ── */}
            <div className={sectionBg}>
              <div>
                <label className={labelClass}>Chief Complaint</label>
                <textarea
                  className="w-full glass-input rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 resize-none"
                  rows={2}
                  value={chiefComplaints}
                  onChange={(e) => setChiefComplaints(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Present Illness History</label>
                <textarea
                  className="w-full glass-input rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 resize-none"
                  rows={2}
                  value={historyOfPresentIllness}
                  onChange={(e) => setHistoryOfPresentIllness(e.target.value)}
                />
              </div>
            </div>

            {/* ── 4. Structured Rx Prescriptions ── */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className={labelClass}>Structured Rx Prescription</label>
                <Button size="sm" variant="outline" type="button" onClick={handleAddMedicineRow} className="gap-1 font-bold text-xs">
                  <Plus size={12} /> Add Medicine
                </Button>
              </div>
              <div className="table-wrapper border border-slate-200 rounded-xl overflow-hidden">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Days</th>
                      <th className="text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((med, idx) => (
                      <tr key={idx}>
                        <td><Input placeholder="Medicine name..." value={med.medicineName} onChange={(e) => handleMedicineChange(idx, 'medicineName', e.target.value)} /></td>
                        <td><Input value={med.dosage} onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)} className="w-24" /></td>
                        <td>
                          <select value={med.frequency} onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                            className="glass-input rounded-lg px-2 py-1.5 text-xs text-slate-900 w-full focus:border-indigo-500">
                            <option value="ONCE_DAILY">Once Daily</option>
                            <option value="TWICE_DAILY">Twice Daily</option>
                            <option value="THRICE_DAILY">Thrice Daily</option>
                          </select>
                        </td>
                        <td><Input type="number" value={med.durationDays} onChange={(e) => handleMedicineChange(idx, 'durationDays', e.target.value)} className="w-16" /></td>
                        <td className="text-right">
                          <button type="button" onClick={() => handleRemoveMedicineRow(idx)} className="text-red-500 hover:text-red-700">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── 5. Consolidated Bill Preview ── */}
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2">
              <div className="flex justify-between font-extrabold text-indigo-900 text-sm border-b border-indigo-200 pb-2">
                <span className="flex items-center gap-1.5"><Receipt size={15} /> Consolidated Bill Preview</span>
                <span className="font-mono">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-700 font-semibold">
                <span>Doctor Consultation Fee:</span>
                <span className="font-mono font-bold">{formatCurrency(consultationFee)}</span>
              </div>
              {emergencyFee > 0 && (
                <div className="flex justify-between text-slate-700 font-semibold">
                  <span>Emergency Surcharge:</span>
                  <span className="font-mono font-bold">{formatCurrency(emergencyFee)}</span>
                </div>
              )}
              {totalDoctorProcedureCharges > 0 && (
                <div className="flex justify-between text-slate-700 font-semibold">
                  <span>Doctor Procedure Charges:</span>
                  <span className="font-mono font-bold">{formatCurrency(totalDoctorProcedureCharges)}</span>
                </div>
              )}
              {totalDepartmentCharges > 0 && (
                <div className="flex justify-between text-emerald-800 font-extrabold">
                  <span>Department Charges ({completedDeptOrders.length} Services):</span>
                  <span className="font-mono">{formatCurrency(totalDepartmentCharges)}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Sticky Footer ── */}
          <div className="modal-footer">
            <Button type="button" variant="outline" className="w-1/3 font-bold" onClick={onClose}>
              Cancel / Keep Draft
            </Button>
            <Button
              type="button"
              variant="success"
              className="w-2/3 font-bold gap-2"
              disabled={hasPendingOrders}
              onClick={() => setShowConfirmModal(true)}
            >
              <CheckCircle2 size={17} />
              Finalize & Send to Billing Desk
            </Button>
          </div>
        </div>
      </div>

      {/* ── Finalize Confirmation Sub-Modal ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 border border-slate-200 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-xl font-black text-slate-900">Finalize Consultation & Bill?</h3>
            <p className="text-xs text-slate-600">
              After finalization, the patient will be sent to the Billing Department queue. This cannot be undone.
            </p>
            <div className="p-3 rounded-xl bg-slate-50 text-xs space-y-1.5 text-left border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-bold text-slate-900">{patient.firstName} {patient.lastName}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="text-slate-500">Grand Total Bill:</span>
                <span className="text-emerald-700 font-black font-mono text-base">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="w-1/2 font-bold" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
              <Button type="button" variant="success" className="w-1/2 font-bold" isLoading={isLoading} onClick={handleFinalizeConfirmed}>
                Confirm & Send to Billing
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Action Sub-Modal (Cancel/Correction) ── */}
      {actionOrder && actionType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 border border-slate-200 shadow-xl space-y-3">
            <h3 className="text-lg font-bold text-slate-900">
              {actionType === 'CANCEL' ? 'Cancel Department Request' : 'Request Department Correction'}
            </h3>
            <p className="text-xs text-slate-500">
              Target Test: <strong className="text-slate-900">{actionOrder.testName}</strong>
            </p>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                {actionType === 'CANCEL' ? 'Mandatory Cancellation Reason:' : 'Correction Details / Remarks:'}
              </label>
              <textarea
                className="w-full glass-input rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 resize-none"
                rows={3}
                placeholder={actionType === 'CANCEL' ? 'Enter reason for cancellation...' : 'Enter note for technician...'}
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="w-1/2 font-bold" onClick={() => { setActionOrder(null); setActionType(null); }}>Back</Button>
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
    </>
  );
};
