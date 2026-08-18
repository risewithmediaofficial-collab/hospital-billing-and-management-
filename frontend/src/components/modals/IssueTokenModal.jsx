import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useSocket } from '../../providers/SocketProvider';
import { useAuthStore } from '../../store/authStore';
import { X, Ticket, CheckCircle, Search, UserCheck, RefreshCw, Stethoscope, Lock, AlertCircle, Info, Printer } from 'lucide-react';

export const IssueTokenModal = ({ isOpen, onClose, onSuccess, initialPatient = null, initialDoctorId = null }) => {
  useScrollLock(isOpen);
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(initialPatient);
  const [selectedDoctorId, setSelectedDoctorId] = useState(initialDoctorId || '');
  const [chiefComplaints, setChiefComplaints] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [issuedToken, setIssuedToken] = useState(null);
  const [error, setError] = useState(null);

  const isDoctorLocked = Boolean(initialDoctorId);

  useEffect(() => {
    if (isOpen) {
      if (initialPatient) {
        setSelectedPatient(initialPatient);
        setSearchQuery(initialPatient.uhid || initialPatient.phone || `${initialPatient.firstName} ${initialPatient.lastName}`);
      } else {
        setSelectedPatient(null);
        setSearchQuery('');
      }
      setSelectedDoctorId(initialDoctorId || '');
      setChiefComplaints(initialPatient?.chiefComplaints || '');
      setIssuedToken(null);
      setError(null);
      fetchPatientsAndDoctors();
    }
  }, [isOpen, initialPatient, initialDoctorId]);

  // Real-time listener for doctor availability
  useEffect(() => {
    if (!socket || !isOpen) return;
    const handleDoctorAvailability = (data) => {
      setDoctors((prev) =>
        prev.map((d) =>
          String(d._id) === String(data.id || data._id)
            ? { ...d, isAvailable: data.isAvailable !== undefined ? data.isAvailable : d.isAvailable, cabinNo: data.cabinNo || d.cabinNo }
            : d
        )
      );
    };
    socket.on('doctor:availability_changed', handleDoctorAvailability);
    return () => {
      socket.off('doctor:availability_changed', handleDoctorAvailability);
    };
  }, [socket, isOpen]);

  const fetchPatientsAndDoctors = async () => {
    try {
      const pRes = await axiosClient.get('/patients');
      const allPatients = pRes.data || [];
      setPatients(allPatients);

      if (initialPatient) {
        const found = allPatients.find(
          (p) => String(p._id) === String(initialPatient._id) || p.uhid === initialPatient.uhid
        );
        if (found) {
          setSelectedPatient(found);
          if (found.uhid) setSearchQuery(found.uhid);
        }
      }

      const sRes = await axiosClient.get('/auth/staff');
      const allDocs = (sRes.data || []).filter(
        (s) => s.role === 'DOCTOR' || (Array.isArray(s.additionalRoles) && s.additionalRoles.includes('DOCTOR'))
      );
      setDoctors(allDocs);
      const activeDocs = allDocs.filter((d) => d.isAvailable !== false);
      if (!initialDoctorId) {
        if (activeDocs.length > 0) {
          setSelectedDoctorId(activeDocs[0]._id);
        } else if (allDocs.length > 0) {
          setSelectedDoctorId(allDocs[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch data for token issuance:', err);
    }
  };

  if (!isOpen) return null;

  const filteredPatients = searchQuery.trim()
    ? patients.filter((p) =>
        p.uhid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const selectedDoctor = doctors.find((d) => d._id === selectedDoctorId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) { setError('Please search and select a registered patient first.'); return; }
    if (!selectedDoctorId) { setError('Please select a doctor to assign this token to.'); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosClient.post('/appointments/tokens', {
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        uhid: selectedPatient.uhid,
        phone: selectedPatient.phone,
        chiefComplaints: chiefComplaints || selectedPatient.chiefComplaints || 'OPD Consultation',
        doctorId: selectedDoctorId,
      });
      setIssuedToken(response.data);
      if (onSuccess) onSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.error?.message || 'Failed to issue OPD token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setIssuedToken(null);
    setSelectedPatient(null);
    setSearchQuery('');
    setChiefComplaints('');
    onClose();
  };

  const handlePrintToken = () => {
    if (!issuedToken) return;
    const printWindow = window.open('', '', 'width=480,height=720');
    const pat = (typeof issuedToken.patientId === 'object' && issuedToken.patientId) ? issuedToken.patientId : (selectedPatient || {});
    const patName = pat.firstName ? `${pat.firstName} ${pat.lastName || ''}`.trim() : (issuedToken.patientName || 'Walk-in Patient');
    const patUhid = pat.uhid || issuedToken.uhid || 'N/A';
    const patPhone = pat.phone || issuedToken.phone || 'N/A';
    const patAge = pat.age ? `${pat.age} yrs` : (pat.dob ? `${new Date().getFullYear() - new Date(pat.dob).getFullYear()} yrs` : 'N/A');
    const patGender = pat.gender || 'N/A';
    const patDob = pat.dob ? new Date(pat.dob).toLocaleDateString() : 'N/A';
    const complaints = issuedToken.chiefComplaints || chiefComplaints || pat.chiefComplaints || 'OPD Consultation';
    const docName = issuedToken.doctorId?.name ? `Dr. ${issuedToken.doctorId.name.replace(/^Dr\.\s*/i, '')}` : (selectedDoctor?.name ? `Dr. ${selectedDoctor.name.replace(/^Dr\.\s*/i, '')}` : 'Assigned OPD Doctor');
    const cabin = issuedToken.cabinNo || selectedDoctor?.cabinNo || issuedToken.doctorId?.cabinNo || 'Cabin 101';
    const hospName = user?.hospitalName || 'METRO GENERAL HOSPITAL';
    const issueTime = new Date(issuedToken.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const issueDate = new Date(issuedToken.createdAt || Date.now()).toLocaleDateString();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>OPD Token #${issuedToken.tokenNumber} - ${patName}</title>
          <style>
            @page { size: 80mm auto; margin: 4mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 10px; margin: 0; text-align: center; color: #0f172a; background: #fff; }
            .token-card { border: 2px dashed #4338ca; border-radius: 12px; padding: 14px; margin: auto; max-width: 320px; box-sizing: border-box; }
            .hosp-title { font-size: 15px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; color: #1e1b4b; }
            .sub-title { font-size: 10px; color: #475569; font-weight: 800; margin-top: 2px; text-transform: uppercase; letter-spacing: 1px; }
            .divider { border-bottom: 1px solid #cbd5e1; margin: 10px 0; }
            .token-label { font-size: 11px; font-weight: 800; color: #475569; letter-spacing: 1.5px; text-transform: uppercase; }
            .token-num { font-size: 52px; font-weight: 900; color: #3730a3; margin: 4px 0; line-height: 1; font-family: monospace; }
            .cabin-badge { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 800; margin-top: 2px; }
            .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: left; font-size: 11px; line-height: 1.6; margin-top: 12px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .info-label { color: #64748b; font-weight: 600; }
            .info-val { font-weight: 700; color: #0f172a; text-align: right; }
            .uhid-val { font-family: monospace; font-weight: 900; color: #4338ca; }
            .footer-msg { font-size: 10px; color: #64748b; margin-top: 12px; line-height: 1.4; }
            @media print {
              body { padding: 0; }
              .token-card { border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="token-card">
            <h2 class="hosp-title">${hospName}</h2>
            <div class="sub-title">OPD Queue Token Slip</div>
            <div class="divider"></div>
            <div class="token-label">OPD TOKEN NUMBER</div>
            <div class="token-num">#${issuedToken.tokenNumber}</div>
            <div class="cabin-badge">Room: ${cabin}</div>
            <div class="info-box">
              <div class="info-row"><span class="info-label">Patient Name:</span> <span class="info-val">${patName}</span></div>
              <div class="info-row"><span class="info-label">UHID:</span> <span class="uhid-val">${patUhid}</span></div>
              <div class="info-row"><span class="info-label">Mobile Phone:</span> <span class="info-val">${patPhone}</span></div>
              <div class="info-row"><span class="info-label">Age / Gender:</span> <span class="info-val">${patAge} &bull; ${patGender}</span></div>
              <div class="info-row"><span class="info-label">Date of Birth:</span> <span class="info-val">${patDob}</span></div>
              <div class="info-row"><span class="info-label">Chief Complaint:</span> <span class="info-val">${complaints}</span></div>
              <div class="info-row"><span class="info-label">Doctor:</span> <span class="info-val">${docName}</span></div>
              <div class="info-row"><span class="info-label">Date & Time:</span> <span class="info-val">${issueDate} ${issueTime}</span></div>
            </div>
            <div class="footer-msg">Please wait in the reception lobby.<br/>Your token will be announced shortly.</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const resolvedPatient = issuedToken ? ((typeof issuedToken.patientId === 'object' && issuedToken.patientId) ? issuedToken.patientId : (selectedPatient || {})) : null;
  const resolvedPatName = resolvedPatient?.firstName ? `${resolvedPatient.firstName} ${resolvedPatient.lastName || ''}`.trim() : (issuedToken?.patientName || 'Patient');
  const resolvedDoctorName = issuedToken?.doctorId?.name ? `Dr. ${issuedToken.doctorId.name.replace(/^Dr\.\s*/i, '')}` : (selectedDoctor?.name ? `Dr. ${selectedDoctor.name.replace(/^Dr\.\s*/i, '')}` : 'Assigned Doctor');

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-container max-w-lg" onClick={(e) => e.stopPropagation()}>

        {/* Sticky Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex-shrink-0">
              <Ticket size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">Issue OPD Queue Token</h3>
              <p className="text-xs text-slate-500 mt-0.5">Assign patient to doctor's live queue</p>
            </div>
          </div>
          <button onClick={handleReset} className="modal-close-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="modal-body">
          {issuedToken ? (
            <div className="text-center space-y-4 py-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle size={26} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">OPD Token Issued & Broadcasted!</h3>
                <p className="text-xs text-slate-500 mt-0.5">The doctor's queue and live display have been updated.</p>
              </div>

              {/* Token Slip Preview Card */}
              <div className="p-4 rounded-xl bg-white border-2 border-dashed border-indigo-200 text-center shadow-xs space-y-3">
                <div className="border-b border-slate-100 pb-2">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{user?.hospitalName || 'HOSPITAL CLINIC'}</p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">OPD Token Card</p>
                </div>
                <div>
                  <span className="text-[11px] text-indigo-500 uppercase font-extrabold tracking-widest">Token Number</span>
                  <p className="text-5xl font-black text-indigo-700 mt-1 tabular-nums">#{issuedToken.tokenNumber}</p>
                  <span className="inline-block mt-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    Room: {issuedToken.cabinNo || selectedDoctor?.cabinNo || 'Cabin 101'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5 divide-y divide-slate-100">
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="text-slate-500">Patient Name:</span>
                    <span className="font-bold text-slate-900">{resolvedPatName}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5">
                    <span className="text-slate-500">UHID:</span>
                    <span className="font-mono font-black text-indigo-700">{resolvedPatient?.uhid || issuedToken.uhid || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5">
                    <span className="text-slate-500">Mobile Phone:</span>
                    <span className="font-bold text-slate-800">{resolvedPatient?.phone || issuedToken.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5">
                    <span className="text-slate-500">Age & Gender:</span>
                    <span className="font-medium text-slate-800">
                      {resolvedPatient?.age ? `${resolvedPatient.age} yrs` : (resolvedPatient?.dob ? `${new Date().getFullYear() - new Date(resolvedPatient.dob).getFullYear()} yrs` : 'N/A')} &bull; {resolvedPatient?.gender || 'N/A'}
                    </span>
                  </div>
                  {resolvedPatient?.dob && (
                    <div className="flex justify-between items-center pt-1.5">
                      <span className="text-slate-500">Date of Birth:</span>
                      <span className="font-medium text-slate-800">{new Date(resolvedPatient.dob).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1.5">
                    <span className="text-slate-500">Chief Complaint:</span>
                    <span className="font-medium text-amber-900">{issuedToken.chiefComplaints || chiefComplaints || resolvedPatient?.chiefComplaints || 'OPD Check-up'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5">
                    <span className="text-slate-500">Doctor:</span>
                    <span className="font-semibold text-slate-800">{resolvedDoctorName}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5">
                    <span className="text-slate-500">Issued At:</span>
                    <span className="font-medium text-slate-600">
                      {new Date(issuedToken.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(issuedToken.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" className="w-full font-bold text-xs" onClick={handleReset}>
                  Close & Done
                </Button>
                <Button
                  variant="primary"
                  className="w-full font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm"
                  onClick={handlePrintToken}
                >
                  <Printer size={15} /> Print Token Card
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              {/* Patient Selection / Recently Registered Dropdown & Search */}
              {!selectedPatient ? (
                <div className="space-y-3">
                  {/* Recently Registered Roster Dropdown */}
                  {patients.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                        <span>Select Recently Registered Patient</span>
                        <span className="text-[10px] text-indigo-600 font-bold">Quick Select Dropdown</span>
                      </label>
                      <select
                        value={selectedPatient?._id || ''}
                        onChange={(e) => {
                          const chosen = patients.find((p) => String(p._id) === String(e.target.value));
                          if (chosen) {
                            setSelectedPatient(chosen);
                            setChiefComplaints(chosen.chiefComplaints || '');
                            setSearchQuery(chosen.uhid);
                          }
                        }}
                        className="w-full glass-input rounded-lg px-3.5 py-2 text-sm text-slate-900 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 bg-white border border-slate-200"
                      >
                        <option value="">-- Choose from Recently Registered Patients --</option>
                        {patients.slice(0, 15).map((pat) => (
                          <option key={pat._id} value={pat._id}>
                            {pat.firstName} {pat.lastName} ({pat.uhid}) — {pat.phone}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Search Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                      Search Patient by UHID / Phone / Name
                    </label>
                    <div className="relative">
                      <Input
                        placeholder="Type UHID (e.g. HOSP-2026-00001), Mobile, or Name..."
                        value={searchQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSearchQuery(val);
                          const exactMatch = patients.find(
                            (p) => p.uhid?.toLowerCase() === val.trim().toLowerCase()
                          );
                          if (exactMatch) {
                            setSelectedPatient(exactMatch);
                            setChiefComplaints(exactMatch.chiefComplaints || '');
                          }
                        }}
                        icon={Search}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Search Results Dropdown List */}
                  {searchQuery.trim() !== '' && (
                    <div className="max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-lg">
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((pat) => (
                          <div
                            key={pat._id}
                            onClick={() => {
                              setSelectedPatient(pat);
                              setChiefComplaints(pat.chiefComplaints || '');
                              setSearchQuery(pat.uhid);
                            }}
                            className="p-3 hover:bg-indigo-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                          >
                            <div>
                              <p className="font-bold text-slate-900">{pat.firstName} {pat.lastName}</p>
                              <p className="text-slate-500 text-[11px]">Mobile: {pat.phone}</p>
                            </div>
                            <span className="font-mono font-bold text-indigo-700 text-[11px] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              {pat.uhid}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-500">
                          No matching patient found with UHID or Mobile Number.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Selected Patient Card & Quick Switcher Dropdown */
                <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-xs">
                        <UserCheck size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          {selectedPatient.firstName} {selectedPatient.lastName}
                        </p>
                        <p className="text-xs text-slate-600">
                          UHID: <span className="font-mono text-indigo-700 font-bold">{selectedPatient.uhid}</span> &bull; Mobile: {selectedPatient.phone}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPatient(null);
                        setSearchQuery('');
                      }}
                      className="text-xs text-slate-600 hover:text-indigo-700 flex items-center gap-1 font-semibold bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors shadow-2xs"
                    >
                      <RefreshCw size={11} /> Change
                    </button>
                  </div>

                  {patients.length > 0 && (
                    <div className="pt-2 border-t border-indigo-100/80">
                      <label className="block text-[10px] text-slate-500 mb-1 font-semibold">
                        Switch patient from Recently Registered Roster:
                      </label>
                      <select
                        value={selectedPatient?._id || ''}
                        onChange={(e) => {
                          const chosen = patients.find((p) => String(p._id) === String(e.target.value));
                          if (chosen) {
                            setSelectedPatient(chosen);
                            setChiefComplaints(chosen.chiefComplaints || '');
                            setSearchQuery(chosen.uhid);
                          }
                        }}
                        className="w-full text-xs bg-white text-slate-800 rounded-lg px-2.5 py-1.5 border border-indigo-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {patients.slice(0, 15).map((pat) => (
                          <option key={pat._id} value={pat._id}>
                            {pat.firstName} {pat.lastName} ({pat.uhid}) — {pat.phone}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Doctor Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Stethoscope size={13} className="text-indigo-500" /> Assigned Doctor
                  {isDoctorLocked && <span className="ml-1 text-amber-600 text-[10px] flex items-center gap-0.5 font-medium"><Lock size={10} /> Pre-assigned</span>}
                </label>
                {isDoctorLocked && selectedDoctor ? (
                  <div className="w-full bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 text-sm font-bold text-amber-900 flex items-center justify-between">
                    <span>{selectedDoctor.name?.startsWith('Dr.') ? selectedDoctor.name : `Dr. ${selectedDoctor.name}`} — {selectedDoctor.specialization || 'General OPD'}</span>
                    <span className="text-amber-600 text-[10px] flex items-center gap-0.5 font-bold"><Lock size={10} /> Fixed</span>
                  </div>
                ) : (
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full glass-input rounded-lg px-3.5 py-2 text-sm text-slate-900 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  >
                    {doctors.length > 0 ? (
                      doctors.map((doc) => {
                        const isAvail = doc.isAvailable !== false;
                        const statusTag = isAvail
                          ? ` (🟢 Available - ${doc.cabinNo || 'Cabin 101'})`
                          : ' (🔴 Off Duty)';
                        return (
                          <option key={doc._id} value={doc._id}>
                            {doc.name?.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`} — {doc.specialization || 'General OPD'}{statusTag}
                          </option>
                        );
                      })
                    ) : (
                      <option value="">No doctors registered in roster</option>
                    )}
                  </select>
                )}
                {selectedDoctor && selectedDoctor.isAvailable === false && (
                  <div className="mt-1.5 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-center gap-1.5 font-bold">
                    <AlertCircle size={14} className="flex-shrink-0 text-red-600" />
                    This doctor is currently OFFLINE. Please select an AVAILABLE doctor from the dropdown above.
                  </div>
                )}
              </div>

              <Input
                label="Chief Complaint / Purpose of Visit"
                placeholder="e.g. Fever, Chest tightness, Routine checkup..."
                value={chiefComplaints}
                onChange={(e) => setChiefComplaints(e.target.value)}
              />

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="w-1/2" onClick={handleReset}>Cancel</Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-1/2 font-bold"
                  isLoading={isLoading}
                  disabled={!selectedPatient || (selectedDoctor && selectedDoctor.isAvailable === false)}
                >
                  Generate Token #
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
