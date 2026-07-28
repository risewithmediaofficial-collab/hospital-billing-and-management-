import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ShieldAlert } from 'lucide-react';

export const ForbiddenPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mb-4">
        <ShieldAlert size={36} />
      </div>
      <h1 className="text-4xl font-extrabold text-white">403 - Access Forbidden</h1>
      <p className="mt-2 text-sm text-slate-400 max-w-md">
        Security Policy Exception: Your active user role does not have authorization to view this workstation route or dashboard.
      </p>
      <Button variant="primary" className="mt-6" onClick={() => navigate(-1)}>
        Return to Authorized Dashboard
      </Button>
    </div>
  );
};
