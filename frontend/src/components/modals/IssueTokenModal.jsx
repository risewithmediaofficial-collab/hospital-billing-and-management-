import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, Ticket, CheckCircle, Search, UserCheck, RefreshCw, Stethoscope, Lock } from 'lucide-react';

export const IssueTokenModal = ({ isOpen, onClose, onSuccess, initialPatient = null, initialDoctorId = null }) => {
  useScrollLock(isOpen);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(initialPatient);
  const [selectedDoctorId, setSelectedDoctorId] = useState(initialDoctorId || '');
  const [chiefComplaints, setChiefComplaints] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [issuedToken, setIssuedToken] = useState(null);
  const [error, setError] = useState(null);

  // Whether the doctor was pre-selected from a specific doctor's card (should be locked)
  const isDoctorLocked = Boolean(initialDoctorId);

  useEffect(() => {
    if (isOpen) {
      if (initialPatient) {
        setSelectedPatient(initialPatient);
      } else {
        setSelectedPatient(null);
        setSearchQuery('');
      }
      setSelectedDoctorId(initialDoctorId || '');
      setChiefComplaints('');
      setIssuedToken(null);
      setError(null);
      fetchPatientsAndDoctors();
    }
  }, [isOpen, initialPatient, initialDoctorId]);

  const fetchPatientsAndDoctors = async () => {
    try {
      const pRes = await axiosClient.get('/patients');
      setPatients(pRes.data || []);

      const sRes = await axiosClient.get('/auth/staff');
      const allDocs = (sRes.data || []).filter((s) => s.role === 'DOCTOR');
      setDoctors(allDocs);

      const activeDocs = allDocs.filter((d) => d.isAvailable !== false);

      // Only auto-select first doctor if NO initialDoctorId was passed
      if (!initialDoctorId && activeDocs.length > 0) {
        setSelectedDoctorId(activeDocs[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch data for token issuance:', err);
    }
  };

  if (!isOpen) return null;

  const activeDoctors = doctors.filter((d) => d.isAvailable !== false);

  const filteredPatients = searchQuery.trim()
    ? patients.filter(
        (p) =>
          p.uhid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Get the selected doctor's name for display
  const selectedDoctor = doctors.find((d) => d._id === selectedDoctorId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError('Please search and select a registered patient first.');
      return;
    }
    if (!selectedDoctorId) {
      setError('Please select a doctor to assign this token to.');
      return;
    }

    if (selectedDoctor && selectedDoctor.isAvailable === false) {
      setError('This doctor is currently unavailable. Please select another available doctor.');
      return;
    }

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="max-w-md w-full glass-panel rounded-2xl p-6 relative border border-sky-500/30">
        <button onClick={handleReset} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X size={20} />
        </button>

        {issuedToken ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle size={28} />
            </div>
            <h3 className="text-xl font-bold text-white">OPD Token Issued & Broadcasted!</h3>
            <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-center">
              <span className="text-xs text-sky-400 uppercase font-bold tracking-widest">Token Number</span>
              <p className="text-4xl font-black text-white mt-1">#{issuedToken.tokenNumber}</p>
              <p className="text-xs text-slate-300 mt-1">
                Assigned Doctor: <span className="text-sky-400 font-bold">{issuedToken.doctorId?.name || 'Assigned OPD Doctor'}</span> ({issuedToken.cabinNo || 'Cabin 102'})
              </p>
            </div>
            <Button variant="primary" className="w-full font-bold" onClick={handleReset}>
              Done & Print Token Slip
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Ticket className="text-sky-400" size={22} />
              <h3 className="text-lg font-bold text-white">Issue OPD Queue Token</h3>
            </div>

            {error && <div className="p-2.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>}

            {/* Patient Search / Selection Section */}
            {!selectedPatient ? (
              <div className="space-y-2 relative">
                <div className="relative">
                  <Input
                    placeholder="Type Patient UHID, Mobile Number, or Name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="py-2.5 text-xs pl-9 pr-3"
                    autoFocus
                  />
                  <Search size={16} className="absolute left-3 top-3 text-sky-400" />
                </div>

                {/* Dropdown Results */}
                {searchQuery.trim() !== '' && (
                  <div className="max-h-48 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl divide-y divide-slate-800 shadow-xl">
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((pat) => (
                        <div
                          key={pat._id}
                          onClick={() => {
                            setSelectedPatient(pat);
                            setChiefComplaints(pat.chiefComplaints || '');
                            setSearchQuery('');
                          }}
                          className="p-3 hover:bg-sky-500/10 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <p className="font-bold text-white">{pat.firstName} {pat.lastName}</p>
                            <p className="text-[11px] text-slate-400">Mobile: {pat.phone}</p>
                          </div>
                          <span className="font-mono font-bold text-sky-400 text-[11px] bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                            {pat.uhid}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No matching patient found with UHID or Mobile Number.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Patient Display Card */
              <div className="p-3.5 rounded-xl bg-slate-900 border border-sky-500/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                    <p className="text-xs text-slate-400">
                      UHID: <span className="font-mono text-sky-400 font-bold">{selectedPatient.uhid}</span> • Mobile: <span className="text-slate-300">{selectedPatient.phone}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="text-xs text-slate-400 hover:text-sky-400 flex items-center gap-1 font-medium bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-sky-500/40 transition-colors"
                >
                  <RefreshCw size={12} /> Change
                </button>
              </div>
            )}

            {/* Doctor Selection — Locked if came from a specific doctor's card */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <Stethoscope size={14} className="text-sky-400" /> Assigned Doctor / Clinic Cabin
                {isDoctorLocked && <span className="ml-1 text-amber-400 text-[10px] flex items-center gap-0.5"><Lock size={10} /> Pre-assigned</span>}
              </label>

              {isDoctorLocked && selectedDoctor ? (
                /* Locked display when from a doctor's card */
                <div className="w-full glass-input rounded-lg p-2.5 text-xs text-white bg-slate-900/80 border border-amber-500/30 font-medium flex items-center justify-between">
                  <span className="text-white font-bold">
                    Dr. {selectedDoctor.name} — {selectedDoctor.specialization || 'General OPD Clinic'}
                  </span>
                  <span className="text-amber-400 text-[10px] flex items-center gap-0.5">
                    <Lock size={10} /> Fixed
                  </span>
                </div>
              ) : (
                /* Editable dropdown for general token issuance */
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full glass-input rounded-lg p-2.5 text-xs text-white bg-slate-900 border border-slate-700 font-medium"
                >
                  {activeDoctors.length > 0 ? (
                    activeDoctors.map((doc) => (
                      <option key={doc._id} value={doc._id} className="bg-slate-900 text-white">
                        🟢 Dr. {doc.name} — {doc.specialization || 'General OPD Clinic'}
                      </option>
                    ))
                  ) : (
                    <option value="" className="bg-slate-900 text-slate-400">No active/available doctors online</option>
                  )}
                </select>
              )}
            </div>

            {/* Chief Complaints Input */}
            <Input
              label="Chief Complaint / Purpose of Visit"
              placeholder="e.g. Fever, Chest tightness, Routine checkup..."
              value={chiefComplaints}
              onChange={(e) => setChiefComplaints(e.target.value)}
              className="py-2.5 text-xs"
            />

            <div className="pt-2 flex gap-2">
              <Button type="button" variant="outline" className="w-1/2" onClick={handleReset}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="w-1/2 font-bold" isLoading={isLoading} disabled={!selectedPatient}>
                Generate Token #
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
