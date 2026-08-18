import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';

export const RegisterPatientModal = ({ isOpen, onClose, onSuccess, onIssueToken }) => {
  useScrollLock(isOpen);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', age: '', gender: 'MALE',
    dob: '1995-01-01', phone: '', address: '', guardianPhone: '',
    chiefComplaints: '', bloodGroup: 'O+', category: 'GENERAL',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [createdPatient, setCreatedPatient] = useState(null);
  const [error, setError] = useState(null);
  const [shouldIssueTokenImmediately, setShouldIssueTokenImmediately] = useState(false);

  const [duplicates, setDuplicates] = useState([]);
  const [isExactDuplicate, setIsExactDuplicate] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e, issueToken = false, force = false) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError(null);
    setDuplicates([]);
    setIsExactDuplicate(false);
    try {
      const response = await axiosClient.post('/patients', { ...formData, allowForce: force });
      const newPat = response.data;
      setCreatedPatient(newPat);
      if (onSuccess) onSuccess(newPat);

      if (issueToken) {
        onClose();
        if (onIssueToken) onIssueToken(newPat);
      }
    } catch (err) {
      const status = err.response?.status || err.status || err.statusCode;
      const respData = err.response?.data?.existingRecords || err.response?.data?.data || err.response?.data?.details || err.data;
      const isExact = Boolean(err.response?.data?.exactDuplicate || err.response?.data?.code === 'EXACT_DUPLICATE_FORBIDDEN');
      setIsExactDuplicate(isExact);

      if ((status === 409 || err.response?.data?.code === 'POSSIBLE_DUPLICATE' || err.response?.data?.possibleDuplicate || isExact) && Array.isArray(respData) && respData.length > 0) {
        setDuplicates(respData);
        if (isExact) {
          setError(`Exact Match Found: A patient with this Mobile Number and Date of Birth (${respData[0]?.firstName} ${respData[0]?.lastName}, UHID: ${respData[0]?.uhid}) is already registered.`);
        } else {
          setError('A patient with matching details already exists in this hospital database.');
        }
      } else {
        setError(err.response?.data?.message || err.response?.data?.error?.message || err.error?.message || 'Failed to register patient');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCreatedPatient(null);
    setFormData({ firstName: '', lastName: '', age: '', gender: 'MALE', dob: '1995-01-01', phone: '', address: '', guardianPhone: '', chiefComplaints: '', bloodGroup: 'O+', category: 'GENERAL' });
    onClose();
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-container max-w-md" onClick={(e) => e.stopPropagation()}>

        {/* Sticky Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex-shrink-0">
              <UserPlus size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">New Patient Intake & Registration Form</h3>
              <p className="text-xs text-slate-500 mt-0.5">Fill in patient details to generate permanent hospital record and UHID.</p>
            </div>
          </div>
          <button onClick={handleReset} className="modal-close-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="modal-body">
          {createdPatient ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle size={30} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Patient Registered Successfully!</h3>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Assigned UHID:</span>
                  <span className="font-mono font-black text-indigo-700 text-base tracking-wider">{createdPatient.uhid}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Name:</span>
                  <span className="font-bold text-slate-900">{createdPatient.firstName} {createdPatient.lastName}</span>
                </div>
                {createdPatient.age && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Age:</span>
                    <span className="text-slate-700">{createdPatient.age} Years</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="text-slate-700">{createdPatient.phone}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-200 space-y-1">
                  <p className="font-bold text-indigo-700">Patient login</p>
                  <p>Username: {createdPatient.patientCredentials?.username}</p>
                  <p>Password: {createdPatient.patientCredentials?.password}</p>
                  <p className="font-bold text-purple-700 pt-1">Guardian login</p>
                  <p>Username: {createdPatient.guardianCredentials?.username}</p>
                  <p>Password: {createdPatient.guardianCredentials?.password}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <Button variant="outline" className="w-full font-bold text-xs" onClick={handleReset}>
                  Saved to Registered List
                </Button>
                {onIssueToken && (
                  <Button
                    variant="primary"
                    className="w-full font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      const pat = createdPatient;
                      handleReset();
                      onIssueToken(pat);
                    }}
                  >
                    Issue OPD Token Now
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => handleSubmit(e, shouldIssueTokenImmediately)} autoComplete="off" className="space-y-3.5">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              {duplicates.length > 0 && (
                <div className={`p-3 rounded-xl border space-y-2 text-xs ${
                  isExactDuplicate ? 'bg-rose-50 border-rose-300' : 'bg-amber-50 border-amber-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-bold flex items-center gap-1 ${
                      isExactDuplicate ? 'text-rose-900' : 'text-amber-900'
                    }`}>
                      <AlertCircle size={14} className={isExactDuplicate ? 'text-rose-600' : 'text-amber-600'} />
                      {isExactDuplicate ? 'Exact Existing Record Found (Same Phone & DOB)' : `Existing Record Found (${duplicates.length})`}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isExactDuplicate ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'
                    }`}>
                      {isExactDuplicate ? 'DUPLICATE FORBIDDEN' : 'MATCH'}
                    </span>
                  </div>
                  {duplicates.map((dup) => (
                    <div key={dup._id} className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-900">{dup.firstName} {dup.lastName} <span className="font-mono text-indigo-700 font-black">({dup.uhid})</span></p>
                        <p className="text-[10px] text-slate-500">Phone: {dup.phone} &bull; DOB: {dup.dob ? new Date(dup.dob).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      {onIssueToken && (
                        <Button
                          size="sm"
                          type="button"
                          variant="primary"
                          className="text-[10px] py-1 px-2 font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                          onClick={() => {
                            onClose();
                            onIssueToken(dup);
                          }}
                        >
                          Use Patient
                        </Button>
                      )}
                    </div>
                  ))}
                  {!isExactDuplicate && (
                    <div className="pt-1 text-right">
                      <Button
                        size="sm"
                        type="button"
                        variant="primary"
                        className="text-xs bg-amber-700 hover:bg-amber-800 text-white font-bold py-1 px-2.5"
                        onClick={(e) => handleSubmit(e, shouldIssueTokenImmediately, true)}
                      >
                        Confirm & Force Register
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input label="First Name" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required placeholder="John" />
                <Input label="Last Name" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required placeholder="Doe" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Age (Years) *"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  placeholder="e.g. 32"
                  required
                />
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full glass-input rounded-lg px-3 py-2 text-sm text-slate-900 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Phone Number *"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  placeholder="+91 98765 43210"
                />
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Date of Birth (DOB) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dob || ''}
                    onChange={(e) => {
                      const dobVal = e.target.value;
                      let calculatedAge = formData.age;
                      if (dobVal) {
                        const birthDate = new Date(dobVal);
                        const today = new Date();
                        let age = today.getFullYear() - birthDate.getFullYear();
                        const m = today.getMonth() - birthDate.getMonth();
                        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                          age--;
                        }
                        if (age >= 0) calculatedAge = String(age);
                      }
                      setFormData({ ...formData, dob: dobVal, age: calculatedAge });
                    }}
                    className="w-full glass-input rounded-lg px-3 py-2 text-sm text-slate-900 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
              </div>

              <Input label="Chief Complaint / Reason for Visit" value={formData.chiefComplaints} onChange={(e) => setFormData({ ...formData, chiefComplaints: e.target.value })} placeholder="e.g. Fever, Routine OPD checkup" />
              <Input label="Residential Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Street address, city" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full font-bold text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  isLoading={isLoading && !shouldIssueTokenImmediately}
                  onClick={() => setShouldIssueTokenImmediately(false)}
                >
                  Register & Save Patient
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                  isLoading={isLoading && shouldIssueTokenImmediately}
                  onClick={() => setShouldIssueTokenImmediately(true)}
                >
                  Register & Issue Token
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
