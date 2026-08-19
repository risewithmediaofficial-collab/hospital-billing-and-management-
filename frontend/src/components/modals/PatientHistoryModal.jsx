import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import {
  X,
  History,
  Search,
  User,
  Phone,
  Calendar,
  Stethoscope,
  Pill,
  Syringe,
  FileText,
  CreditCard,
  Printer,
  AlertCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';

export const PatientHistoryModal = ({ isOpen, onClose, initialIdentifier = null }) => {
  useScrollLock(isOpen);
  const [searchQuery, setSearchQuery] = useState(initialIdentifier || '');
  const [historyData, setHistoryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'CONSULTATIONS' | 'PRESCRIPTIONS' | 'DIAGNOSTICS' | 'TREATMENTS' | 'BILLS'

  useEffect(() => {
    if (isOpen) {
      if (initialIdentifier) {
        setSearchQuery(initialIdentifier);
        fetchHistory(initialIdentifier);
      } else {
        setHistoryData(null);
        setError(null);
      }
    }
  }, [isOpen, initialIdentifier]);

  const fetchHistory = async (identifier) => {
    const idToSearch = identifier || searchQuery;
    if (!idToSearch || !String(idToSearch).trim()) {
      setError('Please enter a UHID, Mobile Number, or Patient ID.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get(`/emr/patient-history/${encodeURIComponent(String(idToSearch).trim())}`);
      setHistoryData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error?.message || 'No past medical records found for this patient.');
      setHistoryData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const { patient, consultations = [], prescriptions = [], diagnosticOrders = [], nurseTasks = [], invoices = [] } = historyData || {};

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-container max-w-4xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex-shrink-0">
              <History size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">Patient Medical History & Previous Visits</h3>
              <p className="text-xs text-slate-500 mt-0.5">Lookup longitudinal clinical records, past prescriptions & diagnostic reports</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {historyData && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 text-xs font-bold border-slate-200 hover:bg-slate-50 text-slate-700 hidden sm:flex"
              >
                <Printer size={14} /> Print Summary
              </Button>
            )}
            <button onClick={onClose} className="modal-close-btn" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchHistory(searchQuery);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Patient UHID (e.g. HOSP-2026-00001), Mobile Number, or Name..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 font-medium"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4"
            >
              Search History
            </Button>
          </form>

          {error && (
            <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="modal-body space-y-5 max-h-[70vh] overflow-y-auto">
          {patient ? (
            <>
              {/* Patient Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-black text-slate-900">
                      {patient.firstName} {patient.lastName}
                    </h4>
                    <span className="font-mono text-xs font-black bg-indigo-600 text-white px-2 py-0.5 rounded shadow-xs">
                      {patient.uhid}
                    </span>
                    <span className="text-xs font-bold bg-white text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                      {patient.gender} &bull; {patient.age || 'N/A'} Yrs
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1 font-semibold">
                      <Phone size={13} className="text-slate-400" /> {patient.phone}
                    </span>
                    {patient.bloodGroup && (
                      <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                        Blood: {patient.bloodGroup}
                      </span>
                    )}
                    {patient.dob && (
                      <span className="text-slate-500">
                        DOB: {new Date(patient.dob).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-left sm:text-right text-xs">
                  <p className="text-slate-500 font-medium">Total Previous Visits</p>
                  <p className="text-xl font-black text-indigo-700">{consultations.length} Consultations</p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-1 text-xs font-bold">
                {[
                  { id: 'ALL', label: `All History (${consultations.length + diagnosticOrders.length + nurseTasks.length})` },
                  { id: 'CONSULTATIONS', label: `Consultations (${consultations.length})` },
                  { id: 'PRESCRIPTIONS', label: `Prescriptions (${prescriptions.length})` },
                  { id: 'DIAGNOSTICS', label: `Lab & Radiology (${diagnosticOrders.length})` },
                  { id: 'TREATMENTS', label: `Injections & Nurse Tasks (${nurseTasks.length})` },
                  { id: 'BILLS', label: `Invoices (${invoices.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab 1: Consultations */}
              {(activeTab === 'ALL' || activeTab === 'CONSULTATIONS') && consultations.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Stethoscope size={15} className="text-indigo-600" /> Previous Doctor Consultations ({consultations.length})
                  </h5>
                  <div className="space-y-3">
                    {consultations.map((c) => (
                      <div key={c._id} className={`p-4 rounded-xl border shadow-xs space-y-2.5 ${
                        c.isExternalHospitalRecord
                          ? 'bg-amber-50/60 border-amber-200'
                          : 'bg-white border-slate-200'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900">
                              {c.doctorId?.name ? `Dr. ${c.doctorId.name}` : 'Attending Doctor'}
                            </span>
                            {c.doctorId?.specialization && (
                              <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">
                                {c.doctorId.specialization}
                              </span>
                            )}
                            {c.isExternalHospitalRecord ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md border bg-amber-100 text-amber-800 border-amber-300">
                                🏥 {c.originHospitalName || 'Partner Hospital'} — Clinical View Only
                              </span>
                            ) : (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md border bg-indigo-50 text-indigo-700 border-indigo-200">
                                🏥 {c.originHospitalName || 'This Hospital'}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                            <Clock size={13} /> {new Date(c.createdAt).toLocaleString()}
                          </span>
                        </div>

                        {(c.chiefComplaints) && (
                          <div className="text-xs">
                            <span className="font-bold text-slate-600">Chief Complaints: </span>
                            <span className="text-slate-700">{c.chiefComplaints}</span>
                          </div>
                        )}

                        {(c.provisionalDiagnosis || c.finalDiagnosis) && (
                          <div className="text-xs">
                            <span className="font-bold text-indigo-700">Diagnosis: </span>
                            <span className="font-medium text-slate-800">{c.finalDiagnosis || c.provisionalDiagnosis}</span>
                          </div>
                        )}

                        {c.treatmentPlan && (
                          <div className="text-xs">
                            <span className="font-bold text-slate-600">Treatment Plan: </span>
                            <span className="text-slate-700">{c.treatmentPlan}</span>
                          </div>
                        )}

                        {(c.doctorsNotes || c.adviceToPatient) && (
                          <div className="p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-100">
                            <span className="font-bold text-slate-700">Clinical Notes / Advice: </span>
                            <span className="text-slate-700">{c.doctorsNotes || c.adviceToPatient}</span>
                          </div>
                        )}

                        {c.vitals && (
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            {c.vitals.bp && <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded font-bold">BP: {c.vitals.bp}</span>}
                            {c.vitals.pulse && <span className="bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded font-bold">Pulse: {c.vitals.pulse}</span>}
                            {c.vitals.temperature && <span className="bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded font-bold">Temp: {c.vitals.temperature}°F</span>}
                            {c.vitals.spo2 && <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded font-bold">SpO2: {c.vitals.spo2}%</span>}
                          </div>
                        )}

                        {c.followUpDate && (
                          <div className="text-xs font-bold text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5">
                            <Calendar size={14} className="text-amber-600" />
                            Follow-Up Scheduled: {new Date(c.followUpDate).toLocaleDateString()}
                          </div>
                        )}

                        {c.isExternalHospitalRecord && (
                          <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 font-semibold">
                            ⚠️ Billing &amp; fee information from this visit is confidential to {c.originHospitalName}.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Prescriptions */}
              {(activeTab === 'ALL' || activeTab === 'PRESCRIPTIONS') && prescriptions.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Pill size={15} className="text-indigo-600" /> Past Prescribed Medications ({prescriptions.length})
                  </h5>
                  <div className="space-y-3">
                    {prescriptions.map((rx) => (
                      <div key={rx._id} className={`p-3.5 rounded-xl border shadow-xs space-y-2 ${
                        rx.isExternalHospitalRecord ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200'
                      }`}>
                        <div className="flex justify-between text-xs text-slate-500 border-b border-slate-100 pb-1.5">
                          <div className="flex items-center gap-2">
                            <span>Rx by: <strong className="text-slate-800">{rx.doctorId?.name ? `Dr. ${rx.doctorId.name}` : 'Doctor'}</strong></span>
                            {rx.isExternalHospitalRecord && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                🏥 {rx.originHospitalName}
                              </span>
                            )}
                          </div>
                          <span>{new Date(rx.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(rx.medicines || []).map((med, idx) => (
                            <div key={idx} className="p-2 bg-indigo-50/50 rounded-lg border border-indigo-100 text-xs">
                              <p className="font-bold text-indigo-950">{med.medicineName || med.name}</p>
                              <p className="text-[11px] text-indigo-700 font-medium">
                                {med.dosage || '1 Tablet'} &bull; {med.timing || 'After Food'} &bull; {med.durationDays ? `${med.durationDays} Days` : (med.duration || '3 Days')}
                              </p>
                              {med.instructions && (
                                <p className="text-[10px] text-slate-500 italic mt-0.5">{med.instructions}</p>
                              )}
                            </div>
                          ))}
                        </div>
                        {rx.isExternalHospitalRecord && (
                          <p className="text-[10px] text-amber-700 font-semibold">⚠️ Medicine pricing from this prescription is confidential to {rx.originHospitalName}.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Lab & Radiology Diagnostics */}
              {(activeTab === 'ALL' || activeTab === 'DIAGNOSTICS') && diagnosticOrders.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={15} className="text-indigo-600" /> Lab & Radiology Reports ({diagnosticOrders.length})
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {diagnosticOrders.map((diag) => (
                      <div key={diag._id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs text-xs space-y-1.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-900">{diag.testName}</p>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {diag.department}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            diag.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {diag.status}
                          </span>
                        </div>
                        {diag.reportUrl && (
                          <a
                            href={diag.reportUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline pt-1"
                          >
                            <ExternalLink size={12} /> View Uploaded Report Document
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Nurse Treatments & Injections */}
              {(activeTab === 'ALL' || activeTab === 'TREATMENTS') && nurseTasks.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Syringe size={15} className="text-indigo-600" /> Nurse Injections & Treatments ({nurseTasks.length})
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {nurseTasks.map((t) => (
                      <div key={t._id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900">{t.medicineName}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            t.status === 'ADMINISTERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {t.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Route: <strong className="text-slate-700">{t.route}</strong> &bull; Dose: {t.dosage}
                        </p>
                        {t.administeredAt && (
                          <p className="text-[10px] text-emerald-700 font-semibold">
                            Administered: {new Date(t.administeredAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 5: Invoices */}
              {(activeTab === 'ALL' || activeTab === 'BILLS') && invoices.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard size={15} className="text-indigo-600" /> Past Billing Invoices ({invoices.length})
                  </h5>
                  <div className="space-y-2">
                    {invoices.map((inv) => (
                      <div key={inv._id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between text-xs">
                        <div>
                          <p className="font-mono font-bold text-indigo-700">{inv.invoiceNumber}</p>
                          <p className="text-[11px] text-slate-500">{new Date(inv.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-900 text-sm">₹{inv.grandTotal?.toLocaleString('en-IN') || 0}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            inv.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {inv.paymentStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            !isLoading && (
              <div className="text-center py-10 text-slate-400 space-y-2">
                <Search size={36} className="mx-auto text-slate-300" />
                <p className="text-sm font-medium">Enter a Patient UHID or Phone number above to load full history.</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
