import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ROLES } from '../utils/constants';
import { Lock, Mail, Building2, PlusCircle, AlertCircle, ShieldCheck, Eye, EyeOff, User, Users, Phone, Calendar, Hash } from 'lucide-react';

export const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('STAFF'); // 'STAFF' | 'PATIENT' | 'GUARDIAN'

  // Staff credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Patient credentials
  const [patientMobile, setPatientMobile] = useState('');
  const [patientDob, setPatientDob] = useState('');

  // Guardian credentials
  const [guardianMobile, setGuardianMobile] = useState('');
  const [guardianPatientMobile, setGuardianPatientMobile] = useState('');
  const [guardianUHID, setGuardianUHID] = useState('');

  const { login, patientLogin, guardianLogin, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleRouteRedirect = (user) => {
    const routes = {
      [ROLES.SUPER_ADMIN]: '/admin/dashboard',
      [ROLES.HOSPITAL_ADMIN]: '/hospital-admin/dashboard',
      [ROLES.DOCTOR]: '/doctor/dashboard',
      [ROLES.NURSE]: '/nursing/dashboard',
      [ROLES.NURSE_INCHARGE]: '/nurse-incharge/dashboard',
      [ROLES.RECEPTIONIST]: '/reception/dashboard',
      [ROLES.PHARMACIST]: '/pharmacy/dashboard',
      [ROLES.LAB_TECH]: '/laboratory/dashboard',
      [ROLES.RADIOLOGIST]: '/radiology/dashboard',
      [ROLES.CASHIER]: '/billing/dashboard',
      [ROLES.INVENTORY_MANAGER]: '/inventory/dashboard',
      [ROLES.HR_MANAGER]: '/hr/dashboard',
      [ROLES.PATIENT]: '/patient-portal/dashboard',
      [ROLES.GUARDIAN]: '/guardian-portal/dashboard',
    };
    navigate(routes[user.role] || '/');
  };

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      handleRouteRedirect(user);
    } catch (err) {
      // Error state handled in authStore
    }
  };

  const handlePatientLogin = async (e) => {
    e.preventDefault();
    try {
      const user = await patientLogin(patientMobile, patientDob);
      handleRouteRedirect(user);
    } catch (err) {
      // Error state handled in authStore
    }
  };

  const handleGuardianLogin = async (e) => {
    e.preventDefault();
    try {
      const user = await guardianLogin(guardianMobile, guardianPatientMobile, guardianUHID);
      handleRouteRedirect(user);
    } catch (err) {
      // Error state handled in authStore
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-indigo-100 opacity-60 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-slate-200 opacity-60 blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-lg mb-4 border border-indigo-500">
            <Building2 size={30} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">HPMBS Enterprise</h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">Multi-Tenant Hospital Management Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8">
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 mb-6 bg-slate-100/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('STAFF')}
              className={`flex-1 text-center py-2 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'STAFF'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShieldCheck size={14} />
              Staff / Admin
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PATIENT')}
              className={`flex-1 text-center py-2 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'PATIENT'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <User size={14} />
              Patient
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('GUARDIAN')}
              className={`flex-1 text-center py-2 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'GUARDIAN'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Users size={14} />
              Guardian
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* STAFF / ADMIN LOGIN FORM */}
          {activeTab === 'STAFF' && (
            <div>
              <div className="mb-4">
                <h2 className="text-base font-bold text-slate-900">Sign in to your Workstation</h2>
                <p className="text-xs text-slate-500">Enter your official hospital credentials to access your module.</p>
              </div>

              <form onSubmit={handleStaffLogin} autoComplete="off" className="space-y-4">
                <Input
                  label="Account Email / Phone / Login ID"
                  type="text"
                  icon={Mail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hospital.com or staff ID"
                  autoComplete="off"
                  required
                />

                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  icon={Lock}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="off"
                  required
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-indigo-600 focus:outline-none transition-colors p-1"
                      tabIndex={-1}
                      title={showPassword ? 'Hide Password' : 'Show Password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />

                <div className="flex items-center justify-end pt-0.5">
                  <Link to="/forgot-password" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 font-bold mt-2"
                  isLoading={isLoading}
                >
                  Sign In as Staff / Admin
                </Button>
              </form>
            </div>
          )}

          {/* PATIENT PORTAL LOGIN FORM */}
          {activeTab === 'PATIENT' && (
            <div>
              <div className="mb-4">
                <h2 className="text-base font-bold text-slate-900">Patient Portal Access</h2>
                <p className="text-xs text-slate-500">Log in using your registered Mobile Number and Date of Birth (No password required).</p>
              </div>

              <form onSubmit={handlePatientLogin} autoComplete="off" className="space-y-4">
                <Input
                  label="Registered Mobile Number"
                  type="text"
                  icon={Phone}
                  value={patientMobile}
                  onChange={(e) => setPatientMobile(e.target.value)}
                  placeholder="+91 98765 43210"
                  autoComplete="off"
                  required
                />

                <Input
                  label="Date of Birth (DOB)"
                  type="date"
                  icon={Calendar}
                  value={patientDob}
                  onChange={(e) => setPatientDob(e.target.value)}
                  autoComplete="off"
                  required
                />

                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-[11px] leading-relaxed">
                  💡 <strong>Patient Access:</strong> Use the mobile number registered during your hospital reception check-in and your birth date.
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 font-bold mt-2"
                  isLoading={isLoading}
                >
                  Access Patient Portal
                </Button>
              </form>
            </div>
          )}

          {/* GUARDIAN PORTAL LOGIN FORM */}
          {activeTab === 'GUARDIAN' && (
            <div>
              <div className="mb-4">
                <h2 className="text-base font-bold text-slate-900">Guardian Portal Access</h2>
                <p className="text-xs text-slate-500">Enter Guardian Mobile, Patient Mobile, and Patient UHID.</p>
              </div>

              <form onSubmit={handleGuardianLogin} autoComplete="off" className="space-y-4">
                <Input
                  label="Guardian Mobile Number"
                  type="text"
                  icon={Phone}
                  value={guardianMobile}
                  onChange={(e) => setGuardianMobile(e.target.value)}
                  placeholder="+91 98765 43210"
                  autoComplete="off"
                  required
                />

                <Input
                  label="Patient Mobile Number"
                  type="text"
                  icon={Phone}
                  value={guardianPatientMobile}
                  onChange={(e) => setGuardianPatientMobile(e.target.value)}
                  placeholder="+91 98765 43210"
                  autoComplete="off"
                  required
                />

                <Input
                  label="Patient UHID / Number"
                  type="text"
                  icon={Hash}
                  value={guardianUHID}
                  onChange={(e) => setGuardianUHID(e.target.value)}
                  placeholder="HOSP-2026-XXXXX-101"
                  autoComplete="off"
                  required
                />

                <div className="p-3 bg-purple-50 border border-purple-200 text-purple-800 rounded-xl text-[11px] leading-relaxed">
                  🔒 <strong>Guardian Security:</strong> Connect to your dependent's medical profile by verifying your guardian mobile with the patient's UHID.
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 font-bold mt-2"
                  isLoading={isLoading}
                >
                  Access Guardian Portal
                </Button>
              </form>
            </div>
          )}

          {/* HIPAA badge */}
          <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium">
            <ShieldCheck size={13} className="text-indigo-400" />
            HIPAA Compliant &bull; End-to-End Encrypted
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 text-center">
            <Link
              to="/register-hospital"
              className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline flex items-center justify-center gap-1.5 font-bold transition-colors"
            >
              <PlusCircle size={14} />
              Hospital Executive? Register your Hospital SaaS Tenant
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-slate-400 mt-5">
          &copy; {new Date().getFullYear()} HPMBS &bull; Trusted Healthcare IT Solutions
        </p>
      </div>
    </div>
  );
};
