import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useSocket } from '../../providers/SocketProvider';
import { formatCurrency } from '../../utils/formatters';
import {
  Stethoscope, X, AlertCircle, Plus, Trash2, CheckCircle2,
  TestTube, AlertTriangle, Receipt, RotateCcw, Check, Ban, Pill, Syringe, Activity,
  BedDouble, UserCheck, Phone
} from 'lucide-react';

export const ConsultationModal = ({ isOpen, onClose, token, patient, onSuccess }) => {
  useScrollLock(isOpen);
  const { socket } = useSocket();

  const [chiefComplaints, setChiefComplaints] = useState('');
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [adviceToPatient, setAdviceToPatient] = useState('');

  // IPD Recommendation & Optional Guardian State
  const [recommendIpd, setRecommendIpd] = useState(false);
  const [ipdData, setIpdData] = useState({
    recommendedWard: 'GENERAL_WARD',
    priority: 'ROUTINE',
    admissionReason: '',
    estimatedStayDays: 3,
    guardianName: patient?.emergencyContact?.name && patient?.emergencyContact?.name !== 'Self / N/A' ? patient.emergencyContact.name : '',
    guardianPhone: patient?.emergencyContact?.phone && patient?.emergencyContact?.phone !== '+1 (555) 000-0000' ? patient.emergencyContact.phone : '',
    guardianRelationship: patient?.emergencyContact?.relation || 'FAMILY',
    guardianAddress: '',
  });

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

      if (field === 'durationDays' && !u[index].quantityManuallyEdited) {
        const d = Number(value) || 5;
        const freqMultiplier = u[index].frequency === 'THRICE_DAILY' ? 3 : u[index].frequency === 'ONCE_DAILY' ? 1 : 2;
        u[index].quantity = d * freqMultiplier;
      }

      if (field === 'quantity') {
        u[index].quantityManuallyEdited = true;
      }

      const q = Number(u[index].quantity || ((Number(u[index].durationDays) || 5) * 2));
      const p = Number(u[index].unitPrice !== undefined ? u[index].unitPrice : 20);
      u[index].totalPrice = q * p;
      u[index].price = p;

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
        u[index].unitPrice = med.sellingPrice || 20;
        u[index].price = med.sellingPrice || 20;
        const q = Number(u[index].quantity || ((Number(u[index].durationDays) || 5) * 2));
        u[index].totalPrice = q * (med.sellingPrice || 20);
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
        ipdRecommendation: recommendIpd
          ? {
              isRecommended: true,
              recommendedWard: ipdData.recommendedWard,
              priority: ipdData.priority,
              admissionReason: ipdData.admissionReason || chiefComplaints || 'Doctor Inpatient Admission Recommendation',
              estimatedStayDays: Number(ipdData.estimatedStayDays) || 3,
              guardianInfo: {
                name: ipdData.guardianName,
                phone: ipdData.guardianPhone,
                relationship: ipdData.guardianRelationship,
                address: ipdData.guardianAddress,
              },
            }
          : { isRecommended: false },
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

                      {/* Quantity, Unit Price & Auto-Calculated Total Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 items-center text-xs">
                        <div>
                          <label className="font-bold text-slate-600 text-[11px] block mb-0.5">Quantity (Units / Tabs):</label>
                          <input
                            type="number"
                            min="1"
                            value={med.quantity || (Number(med.durationDays || 5) * (med.frequency === 'THRICE_DAILY' ? 3 : med.frequency === 'ONCE_DAILY' ? 1 : 2))}
                            onChange={(e) => handleMedicineChange(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-black text-slate-900 bg-white"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-600 text-[11px] block mb-0.5">Unit Price (₹):</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1 text-slate-400 font-bold">₹</span>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={med.unitPrice !== undefined ? med.unitPrice : 20}
                              onChange={(e) => handleMedicineChange(idx, 'unitPrice', e.target.value)}
                              className="w-full pl-5 pr-2 py-1 border border-slate-300 rounded text-xs font-bold text-slate-900 bg-white"
                            />
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">Line Total:</span>
                          <span className="font-mono font-black text-sm text-indigo-700">
                            ₹{((Number(med.quantity || (Number(med.durationDays || 5) * (med.frequency === 'THRICE_DAILY' ? 3 : med.frequency === 'ONCE_DAILY' ? 1 : 2)))) * Number(med.unitPrice !== undefined ? med.unitPrice : 20)).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <input
                          type="text"
                          placeholder="Instructions (e.g. After food)..."
                          value={med.instructions}
                          onChange={(e) => handleMedicineChange(idx, 'instructions', e.target.value)}
                          className="w-4/5 p-1.5 border rounded text-xs"
                        />
                        <button type="button" onClick={() => handleRemoveMedicineRow(idx)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-rose-50" title="Remove medicine">
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

            {/* Clinical Advice & Follow-Up */}
            <div className={sectionBg}>
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                <Activity size={16} className="text-emerald-600" /> Doctor Advice & Follow-Up Plan
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Doctor Advice to Patient</label>
                  <input
                    type="text"
                    placeholder="e.g. Rest for 3 days, drink plenty of fluids, avoid heavy lifting..."
                    value={adviceToPatient}
                    onChange={(e) => setAdviceToPatient(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className={labelClass}>Next Follow-Up Date</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* IPD ADMISSION RECOMMENDATION SECTION */}
            <div className="p-4 rounded-xl bg-purple-50/70 border-2 border-purple-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={recommendIpd}
                    onChange={(e) => setRecommendIpd(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                  />
                  <span className="font-extrabold text-purple-950 text-sm flex items-center gap-1.5">
                    <BedDouble size={17} className="text-purple-600" />
                    Recommend Inpatient (IPD) Admission / Ward Transfer
                  </span>
                </label>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${recommendIpd ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'}`}>
                  {recommendIpd ? 'IPD ADMISSION REQUESTED' : 'OPD ONLY'}
                </span>
              </div>

              {recommendIpd && (
                <div className="space-y-3 pt-2 border-t border-purple-200 animate-fade-in text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-purple-900 mb-1 uppercase tracking-wider">
                        Recommended Ward *
                      </label>
                      <select
                        value={ipdData.recommendedWard}
                        onChange={(e) => setIpdData({ ...ipdData, recommendedWard: e.target.value })}
                        className="w-full p-2 bg-white border border-purple-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-purple-500/20"
                      >
                        <option value="GENERAL_WARD">General Inpatient Ward (Ward 3B)</option>
                        <option value="ICU">Intensive Care Unit (ICU)</option>
                        <option value="CCU">Coronary Care Unit (CCU)</option>
                        <option value="POST_OP">Post-Operative Recovery Ward</option>
                        <option value="PEDIATRIC_WARD">Pediatric Inpatient Ward</option>
                        <option value="MATERNITY_WARD">Maternity / Labor Ward</option>
                        <option value="EMERGENCY_OBSERVATION">Emergency Observation Ward</option>
                        <option value="PRIVATE_ROOM">Private Deluxe Room</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-purple-900 mb-1 uppercase tracking-wider">
                        Admission Priority *
                      </label>
                      <select
                        value={ipdData.priority}
                        onChange={(e) => setIpdData({ ...ipdData, priority: e.target.value })}
                        className="w-full p-2 bg-white border border-purple-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-purple-500/20"
                      >
                        <option value="ROUTINE">Routine / Elective Admission</option>
                        <option value="URGENT">Urgent (Within 2 Hours)</option>
                        <option value="EMERGENCY">Emergency (Immediate Bed Transfer)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-purple-900 mb-1 uppercase tracking-wider">
                        Estimated Stay (Days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={ipdData.estimatedStayDays}
                        onChange={(e) => setIpdData({ ...ipdData, estimatedStayDays: e.target.value })}
                        className="w-full p-2 bg-white border border-purple-300 rounded-lg font-bold text-slate-800"
                        placeholder="e.g. 3"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 mb-1 uppercase tracking-wider">
                      Clinical Reason & Admission Indication
                    </label>
                    <textarea
                      rows="2"
                      value={ipdData.admissionReason}
                      onChange={(e) => setIpdData({ ...ipdData, admissionReason: e.target.value })}
                      placeholder="e.g. Severe acute condition requiring continuous IV therapy, vitals monitoring, and inpatient care..."
                      className="w-full p-2 bg-white border border-purple-300 rounded-lg text-slate-800 text-xs"
                    />
                  </div>

                  {/* OPTIONAL GUARDIAN DETAILS FOR IPD */}
                  <div className="p-3 bg-white rounded-lg border border-purple-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-950 flex items-center gap-1.5 text-xs">
                        <UserCheck size={14} className="text-purple-600" />
                        Guardian / Attendant Information (Optional for Inpatient Admission)
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        OPTIONAL — NOT COMPULSORY
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Guardian Name (Optional)"
                        value={ipdData.guardianName}
                        onChange={(e) => setIpdData({ ...ipdData, guardianName: e.target.value })}
                        className="p-1.5 border border-slate-200 rounded text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Guardian Mobile (Optional)"
                        value={ipdData.guardianPhone}
                        onChange={(e) => setIpdData({ ...ipdData, guardianPhone: e.target.value })}
                        className="p-1.5 border border-slate-200 rounded text-xs"
                      />
                      <select
                        value={ipdData.guardianRelationship}
                        onChange={(e) => setIpdData({ ...ipdData, guardianRelationship: e.target.value })}
                        className="p-1.5 border border-slate-200 rounded text-xs bg-white"
                      >
                        <option value="FATHER">Father</option>
                        <option value="MOTHER">Mother</option>
                        <option value="SPOUSE">Spouse</option>
                        <option value="SIBLING">Sibling</option>
                        <option value="CHILD">Child</option>
                        <option value="LEGAL_GUARDIAN">Legal Guardian</option>
                        <option value="CARETAKER">Caretaker / Attendant</option>
                        <option value="OTHER">Other Relative / Friend</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Comprehensive Itemized Bill Breakdown */}
            <div className="p-4 rounded-xl bg-indigo-50/90 border-2 border-indigo-200 space-y-2.5">
              <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2">
                <span className="font-extrabold text-indigo-950 flex items-center gap-1.5 text-sm">
                  <Receipt size={16} className="text-indigo-600" /> Itemized Consultation Bill Breakdown
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                  Dispatched to Cashier
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span>• Doctor Consultation Fee:</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(consultationFee || 0)}</span>
                </div>
                {Number(emergencyFee) > 0 && (
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>• Emergency Surcharge:</span>
                    <span className="font-mono">{formatCurrency(emergencyFee)}</span>
                  </div>
                )}
                {totalDoctorProcedureCharges > 0 && (
                  <div className="flex justify-between">
                    <span>• Doctor Procedures:</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(totalDoctorProcedureCharges)}</span>
                  </div>
                )}
                {totalDepartmentCharges > 0 && (
                  <div className="flex justify-between">
                    <span>• Department Investigations ({completedDeptOrders.length} tests):</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(totalDepartmentCharges)}</span>
                  </div>
                )}
                {totalPharmacyCharges > 0 && (
                  <div className="flex justify-between">
                    <span>• Pharmacy Prescribed Medicines:</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(totalPharmacyCharges)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-indigo-200 text-sm font-black text-indigo-950">
                <span>Grand Total Consultation Bill:</span>
                <span className="text-xl font-mono text-indigo-700 font-black">{formatCurrency(grandTotal)}</span>
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
