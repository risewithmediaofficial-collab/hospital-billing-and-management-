import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { RegisterPatientModal } from '../../components/modals/RegisterPatientModal';
import { IssueTokenModal } from '../../components/modals/IssueTokenModal';
import { SoloDoctorFlowBar } from '../../components/common/SoloDoctorFlowBar';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceModeStore } from '../../store/workspaceModeStore';
import {
  UserPlus,
  Users,
  Search,
  CheckCircle,
  AlertCircle,
  Ticket,
  ArrowLeft,
  RefreshCw,
  Phone,
  MapPin,
  Calendar,
  UserCheck,
} from 'lucide-react';

export const PatientRegistrationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isDualModeEligible } = useWorkspaceModeStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTokenOpen, setIsTokenOpen] = useState(false);
  const [selectedPatientForToken, setSelectedPatientForToken] = useState(null);
  const [duplicates, setDuplicates] = useState([]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    gender: 'MALE',
    dob: '1995-01-01',
    phone: '',
    address: '',
    chiefComplaints: '',
    bloodGroup: 'O+',
    category: 'GENERAL',
    guardianName: '',
    guardianPhone: '',
    guardianRelationship: 'FATHER',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [lastCreatedPatient, setLastCreatedPatient] = useState(null);

  const [recentPatients, setRecentPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRecentPatients();
  }, []);

  const fetchRecentPatients = async () => {
    try {
      const res = await axiosClient.get('/patients');
      const list = Array.isArray(res) ? res : res?.data || [];
      setRecentPatients(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load patients list:', err);
      setRecentPatients([]);
    }
  };

  const handleInlineSubmit = async (e, issueToken = false, force = false) => {
    if (e) e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim() || !formData.guardianPhone.trim()) {
      setError('First name, last name, patient mobile number, and guardian mobile number are required.');
      return;
    }
    if (formData.phone.trim() === formData.guardianPhone.trim()) {
      setError('Guardian mobile number must be different from the patient mobile number.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setDuplicates([]);
    setSuccessMessage(null);
    try {
      const payload = { ...formData, allowForce: force };
      const res = await axiosClient.post('/patients', payload);
      const newPat = res.data;
      setLastCreatedPatient(newPat);
      setSuccessMessage(`Patient registered with UHID ${newPat.uhid}. Patient login: ${newPat.patientCredentials?.username}. Guardian login: ${newPat.guardianCredentials?.username}.`);
      
      // Reset form
      setFormData({
        firstName: '', lastName: '', age: '', gender: 'MALE', dob: '1995-01-01',
        phone: '', address: '', chiefComplaints: '', bloodGroup: 'O+', category: 'GENERAL',
        guardianName: '', guardianPhone: '', guardianRelationship: 'FATHER',
      });
      fetchRecentPatients();

      if (issueToken) {
        setSelectedPatientForToken(newPat);
        setIsTokenOpen(true);
      }
    } catch (err) {
      const status = err.response?.status || err.status || err.statusCode;
      const respData = err.response?.data?.data || err.data;
      if (status === 409 && Array.isArray(respData) && respData.length > 0) {
        setDuplicates(respData);
        setError('A patient with matching details already exists in this hospital database. Review the duplicate below or confirm to register as a new person.');
      } else {
        setError(err.response?.data?.error?.message || err.error?.message || 'Failed to register patient. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPatients = recentPatients.filter(
    (p) =>
      p.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.uhid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/reception/dashboard')}
            className="mb-2 gap-1.5 font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs"
          >
            <ArrowLeft size={14} /> Back to Reception Desk
          </Button>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserPlus size={26} className="text-indigo-600" />
            Patient Registration Station
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            UHID Auto-Sequencing, Demographics Intake & Quick Token Generation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchRecentPatients} className="font-bold gap-1 text-xs">
            <RefreshCw size={14} /> Refresh Roster
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="font-bold gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <UserPlus size={16} /> Open Registration Modal
          </Button>
        </div>
      </div>

      {/* Solo Doctor Patient Journey Quick-Action Flow Bar */}
      {isDualModeEligible(user) && (
        <SoloDoctorFlowBar activeStepOverride="register" />
      )}

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          {lastCreatedPatient && (
            <Button
              size="sm"
              variant="primary"
              className="gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                setSelectedPatientForToken(lastCreatedPatient);
                setIsTokenOpen(true);
              }}
            >
              <Ticket size={14} /> Issue OPD Token Now
            </Button>
          )}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          {error}
        </div>
      )}

      {/* Duplicate Conflict Review Box */}
      {duplicates.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-xs text-amber-900 flex items-center gap-1.5">
              <AlertCircle size={16} className="text-amber-600" />
              Existing Patient(s) with Matching Details Found ({duplicates.length})
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200/80 text-amber-800 border border-amber-300">
              POSSIBLE DUPLICATE
            </span>
          </div>

          <div className="space-y-2">
            {duplicates.map((dup) => (
              <div key={dup._id} className="p-3 bg-white rounded-lg border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
                <div>
                  <p className="font-bold text-slate-900 flex items-center gap-2">
                    <span>{dup.firstName} {dup.lastName}</span>
                    <span className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 text-[11px] font-black">{dup.uhid}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Phone: <span className="font-bold text-slate-700">{dup.phone}</span> &bull; DOB: {dup.dob ? new Date(dup.dob).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="font-bold text-xs text-indigo-700 border-indigo-300 hover:bg-indigo-50 gap-1"
                    onClick={() => {
                      setSelectedPatientForToken(dup);
                      setIsTokenOpen(true);
                      setDuplicates([]);
                      setError(null);
                    }}
                  >
                    <Ticket size={14} /> Use This Patient & Issue Token
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-[11px] text-amber-800">
              Is this a different individual with the same mobile or name?
            </p>
            <Button
              size="sm"
              variant="primary"
              className="bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs"
              onClick={(e) => handleInlineSubmit(e, false, true)}
            >
              Confirm & Register Anyway
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form: Patient Registration Form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus size={18} className="text-indigo-600" />
                  New Patient Intake & Registration Form
                </h3>
                <p className="text-xs text-slate-500">Fill in patient details to generate permanent hospital record and UHID.</p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                UHID AUTO-GENERATION ENABLED
              </span>
            </div>

            <form onSubmit={(e) => handleInlineSubmit(e, false)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="First Name *"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Your Name"
                  required
                />
                <Input
                  label="Last Name *"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Enter last name"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <Input
                  label="Age *"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  placeholder="35"
                  required
                />

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Blood Group</label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Mobile / Phone Number *"
                  icon={Phone}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Residential Address"
                  icon={MapPin}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter residential address"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Chief Complaints / Reason for Visit"
                  value={formData.chiefComplaints}
                  onChange={(e) => setFormData({ ...formData, chiefComplaints: e.target.value })}
                  placeholder="Enter chief complaints"
                />
              </div>

              {/* Guardian / Attendant Auto-Provisioning Section */}
              <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-purple-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <UserCheck size={16} className="text-purple-600" />
                    Guardian / Attendant Account
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                    AUTO-LINKED TO GUARDIAN PORTAL
                  </span>
                </div>
                <p className="text-[11px] text-purple-700">
                  Patient login: patient mobile for username and password. Guardian login: patient mobile as username and guardian mobile as password.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Guardian / Relative Name"
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    placeholder="Your Name"
                  />
                  <Input
                    label="Guardian Mobile Number"
                    icon={Phone}
                    value={formData.guardianPhone}
                    onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Relationship</label>
                    <select
                      value={formData.guardianRelationship}
                      onChange={(e) => setFormData({ ...formData, guardianRelationship: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15"
                    >
                      <option value="FATHER">Father</option>
                      <option value="MOTHER">Mother</option>
                      <option value="SPOUSE">Spouse</option>
                      <option value="SIBLING">Sibling</option>
                      <option value="CHILD">Child</option>
                      <option value="LEGAL_GUARDIAN">Legal Guardian</option>
                      <option value="CARETAKER">Caretaker / Attendant</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setFormData({
                      firstName: '', lastName: '', age: '', gender: 'MALE', dob: '1995-01-01',
                      phone: '', address: '', chiefComplaints: '', bloodGroup: 'O+', category: 'GENERAL',
                      guardianName: '', guardianPhone: '', guardianRelationship: 'FATHER',
                    })
                  }
                  className="w-full sm:w-auto font-medium text-xs"
                >
                  Clear Form
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  className="w-full sm:w-auto font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs px-5 py-2"
                >
                  <UserPlus size={16} /> Register Patient
                </Button>

                <Button
                  type="button"
                  variant="success"
                  isLoading={isLoading}
                  onClick={(e) => handleInlineSubmit(e, true)}
                  className="w-full sm:w-auto font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs px-5 py-2"
                >
                  <Ticket size={16} /> Save & Issue OPD Token
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Sidebar: Registered Patients List */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Users size={16} className="text-indigo-600" />
                Registered Roster ({recentPatients.length})
              </h3>
              <button
                onClick={() => navigate('/reception/registered-patients')}
                className="text-[11px] font-bold text-indigo-600 hover:underline"
              >
                View Full Directory &rarr;
              </button>
            </div>

            <div className="mb-3 relative">
              <Input
                placeholder="Search registered patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs py-1.5 pl-8"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((p) => (
                  <div
                    key={p._id}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-indigo-200 transition-colors flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{p.firstName} {p.lastName}</p>
                      <p className="text-[11px] font-mono text-indigo-600 font-bold">{p.uhid}</p>
                      <p className="text-[10px] text-slate-500">{p.phone} &bull; {p.gender}</p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="font-bold text-[10px] px-2 py-1 gap-1 text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                      onClick={() => {
                        setSelectedPatientForToken(p);
                        setIsTokenOpen(true);
                      }}
                    >
                      <Ticket size={12} /> Token
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  No registered patients found.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <RegisterPatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newPat) => {
          setLastCreatedPatient(newPat);
          setSuccessMessage(`Patient registered successfully! UHID: ${newPat.uhid}`);
          fetchRecentPatients();
        }}
        onIssueToken={(pat) => {
          setSelectedPatientForToken(pat);
          setIsTokenOpen(true);
        }}
      />

      <IssueTokenModal
        isOpen={isTokenOpen}
        onClose={() => setIsTokenOpen(false)}
        onSuccess={fetchRecentPatients}
        initialPatient={selectedPatientForToken}
      />
    </div>
  );
};

export default PatientRegistrationPage;
