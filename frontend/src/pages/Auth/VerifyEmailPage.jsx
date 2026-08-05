import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldAlert, ArrowRight, Mail, RefreshCw, Building2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { axiosClient } from '../../api/axiosClient';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [isVerifying, setIsVerifying] = useState(Boolean(token));
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [resendEmailInput, setResendEmailInput] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  const handleVerify = async () => {
    if (!token) return;
    setIsVerifying(true);
    setErrorMessage('');
    try {
      const res = await axiosClient.post('/auth/verify-email', { token });
      setSuccessMessage(res.data.message || 'Email address verified successfully!');
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Invalid or expired email verification token.');
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (token) handleVerify();
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmailInput) return;
    setIsResending(true);
    setResendStatus('');
    try {
      const res = await axiosClient.post('/auth/resend-verification', { email: resendEmailInput });
      setResendStatus(res.data.message || 'A new verification link has been sent to your email.');
    } catch (err) {
      setResendStatus('Failed to send verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 space-y-6 text-center shadow-2xl rounded-3xl border border-slate-800">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Building2 size={32} />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Hospital Account Verification</h2>
          <p className="text-xs text-slate-400 mt-1">SaaS Enterprise Platform Gateway</p>
        </div>

        {isVerifying && (
          <div className="py-8 space-y-3">
            <RefreshCw className="animate-spin mx-auto text-indigo-400" size={32} />
            <p className="text-xs font-semibold text-slate-300">Verifying your email token...</p>
          </div>
        )}

        {!isVerifying && successMessage && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-3">
              <CheckCircle2 size={24} className="shrink-0 text-emerald-400" />
              <div className="text-left">
                <p className="text-sm font-bold">Email Verified!</p>
                <p className="text-[11px] font-normal mt-0.5 text-emerald-300">{successMessage}</p>
              </div>
            </div>
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
              onClick={() => navigate('/login')}
            >
              Go to Platform Login <ArrowRight size={16} />
            </Button>
          </div>
        )}

        {!isVerifying && errorMessage && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-3">
              <ShieldAlert size={24} className="shrink-0 text-rose-400" />
              <div className="text-left">
                <p className="text-sm font-bold">Verification Failed</p>
                <p className="text-[11px] font-normal mt-0.5 text-rose-300">{errorMessage}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-left space-y-3">
              <p className="text-xs font-bold text-slate-300">Resend Verification Email</p>
              <form onSubmit={handleResend} className="space-y-2">
                <input
                  type="email"
                  placeholder="Enter registered email"
                  value={resendEmailInput}
                  onChange={(e) => setResendEmailInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <Button
                  type="submit"
                  disabled={isResending}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs py-2 rounded-xl"
                >
                  {isResending ? 'Sending...' : 'Send Verification Email'}
                </Button>
              </form>
              {resendStatus && <p className="text-[11px] font-medium text-indigo-400">{resendStatus}</p>}
            </div>
          </div>
        )}

        {!token && !isVerifying && !successMessage && !errorMessage && (
          <div className="space-y-4 text-left">
            <p className="text-xs text-slate-300 font-medium">
              Please enter your registered hospital email to receive a new verification link.
            </p>
            <form onSubmit={handleResend} className="space-y-3">
              <input
                type="email"
                placeholder="Enter registered email address"
                value={resendEmailInput}
                onChange={(e) => setResendEmailInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <Button
                type="submit"
                disabled={isResending}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl"
              >
                {isResending ? 'Sending Email...' : 'Resend Verification Email'}
              </Button>
            </form>
            {resendStatus && <p className="text-xs font-semibold text-emerald-400">{resendStatus}</p>}
          </div>
        )}
      </Card>
    </div>
  );
};
