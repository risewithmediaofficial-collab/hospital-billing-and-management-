import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { axiosClient } from '../api/axiosClient';
import {
  Building2, CheckCircle, ArrowRight, Activity, Eye, EyeOff,
  Zap, TrendingUp, Globe, Users, Clock, ShieldCheck, AlertTriangle,
  Star, Check
} from 'lucide-react';

const PLAN_CONFIG = [
  {
    code: 'BASIC',
    label: 'Basic',
    price: '₹4,000',
    period: '/month',
    yearlyPrice: '₹40,000/year',
    patientLimit: '100 Patients',
    icon: Zap,
    color: 'blue',
    accentBg: 'bg-blue-600',
    accentLight: 'bg-blue-50',
    accentBorder: 'border-blue-200',
    accentText: 'text-blue-700',
    ringColor: 'ring-blue-500',
    description: 'Perfect for small clinics and single-specialty practices.',
    features: [
      'Register & bill up to 100 patients/month',
      'Up to 5 doctors, 20 total staff',
      'OPD & IPD management',
      'Billing & invoicing',
      'Basic support',
      '7-day free trial included',
    ],
  },
  {
    code: 'STANDARD',
    label: 'Standard',
    price: '₹30,000',
    period: '/month',
    yearlyPrice: '₹3,00,000/year',
    patientLimit: '1,000 Patients',
    icon: TrendingUp,
    color: 'violet',
    accentBg: 'bg-violet-600',
    accentLight: 'bg-violet-50',
    accentBorder: 'border-violet-200',
    accentText: 'text-violet-700',
    ringColor: 'ring-violet-500',
    description: 'For growing multi-specialty hospitals with expanding operations.',
    features: [
      'Register & bill up to 1,000 patients/month',
      'Up to 20 doctors, 80 total staff',
      'Multi-branch support (up to 3)',
      'Full diagnostics & pharmacy',
      'Priority support',
      '7-day free trial included',
    ],
    popular: true,
  },
  {
    code: 'UNLIMITED',
    label: 'Unlimited',
    price: '₹50,000',
    period: '/month',
    yearlyPrice: '₹5,00,000/year',
    patientLimit: 'Unlimited Patients',
    icon: Globe,
    color: 'emerald',
    accentBg: 'bg-emerald-600',
    accentLight: 'bg-emerald-50',
    accentBorder: 'border-emerald-200',
    accentText: 'text-emerald-700',
    ringColor: 'ring-emerald-500',
    description: 'For large hospital networks requiring full platform access at scale.',
    features: [
      'Unlimited patients every month',
      'Unlimited staff & doctors',
      'Unlimited branches',
      'Full platform access + API',
      '24/7 dedicated support',
      '7-day free trial included',
    ],
  },
];

