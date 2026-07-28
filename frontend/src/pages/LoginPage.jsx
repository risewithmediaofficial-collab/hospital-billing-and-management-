import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ROLES } from '../utils/constants';
import { Lock, Mail, Building2, PlusCircle } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-xl shadow-sky-500/20 mb-4 border border-sky-400/30">
          <Building2 size={32} className="text-white" />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight">HPMBS Enterprise SaaS</h2>
        <p className="mt-1 text-sm text-slate-400">Multi-Tenant Hospital Management Platform</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <Card className="p-8">
          <form onSubmit={handleLogin} autoComplete="off" className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
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
              type="password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="off"
              required
            />

            <Button type="submit" variant="primary" className="w-full py-2.5 font-bold" isLoading={isLoading}>
              Sign In to Workstation
            </Button>
          </form>

          <div className="mt-6 text-center border-t border-slate-800/80 pt-4">
            <Link to="/register-hospital" className="text-xs text-sky-400 hover:underline flex items-center justify-center gap-1.5 font-bold">
              <PlusCircle size={15} /> Hospital Executive? Register your Hospital SaaS Tenant
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
