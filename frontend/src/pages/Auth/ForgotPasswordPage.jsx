import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ArrowLeft, Mail, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { axiosClient } from '../../api/axiosClient';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [resetTokenDemo, setResetTokenDemo] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setMessage('');
    setResetTokenDemo('');
    try {
      const res = await axiosClient.post('/auth/forgot-password', { email });
      setMessage(res.data.message || 'If an account exists, a reset link has been sent.');
      if (res.data?.data?.resetToken) {
        setResetTokenDemo(res.data.data.resetToken);
      }
    } catch (err) {
      setMessage('Failed to process password reset request. Please check email address.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 space-y-6 shadow-2xl rounded-3xl border border-slate-800">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <KeyRound size={32} />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Forgot Password</h2>
          <p className="text-xs text-slate-400 mt-1">Enter your registered email to receive a password reset token</p>
        </div>

        {message && (
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold flex items-start gap-3">
            <CheckCircle2 size={20} className="shrink-0 text-indigo-400 mt-0.5" />
            <div>
              <p>{message}</p>
              {resetTokenDemo && (
                <div className="mt-3 p-2 bg-slate-800 rounded border border-indigo-500/30 font-mono text-[10px]">
                  <p className="text-slate-400 font-bold">Development Reset Link:</p>
                  <a
                    href={`/reset-password?token=${resetTokenDemo}`}
                    className="text-indigo-400 underline break-all hover:text-indigo-300 font-bold"
                  >
                    /reset-password?token={resetTokenDemo}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Registered Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                placeholder="email@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg"
          >
            {isLoading ? 'Sending Reset Token...' : 'Send Password Reset Link'}
          </Button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => navigate('/login')}
            className="text-xs text-slate-400 hover:text-white font-semibold inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Back to Login
          </button>
        </div>
      </Card>
    </div>
  );
};