export const HospitalRegisterPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: plan selection, 2: form
  const [selectedPlan, setSelectedPlan] = useState('BASIC');
  const [formData, setFormData] = useState({
    hospitalName: '',
    subdomain: '',
    plan: 'BASIC',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    licenseNumber: '',
    city: '',
    adminPassword: '',
    confirmAdminPassword: '',
  });

  const [showAdminPass, setShowAdminPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registeredResult, setRegisteredResult] = useState(null);
  const [error, setError] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handlePlanSelect = (code) => {
    setSelectedPlan(code);
    setFormData((prev) => ({ ...prev, plan: code }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError('You must accept the Terms & Conditions and Data Retention Policy before submitting.');
      return;
    }
    if (formData.adminPassword !== formData.confirmAdminPassword) {
      setError('Admin Password and Confirm Password do not match. Please re-enter.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosClient.post('/saas/register-hospital', formData);
      setRegisteredResult(response.data);
    } catch (err) {
      setError(err.error?.message || err?.response?.data?.message || 'Failed to submit hospital application');
    } finally {
      setIsLoading(false);
    }
  };

  const chosenPlan = PLAN_CONFIG.find((p) => p.code === selectedPlan) || PLAN_CONFIG[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 text-slate-900 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-bold mb-4 shadow-sm">
            <Activity size={14} /> Multi-Tenant Hospital SaaS Platform
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl mb-3">
            Register Your Hospital
          </h1>
          <p className="text-base text-slate-500 max-w-xl mx-auto">
            Choose a plan and apply for your dedicated Hospital Patient Management & Billing System workspace.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full font-semibold">
              <Clock size={13} /> 7-Day Free Trial Included with Every Plan
            </div>
          </div>
        </div>

        {registeredResult ? (
          /* Success Screen */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-10 text-center max-w-xl mx-auto">
            <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-200 mb-6">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Application Submitted!</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
              Your hospital application for{' '}
              <span className="font-bold text-indigo-600">{registeredResult.hospital?.name}</span>{' '}
              is now <span className="font-bold text-amber-600">PENDING APPROVAL</span> by the Platform Super Admin.
            </p>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2.5 mb-6">
              <p><span className="text-slate-400">Hospital Portal URL:</span> <span className="font-mono font-bold text-indigo-600">http://82.29.166.169:86/{registeredResult.hospital?.domain || registeredResult.hospital?.subdomain}/login</span></p>
              <p><span className="text-slate-400">Admin Dashboard:</span> <span className="font-mono font-bold text-purple-600">http://82.29.166.169:86/{registeredResult.hospital?.domain || registeredResult.hospital?.subdomain}/admin/dashboard</span></p>
              <p><span className="text-slate-400">Contact:</span> <span className="font-bold text-slate-900">{registeredResult.hospital?.contactName} ({registeredResult.hospital?.contactEmail})</span></p>
              <p><span className="text-slate-400">Selected Plan:</span> <span className="font-bold text-violet-600">{registeredResult.hospital?.plan}</span></p>
              <p><span className="text-slate-400">Free Trial:</span> <span className="font-bold text-emerald-600">7 days from approval date</span></p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 text-left mb-6">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Data Retention Notice</p>
                  <p>After your plan expires, all hospital data is retained for <strong>90 days</strong>, then permanently deleted as per our terms.</p>
                </div>
              </div>
            </div>
            <Link to={`/${registeredResult.hospital?.domain || registeredResult.hospital?.subdomain || 'login'}/login`}>
              <Button variant="primary" size="lg" className="font-bold w-full">
                Go to Hospital Portal Login <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Step 1: Plan Selection */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-slate-800 text-center mb-6">
                Step 1 — Choose Your SaaS Plan
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {PLAN_CONFIG.map((plan) => {
                  const Icon = plan.icon;
                  const isSelected = selectedPlan === plan.code;
                  return (
                    <button
                      key={plan.code}
                      type="button"
                      onClick={() => handlePlanSelect(plan.code)}
                      className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 shadow-sm hover:shadow-lg ${
                        isSelected
                          ? `${plan.accentBorder} ring-2 ${plan.ringColor} bg-white scale-[1.02]`
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-black flex items-center gap-1 shadow-sm whitespace-nowrap">
                          <Star size={10} fill="currentColor" /> Most Popular
                        </div>
                      )}
                      {isSelected && (
                        <div className={`absolute top-3 right-3 w-6 h-6 rounded-full ${plan.accentBg} flex items-center justify-center`}>
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                      <div className={`w-12 h-12 rounded-xl ${plan.accentLight} ${plan.accentBorder} border flex items-center justify-center mb-3`}>
                        <Icon size={22} className={plan.accentText} />
                      </div>
                      <div className="mb-1">
                        <span className={`text-xs font-black uppercase tracking-widest ${plan.accentText}`}>{plan.label}</span>
                      </div>
                      <div className="flex items-end gap-1 mb-1">
                        <span className="text-3xl font-extrabold text-slate-900">{plan.price}</span>
                        <span className="text-slate-400 text-sm pb-1">{plan.period}</span>
                      </div>
                      <div className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${plan.accentLight} ${plan.accentText} ${plan.accentBorder} border mb-3`}>
                        {plan.patientLimit}
                      </div>
                      <p className="text-xs text-slate-500 mb-3">{plan.description}</p>
                      <ul className="space-y-1.5">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-[11px] text-slate-600">
                            <Check size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trial banner */}
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-8">
              <ShieldCheck size={22} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-800">7-Day Free Trial — No Payment Required to Start</p>
                <p className="text-xs text-emerald-600">After Super Admin approves your application, your 7-day free trial begins. Then <strong>{chosenPlan.price}/month</strong> billing starts.</p>
              </div>
            </div>

            {/* Step 2: Registration Form */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Building2 size={20} className="text-indigo-600" />
                Step 2 — Hospital Registration Details
                <span className={`ml-auto text-xs font-black px-3 py-1 rounded-full ${chosenPlan.accentLight} ${chosenPlan.accentText} ${chosenPlan.accentBorder} border`}>
                  {chosenPlan.label} Plan — {chosenPlan.price}/mo
                </span>
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Hospital Name"
                    value={formData.hospitalName}
                    onChange={(e) => {
                      const name = e.target.value;
                      const autoDomain = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                      setFormData((prev) => ({
                        ...prev,
                        hospitalName: name,
                        domain: prev.domainManual ? prev.domain : autoDomain,
                        subdomain: prev.domainManual ? prev.domain : autoDomain,
                      }));
                    }}
                    placeholder="Hospital Name"
                    required
                  />
                  <div>
                    <Input
                      label="Hospital Domain / Hospital URL Name"
                      value={formData.domain || formData.subdomain || ''}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
                        setFormData((prev) => ({
                          ...prev,
                          domain: val,
                          subdomain: val,
                          domainManual: true,
                        }));
                      }}
                      placeholder="hospital-name"
                      required
                    />
                    <div className="mt-1.5 p-2 bg-indigo-50/70 border border-indigo-100 rounded-lg text-[11px] font-mono text-indigo-700 flex items-center gap-1.5">
                      <Globe size={12} className="shrink-0 text-indigo-500" />
                      <span>URL Preview: <strong className="text-indigo-900">http://82.29.166.169:86/{formData.domain || formData.subdomain || 'hospital-name'}/login</strong></span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Contact Officer Name"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="Your Name"
                    required
                  />
                  <Input
                    label="Authorized Contact Email"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="email@gmail.com"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Contact Phone Number"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                    required
                  />
                  <Input
                    label="Medical License Number"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    placeholder="LIC-12345"
                    required
                  />
                </div>

                {/* Hospital Physical Address & Location */}
                <div className="space-y-3 p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100">
                  <p className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Building2 size={14} className="text-indigo-600" />
                    Hospital Address (Printed on Invoices & Official Receipts)
                  </p>
                  <Input
                    label="Street / Building / Area Address"
                    value={formData.street || ''}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Hospital Address"
                    required
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="City / Town"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City"
                      required
                    />
                    <Input
                      label="State / Province"
                      value={formData.state || ''}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="State"
                      required
                    />
                    <Input
                      label="PIN / Postal Code"
                      value={formData.postalCode || ''}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      placeholder="Pincode"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Input
                      label="Desired Hospital Admin Password"
                      type={showAdminPass ? 'text' : 'password'}
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      placeholder="Min 8 characters"
                      required
                    />
                    <button type="button" onClick={() => setShowAdminPass(!showAdminPass)}
                      className="absolute right-3 top-8 text-slate-400 hover:text-slate-700 p-0.5">
                      {showAdminPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      label="Confirm Admin Password"
                      type={showConfirmPass ? 'text' : 'password'}
                      value={formData.confirmAdminPassword}
                      onChange={(e) => setFormData({ ...formData, confirmAdminPassword: e.target.value })}
                      placeholder="Re-enter password"
                      required
                    />
                    <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-8 text-slate-400 hover:text-slate-700 p-0.5">
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Terms & Conditions */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheck size={15} className="text-indigo-600" />
                    Terms, Conditions & Data Retention Policy
                  </h3>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside pl-1">
                    <li>All plans include a <strong>7-day free trial</strong> starting from the approval date.</li>
                    <li>After the trial ends, billing begins at <strong>{chosenPlan.price}/month</strong> for the {chosenPlan.label} plan ({chosenPlan.patientLimit}).</li>
                    <li>If a plan is not renewed after expiry, all hospital data will remain accessible for <strong>90 days</strong>.</li>
                    <li>After the 90-day grace period, <strong>all hospital data will be permanently deleted</strong> and cannot be recovered.</li>
                    <li>Reminder notifications will be sent automatically at <strong>7 days, 3 days, and 1 day</strong> before plan expiry.</li>
                  </ul>
                  <label className="flex items-start gap-3 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-indigo-600 cursor-pointer flex-shrink-0"
                    />
                    <span className="text-xs text-slate-700">
                      I have read and agree to the <strong>Terms & Conditions</strong>, including the{' '}
                      <strong>90-day data retention policy</strong>. I understand that after the grace period, my hospital data will be permanently deleted.
                    </span>
                  </label>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <Link to="/login" className="text-xs text-slate-500 hover:text-indigo-600">
                    Already have an account? Log in
                  </Link>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="font-bold"
                    isLoading={isLoading}
                    disabled={!termsAccepted}
                  >
                    Submit Application <ArrowRight size={18} />
                  </Button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
