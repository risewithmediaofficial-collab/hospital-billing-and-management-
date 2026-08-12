import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useSocket } from '../../providers/SocketProvider';
import { formatCurrency } from '../../utils/formatters';
import {
  Stethoscope, X, AlertCircle, Plus, Trash2, CheckCircle2,
  TestTube, AlertTriangle, Receipt, RotateCcw, Check, Ban, Pill, Syringe, Activity
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
    {
      medicineName: '',
      genericName: '',
      dosageForm: 'TABLET',
      dosage: '1 Tablet',
      frequency: 'TWICE_DAILY',
      durationDays: 5,
      timing: 'AFTER_FOOD',
      treatmentType: 'ORAL_TAKE_HOME',
      instructions: '',
      externalPurchaseRequired: false,
    },
  ]);

  const [inventoryMedicines, setInventoryMedicines] = useState([]);
  const [departmentOrders, setDepartmentOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionOrder, setActionOrder] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [actionNote, setActionNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [pharmacyBilledPrescriptions, setPharmacyBilledPrescriptions] = useState([]);

  const fetchInventory = async () => {
    try {
      const res = await axiosClient.get('/pharmacy/medicines');
      setInventoryMedicines(res.data || []);
    } catch (err) {
      console.error('Failed to load inventory for prescription search:', err);
    }
  };

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

  const fetchPharmacyBilled = useCallback(async () => {
    const patId = patient?._id || patient?.id;
    if (!patId) return;
    try {
      const res = await axiosClient.get(`/pharmacy/prescriptions?patientId=${patId}`);
      const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      const billed = list.filter(
        (rx) => (rx.dispenseStatus === 'BILLED_SENT_TO_DOCTOR' || (rx.totalMedicineCharge > 0 && rx.dispenseStatus !== 'DISPENSED')) && rx.chargeStatus !== 'INCLUDED_IN_FINAL_BILL'
      );
      setPharmacyBilledPrescriptions(billed);
    } catch (err) {
      console.error('Failed to load pharmacy billed prescriptions:', err);
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
        {
          medicineName: '',
          genericName: '',
          dosageForm: 'TABLET',
          dosage: '1 Tablet',
          frequency: 'TWICE_DAILY',
          durationDays: 5,
          timing: 'AFTER_FOOD',
          treatmentType: 'ORAL_TAKE_HOME',
          instructions: '',
          externalPurchaseRequired: false,
        },
      ]);
      setErrorMsg(null);
      setShowConfirmModal(false);
      fetchInventory();
      fetchDepartmentOrders();
      fetchPharmacyBilled();
    }
  }, [isOpen, token, fetchDepartmentOrders, fetchPharmacyBilled]);

  useEffect(() => {
    if (!socket || !isOpen) return;
    const handleUpdate = (data) => {
      const patId = patient?._id || patient?.id;
      if (data.patientId === patId || data.patientId?._id === patId) {
        fetchDepartmentOrders();
        fetchPharmacyBilled();
      }
    };
    socket.on('investigation:status_updated', handleUpdate);
    socket.on('diagnostics:report_ready', handleUpdate);
    socket.on('pharmacy:billing_sent_to_doctor', handleUpdate);
    return () => {
      socket.off('investigation:status_updated', handleUpdate);
      socket.off('diagnostics:report_ready', handleUpdate);
      socket.off('pharmacy:billing_sent_to_doctor', handleUpdate);
    };
  }, [socket, isOpen, patient, fetchDepartmentOrders, fetchPharmacyBilled]);

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
  const totalPharmacyCharges = pharmacyBilledPrescriptions.reduce((acc, rx) => {
    if (rx.totalMedicineCharge) return acc + Number(rx.totalMedicineCharge);
    const itemTotal = (rx.medicines || []).reduce(
      (sum, m) => sum + (Number(m.price || m.unitPrice || 20) * Number(m.dispensedQty || m.durationDays || 1)),
      0
    );
    return acc + itemTotal;
  }, 0);

  const grandTotal = Number(consultationFee || 0) + Number(emergencyFee || 0) + totalDoctorProcedureCharges + totalDepartmentCharges + totalPharmacyCharges;

  const handleAddMedicineRow = () =>
    setPrescriptions((prev) => [
      ...prev,
      {
        medicineName: '',
        genericName: '',
        dosageForm: 'TABLET',
        dosage: '1 Tablet',
        frequency: 'TWICE_DAILY',
        durationDays: 5,
        timing: 'AFTER_FOOD',
        treatmentType: 'ORAL_TAKE_HOME',
        instructions: '',
        externalPurchaseRequired: false,
      },
    ]);

  const handleAddInjectionTaskRow = () =>
    setPrescriptions((prev) => [
      ...prev,
      {
        medicineName: 'Inj. Paracetamol / IV Treatment',
        genericName: 'Injectable Treatment',
        dosageForm: 'INJECTION',
        dosage: '1 Ampoule IV Stat',
        frequency: 'STAT_IMMEDIATE',
        durationDays: 1,
        timing: 'STAT',
        treatmentType: 'NURSE_ADMINISTERED',
        instructions: 'Administer IV Stat by Duty Nurse',
        externalPurchaseRequired: false,
      },
    ]);

  const handleRemoveMedicineRow = (index) => setPrescriptions((prev) => prev.filter((_, idx) => idx !== index));
  const handleMedicineChange = (index, field, value) =>
    setPrescriptions((prev) => {
      const u = [...prev];
      u[index][field] = value;

      // Auto set treatment type based on dosage form
      if (field === 'dosageForm') {
        if (['INJECTION', 'IV_FLUID', 'DROPS', 'CREAM'].includes(value)) {
          u[index].treatmentType = 'NURSE_ADMINISTERED';
        } else {
          u[index].treatmentType = 'ORAL_TAKE_HOME';
        }
      }
      return u;
    });

  const handleSelectInventoryMed = (index, selectedMedName) => {
    const med = inventoryMedicines.find((m) => m.name === selectedMedName);
    if (med) {
      setPrescriptions((prev) => {
        const u = [...prev];
        u[index].medicineName = med.name;
        u[index].genericName = med.genericName;
        u[index].dosageForm = med.dosageForm;
        u[index].strength = med.strength;
        u[index].externalPurchaseRequired = (med.totalQuantity ?? 0) === 0;
        if (['INJECTION', 'IV_FLUID'].includes(med.dosageForm)) {
          u[index].treatmentType = 'NURSE_ADMINISTERED';
        }
        return u;
      });
    }
  };

  const handleAddProcedureRow = () => setDoctorProcedureCharges((prev) => [...prev, { description: '', amount: 100 }]);
  const handleRemoveProcedureRow = (index) => setDoctorProcedureCharges((prev) => prev.filter((_, idx) => idx !== index));
  const handleProcedureChange = (index, field, value) => setDoctorProcedureCharges((prev) => { const u = [...prev]; u[index][field] = value; return u; });

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
          {/* Header */}
          <div className="modal-header">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
                <Stethoscope size={19} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 leading-tight truncate">Clinical Consultation & Charges Review</h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  <span className="text-indigo-700 font-bold">{patient.firstName} {patient.lastName}</span> &bull; Token #{token.tokenNumber}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="modal-close-btn">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="modal-body space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle size={15} /> {errorMsg}
              </div>
            )}

            {/* Department Reports */}
            <div className={sectionBg}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                  <TestTube size={16} className="text-sky-600" /> Department Reports & Charges ({departmentOrders.length})
                </span>
                <span className="text-slate-500">
                  Total: <strong className="text-emerald-700 font-mono">{formatCurrency(totalDepartmentCharges)}</strong>
                </span>
              </div>
            </div>

            {/* Doctor Fees */}
            <div className={sectionBg}>
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                <Receipt size={16} className="text-indigo-600" /> Doctor Fees & Charges
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Consultation Fee (₹)</label>
                  <Input type="number" value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Emergency Surcharge (₹)</label>
                  <Input type="number" value={emergencyFee} onChange={(e) => setEmergencyFee(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Structured Prescriptions */}
            <div className="space-y-2">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <label className={labelClass}>Structured Prescription & Nurse Treatment Entry</label>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" type="button" onClick={handleAddMedicineRow} className="gap-1 font-bold text-xs">
                    <Plus size={12} /> Add Oral Medicine
                  </Button>
                  <Button size="sm" variant="primary" type="button" onClick={handleAddInjectionTaskRow} className="gap-1 font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
                    <Syringe size={13} /> Prescribe Injection / Nurse Task
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {prescriptions.map((med, idx) => {
                  const matchMed = inventoryMedicines.find((m) => m.name === med.medicineName);
                  const isOutOfStock = matchMed && (matchMed.totalQuantity ?? 0) === 0;

                  return (
                    <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2 shadow-xs">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <label className="font-bold text-slate-600">Medicine Name / SKU</label>
                          <input
                            type="text"
                            list={`med-list-${idx}`}
                            placeholder="Type or select medicine..."
                            value={med.medicineName}
                            onChange={(e) => {
                              handleMedicineChange(idx, 'medicineName', e.target.value);
                              handleSelectInventoryMed(idx, e.target.value);
                            }}
                            className="w-full p-2 border rounded text-xs font-bold text-slate-900 mt-1"
                          />
                          <datalist id={`med-list-${idx}`}>
                            {inventoryMedicines.map((m) => (
                              <option key={m._id} value={m.name}>
                                {m.name} ({m.genericName}) — Stock: {m.totalQuantity ?? 0} units
                              </option>
                            ))}
                          </datalist>
                        </div>

                        <div>
                          <label className="font-bold text-slate-600">Dosage Form & Frequency</label>
                          <div className="flex gap-1 mt-1">
                            <select
                              value={med.dosageForm}
                              onChange={(e) => handleMedicineChange(idx, 'dosageForm', e.target.value)}
                              className="w-1/2 p-2 border rounded text-xs"
                            >
                              {['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'DROPS', 'INHALER', 'IV_FLUID'].map((f) => (
                                <option key={f} value={f}>{f}</option>
                              ))}
                            </select>
                            <select
                              value={med.frequency}
                              onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                              className="w-1/2 p-2 border rounded text-xs"
                            >
                              <option value="ONCE_DAILY">Once Daily</option>
                              <option value="TWICE_DAILY">Twice Daily</option>
                              <option value="THRICE_DAILY">Thrice Daily</option>
                              <option value="STAT_IMMEDIATE">STAT Immediate</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="font-bold text-slate-600">Treatment Routing</label>
                          <select
                            value={med.treatmentType}
                            onChange={(e) => handleMedicineChange(idx, 'treatmentType', e.target.value)}
                            className="w-full p-2 border rounded text-xs font-bold mt-1 bg-indigo-50 text-indigo-900"
                          >
                            <option value="ORAL_TAKE_HOME">Oral / Take-Home (Queue to Pharmacy)</option>
                            <option value="NURSE_ADMINISTERED">Nurse-Administered (Injection / IV / Dressing Task)</option>
                          </select>
                        </div>
                      </div>

                      {/* Stock Warning Banner */}
                      {matchMed && (
                        <div className={`p-2 rounded flex items-center justify-between text-[11px] ${isOutOfStock ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'}`}>
                          <span>
                            Available Stock: <strong>{matchMed.totalQuantity ?? 0} units</strong> ({matchMed.genericName})
                            {isOutOfStock && ' — OUT OF STOCK in Hospital Pharmacy'}
                          </span>
                          {isOutOfStock && (
                            <label className="flex items-center gap-1 font-bold cursor-pointer text-amber-800">
                              <input
                                type="checkbox"
                                checked={med.externalPurchaseRequired}
                                onChange={(e) => handleMedicineChange(idx, 'externalPurchaseRequired', e.target.checked)}
                              />
                              Mark for External Purchase
                            </label>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <input
                          type="text"
                          placeholder="Instructions (e.g. After food)..."
                          value={med.instructions}
                          onChange={(e) => handleMedicineChange(idx, 'instructions', e.target.value)}
                          className="w-4/5 p-1.5 border rounded text-xs"
                        />
                        <button type="button" onClick={() => handleRemoveMedicineRow(idx)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PHARMACY BILLED MEDICINES SUMMARY */}
            {pharmacyBilledPrescriptions.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <span className="font-extrabold text-amber-900 flex items-center gap-1.5 text-sm">
                    <Pill size={16} className="text-amber-600" /> Pharmacy Billed Medicines Summary ({pharmacyBilledPrescriptions.length})
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-600 text-white">
                    BILLED BY PHARMACY & SENT FOR REVIEW
                  </span>
                </div>
                <div className="space-y-1.5">
                  {pharmacyBilledPrescriptions.map((rx) => {
                    const rxCharge = rx.totalMedicineCharge
                      ? Number(rx.totalMedicineCharge)
                      : (rx.medicines || []).reduce(
                          (s, m) => s + ((Number(m.price || m.unitPrice || m.sellingPrice) || 25) * (Number(m.dispensedQty || m.durationDays) || 1)),
                          0
                        );
                    return (
                      <div key={rx._id} className="flex items-center justify-between text-slate-800 bg-white p-2 rounded border border-amber-100">
                        <div>
                          <p className="font-bold">{rx.medicines?.map((m) => m.medicineName).join(', ') || 'Prescription Medicines'}</p>
                          <p className="text-[10px] text-slate-500">Status: {rx.dispenseStatus} &bull; Notes: {rx.pharmacyNotes || 'None'}</p>
                        </div>
                        <span className="font-mono font-black text-amber-900">
                          {formatCurrency(rxCharge)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bill Preview */}
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2">
              <div className="flex justify-between font-extrabold text-indigo-900 text-sm">
                <span>Grand Total Consultation Bill:</span>
                <span className="font-mono">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <Button type="button" variant="outline" className="w-1/3 font-bold" onClick={onClose}>
              Cancel / Keep Draft
            </Button>
            <Button
              type="button"
              variant="success"
              className="w-2/3 font-bold gap-2"
              onClick={() => setShowConfirmModal(true)}
            >
              <CheckCircle2 size={17} />
              Finalize & Dispatch Tasks
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 border text-center space-y-4 shadow-xl">
            <h3 className="text-xl font-black text-slate-900">Finalize Consultation & Create Tasks?</h3>
            <p className="text-xs text-slate-600">
              Prescriptions will be routed to Pharmacy and Nurse Tasks created for injections/IV fluids.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="w-1/2 font-bold" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
              <Button type="button" variant="success" className="w-1/2 font-bold" isLoading={isLoading} onClick={handleFinalizeConfirmed}>
                Confirm & Finalize
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
