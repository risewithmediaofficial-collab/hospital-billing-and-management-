import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { axiosClient } from '../api/axiosClient';
import { Building2, ShieldCheck, CheckCircle, ArrowRight, Activity, Lock, Globe } from 'lucide-react';

export const HospitalRegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    hospitalName: '',
    subdomain: '',
    plan: 'PROFESSIONAL',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    licenseNumber: '',
    city: 'Metropolis',
    adminPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [registeredResult, setRegisteredResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosClient.post('/saas/register-hospital', formData);
      setRegisteredResult(response.data);
    } catch (err) {
      setError(err.error?.message || 'Failed to submit hospital application');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-2xl w-full relative z-10 my-8">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-3">
            <Activity size={14} /> Multi-Tenant Hospital SaaS Platform
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Register Your Hospital
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Apply for your dedicated enterprise Hospital Patient Management & Billing System tenant workspace.
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl">
          {registeredResult ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle size={36} />
              </div>
              <h2 className="text-2xl font-bold text-white">Application Submitted Successfully!</h2>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Your hospital application for <span className="font-bold text-sky-400">{registeredResult.hospital?.name}</span> has been received and is currently <span className="font-bold text-amber-400">PENDING_APPROVAL</span> by the Master Platform Super Admin.
              </p>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs space-y-2 max-w-lg mx-auto">
                <p><span className="text-slate-400">Assigned Subdomain:</span> <span className="font-mono font-bold text-sky-400">{registeredResult.hospital?.subdomain}.hpmbs.com</span></p>
                <p><span className="text-slate-400">Authorized Contact:</span> <span className="font-bold text-white">{registeredResult.hospital?.contactName} ({registeredResult.hospital?.contactEmail})</span></p>
                <p><span className="text-slate-400">Selected SaaS Plan:</span> <span className="font-bold text-purple-400">{registeredResult.hospital?.plan}</span></p>
              </div>

              <div className="pt-4 flex justify-center gap-4">
                <Link to="/login">
                  <Button variant="primary" className="font-bold">
                    Go to Platform Login <ArrowRight size={16} />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Hospital Name"
                  value={formData.hospitalName}
                  onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                  placeholder="Metro City General Hospital"
                  required
                />

                <Input
                  label="Target Subdomain / Code"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                  placeholder="metrocity"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[10px]">Select SaaS Plan</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full glass-input rounded-lg p-2.5 text-white font-bold"
                  >
                    <option value="STARTER" className="bg-slate-900">Starter Tier (Single Branch, 10 Staff)</option>
                    <option value="PROFESSIONAL" className="bg-slate-900">Professional Tier (Multi-Branch, 50 Staff)</option>
                    <option value="ENTERPRISE" className="bg-slate-900">Enterprise Tier (Unlimited Branches & ICU)</option>
                  </select>
                </div>

                <Input
                  label="Medical License Number"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  placeholder="HOSP-LIC-88402"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Contact Officer Name"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder="Dr. Sarah Jenkins"
                  required
                />

                <Input
                  label="Authorized Contact Email"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="admin@metrocityhospital.org"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Contact Phone Number"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="+1 (555) 000-8844"
                  required
                />

                <Input
                  label="Desired Hospital Admin Password"
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  placeholder="Create secure password"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Link to="/login" className="text-xs text-slate-400 hover:text-sky-400">
                  Already have an approved account? Log in
                </Link>
                <Button type="submit" variant="primary" size="lg" className="font-bold" isLoading={isLoading}>
                  Submit SaaS Application <ArrowRight size={18} />
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
