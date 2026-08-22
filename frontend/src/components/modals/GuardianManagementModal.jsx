import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { Shield, CheckCircle, XCircle, AlertTriangle, KeyRound, Lock, UserCheck, X } from 'lucide-react';

export const GuardianManagementModal = ({ isOpen, onClose }) => {
  const [links, setLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchLinks();
    }
  }, [isOpen]);

  const fetchLinks = async () => {
    try {
      const res = await axiosClient.get('/guardian-portal/all-links');
      setLinks(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load guardian links:', err);
    }
  };

  const handleStatusUpdate = async (linkId, action) => {
    setIsLoading(true);
    try {
      await axiosClient.patch(`/guardian-portal/links/${linkId}/status`, { status: action });
      setFeedback(`Guardian authorization updated to ${action.toLowerCase()}.`);
      await fetchLinks();
    } catch (err) {
      setFeedback('Failed to update guardian access status.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-4 border border-slate-200 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Shield size={22} className="text-purple-600" />
              Guardian Access & Authorization Management Console
            </h3>
            <p className="text-xs text-slate-500">Approve, reject, or manage guardian permissions for patient records</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {feedback && (
          <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold flex justify-between">
            <span>{feedback}</span>
            <button onClick={() => setFeedback(null)} className="text-purple-700 hover:underline">Dismiss</button>
          </div>
        )}

        <div className="space-y-3 text-xs">
          {links.length > 0 ? (
            links.map((link) => (
              <div key={link._id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">
                      Guardian: {link.guardianUserId?.name || 'Guardian Account'} ({link.relationship})
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Linked Patient: <strong>{link.patientId?.firstName} {link.patientId?.lastName} (UHID: {link.patientId?.uhid})</strong>
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    link.accessStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    link.accessStatus === 'REJECTED' || link.accessStatus === 'SUSPENDED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {link.accessStatus}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                  {link.accessStatus !== 'APPROVED' && (
                    <Button
                      size="sm"
                      variant="primary"
                      className="font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      isLoading={isLoading}
                      onClick={() => handleStatusUpdate(link._id, 'APPROVED')}
                    >
                      <CheckCircle size={14} /> Approve Access
                    </Button>
                  )}

                  {link.accessStatus === 'APPROVED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-bold text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                      isLoading={isLoading}
                      onClick={() => handleStatusUpdate(link._id, 'SUSPENDED')}
                    >
                      Suspend Access
                    </Button>
                  )}

                  {link.accessStatus !== 'REJECTED' && (
                    <Button
                      size="sm"
                      variant="danger"
                      className="font-bold text-xs"
                      isLoading={isLoading}
                      onClick={() => handleStatusUpdate(link._id, 'REJECTED')}
                    >
                      <XCircle size={14} /> Reject / Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-400">No guardian link requests found.</div>
          )}
        </div>
      </div>
    </div>
  );
};
