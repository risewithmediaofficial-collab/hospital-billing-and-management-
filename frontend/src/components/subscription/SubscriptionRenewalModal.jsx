import React, { useEffect, useState } from 'react';
import { Check, ShieldAlert, Zap, X, CheckCircle2, Lock, Sparkles, Building2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { formatCurrency } from '../../utils/formatters';

export const SubscriptionRenewalModal = ({ isOpen, onClose, hospital, isLocked = false }) => {
  const [plans, setPlans] = useState([]);
  const [selectedPlanCode, setSelectedPlanCode] = useState('PROFESSIONAL');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await axiosClient.get('/saas/plans');
        setPlans(res.data?.data || res.data || []);
      } catch (err) {
        console.error('Failed to fetch subscription plans:', err);
      }
    };
    if (isOpen) fetchPlans();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      if (hospital?._id) {
        await axiosClient.post(`/saas/hospitals/${hospital._id}/assign-plan`, {
          planCode: selectedPlanCode,
          billingCycle,
        });
      }
      setSuccessMessage(`Subscription plan ${selectedPlanCode} (${billingCycle}) activated successfully!`);
      setTimeout(() => {
        if (onClose) onClose();
        window.location.reload();
      }, 1500);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to activate subscription plan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto my-auto relative">
        <button
          type="button"
          aria-label="Close renewal plans"
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
        >
          <X size={20} />
        </button>

        {/* Lockout Header if trial expired */}
        {isLocked ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1 text-center">
            <div className="flex items-center justify-center gap-2 font-black text-lg text-rose-700">
              <Lock size={22} />
              <span>Free Trial Expired — Operational Access Locked</span>
            </div>
            <p className="text-xs text-rose-600 font-medium">
              Your 7-day free trial for <strong>{hospital?.name}</strong> has ended. All your hospital records, billing data, and clinical history remain 100% safe. Subscribe to a plan below to unlock full operational access immediately.
            </p>
          </div>
        ) : (
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-extrabold uppercase tracking-wider">
              <Sparkles size={14} /> Upgrade Hospital SaaS Plan
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Select Subscription Plan for {hospital?.name}</h2>
            <p className="text-xs text-slate-500 font-medium">Choose a monthly or yearly plan tailored to your medical center</p>
          </div>
        )}

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                billingCycle === 'MONTHLY' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === 'YEARLY' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yearly Billing <span className="bg-emerald-400 text-slate-900 text-[10px] px-1.5 py-0.2 rounded font-black">2 MONTHS FREE</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <ShieldAlert size={16} /> {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} /> {successMessage}
          </div>
        )}

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isSelected = selectedPlanCode === p.code;
            const price = billingCycle === 'YEARLY' ? p.yearlyPrice : p.monthlyPrice;

            return (
              <div
                key={p.code}
                onClick={() => setSelectedPlanCode(p.code)}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-4 relative ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/20 shadow-md ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-indigo-300 bg-white'
                }`}
              >
                {p.isDefault && (
                  <span className="absolute -top-3 right-4 bg-indigo-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs uppercase">
                    Most Popular
                  </span>
                )}

                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-900 text-base">{p.name}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{p.description}</p>
                  <div className="pt-2">
                    <span className="text-2xl font-black text-slate-900 font-mono">{formatCurrency(price)}</span>
                    <span className="text-xs text-slate-500"> / {billingCycle === 'YEARLY' ? 'year' : 'month'}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                  <p className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">Plan Entitlements:</p>
                  <ul className="space-y-1.5 text-slate-600">
                    <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500 shrink-0" /> <strong>{p.staffLimits?.doctors || 15}</strong> Doctor Seats</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500 shrink-0" /> <strong>{p.staffLimits?.nurses || 15}</strong> Nurse Seats</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500 shrink-0" /> <strong>{p.staffLimits?.totalStaff || 50}</strong> Total Staff Seats</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500 shrink-0" /> <strong>{p.usageLimits?.storageInGB || 50} GB</strong> Cloud Storage</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500 shrink-0" /> Support: <strong>{p.supportLevel}</strong></li>
                  </ul>
                </div>

                <Button
                  size="sm"
                  className={`w-full font-bold text-xs py-2 rounded-xl ${
                    isSelected ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isSelected ? 'Selected Plan' : 'Select Plan'}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Action Button Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <Button variant="outline" size="sm" onClick={onClose} className="font-bold text-xs">
            Close
          </Button>
          {!isLocked && (
            <Button
              size="sm"
              disabled={isLoading}
              onClick={handleSubscribe}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md flex items-center gap-2"
            >
              <Zap size={16} /> {isLoading ? 'Activating Subscription...' : `Activate ${selectedPlanCode} Plan (${billingCycle})`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
