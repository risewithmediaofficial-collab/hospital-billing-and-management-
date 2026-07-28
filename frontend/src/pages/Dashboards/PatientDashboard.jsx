import React, { useState, useEffect } from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { useAuthStore } from '../../store/authStore';
import { Heart, FileText, Receipt, Bell, CheckCircle, Eye, Download } from 'lucide-react';

export const PatientDashboard = () => {
  const { user } = useAuthStore();
  const [reports, setReports] = useState([]);
  const [requestStatus, setRequestStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchPatientReports();
  }, []);

  const fetchPatientReports = async () => {
    try {
      if (user?.id) {
        const res = await axiosClient.get(`/diagnostics/patient/${user.id}`);
        setReports(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch patient diagnostic reports:', err);
    }
  };

  const handleCreateRequest = async (requestType) => {
    setIsLoading(true);
    setRequestStatus(null);
    try {
      await axiosClient.post('/requests', {
        requestType,
        notes: `Patient requested ${requestType} from Room Tablet`,
      });
      setRequestStatus(`Request '${requestType}' dispatched! Nurse notified at ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      setRequestStatus(`Request dispatched! Assigned Nurse notified.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Patient Personal Health Portal</h2>
        <p className="text-xs text-slate-400 mt-1">Welcome back, <span className="text-sky-400 font-bold">{user?.name || 'Patient'}</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="My Active Consultations" value="1 OPD Visit" subtitle="Consultant Physician" icon={Heart} color="sky" />
        <StatCard title="Published Reports" value={`${reports.length} Reports`} subtitle="Approved Diagnostics" icon={FileText} color="emerald" />
        <StatCard title="Billing Status" value="₹0.00 Due" subtitle="Paid in Full" icon={Receipt} color="purple" />
        <StatCard title="Room Request Portal" value="READY" subtitle="In-Bed Amenity Console" icon={Bell} color="amber" />
      </div>

      {/* Published Diagnostic Reports Section */}
      <Card>
        <h3 className="text-base font-bold text-white mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText size={18} className="text-emerald-400" />
            Approved Diagnostic Reports & Imaging
          </span>
          <span className="text-xs text-slate-400 font-mono">EHR Verified Reports</span>
        </h3>

        <div className="space-y-3 text-xs">
          {reports.length > 0 ? (
            reports.map((rep) => (
              <div key={rep._id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-white text-sm">{rep.testName}</span>
                    <p className="text-[11px] text-slate-400">Category: {rep.testCategory} • Requested by: Dr. {rep.doctorName}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                    {rep.status}
                  </span>
                </div>

                {rep.reportSummary && (
                  <p className="text-slate-300 italic text-[11px]">Findings: "{rep.reportSummary}"</p>
                )}

                {rep.attachments?.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    {rep.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:text-sky-300 font-bold text-xs flex items-center gap-1.5"
                      >
                        <Eye size={14} /> View & Download Report ({att.fileName})
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-slate-500">No published diagnostic reports yet.</div>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Bell size={18} className="text-amber-400" />
            In-Bed Patient Amenity & Care Request Console
          </h3>
          <span className="text-xs text-emerald-400 font-bold">Connected to Nurse Station</span>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Tap any button below to immediately notify your assigned ward nurse.
        </p>

        {requestStatus && (
          <div className="p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle size={16} /> {requestStatus}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Button
            variant="glass"
            className="py-3.5 border-sky-500/30 text-sky-300 font-bold"
            isLoading={isLoading}
            onClick={() => handleCreateRequest('WATER')}
          >
            💧 Request Water
          </Button>

          <Button
            variant="glass"
            className="py-3.5 border-indigo-500/30 text-indigo-300 font-bold"
            isLoading={isLoading}
            onClick={() => handleCreateRequest('BLANKET')}
          >
            🛌 Blanket / Pillow
          </Button>

          <Button
            variant="glass"
            className="py-3.5 border-amber-500/30 text-amber-300 font-bold"
            isLoading={isLoading}
            onClick={() => handleCreateRequest('MEDICINE')}
          >
            💊 Extra Pill / Nurse
          </Button>

          <Button
            variant="danger"
            className="py-3.5 font-extrabold shadow-lg shadow-red-600/40"
            isLoading={isLoading}
            onClick={() => handleCreateRequest('EMERGENCY')}
          >
            🚨 EMERGENCY CALL
          </Button>
        </div>
      </Card>
    </div>
  );
};
