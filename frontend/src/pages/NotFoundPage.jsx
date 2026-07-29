import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { FileQuestion } from 'lucide-react';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mb-4">
        <FileQuestion size={36} />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900">404 - Resource Not Found</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        The hospital route or document you requested does not exist or has been relocated.
      </p>
      <Button variant="primary" className="mt-6" onClick={() => navigate('/')}>
        Go to Home
      </Button>
    </div>
  );
};
