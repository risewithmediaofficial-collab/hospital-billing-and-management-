import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ROLES } from '../utils/constants';
import { Lock, Mail, Building2, PlusCircle, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
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
    } catch (err) {
      // Error handled in store
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-lg mb-5 border border-indigo-500">
            <Building2 size={30} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">HPMBS Enterprise</h1>
          <p className="mt-1.5 text-sm text-slate-500 font-medium">Multi-Tenant Hospital Management Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Sign in to your workstation</h2>
            <p className="text-xs text-slate-500 mt-0.5">Enter your credentials to access your assigned module.</p>
          </div>

          <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <Input
              label="Account Email Address"
              type="email"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              autoComplete="off"
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
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

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 font-bold mt-2"
              isLoading={isLoading}
            >
              Sign In to Workstation
            </Button>
          </form>

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
