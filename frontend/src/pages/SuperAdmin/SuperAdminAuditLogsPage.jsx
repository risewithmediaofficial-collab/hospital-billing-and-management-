import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { axiosClient } from '../../api/axiosClient';
import { formatDateTime } from '../../utils/formatters';
import { useSuperAdminContextStore } from '../../store/superAdminContextStore';

export const SuperAdminAuditLogsPage = () => {
  const { selectedHospitalId } = useSuperAdminContextStore();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedHospitalId) params.set('hospitalId', selectedHospitalId);
        const res = await axiosClient.get(`/saas/audit-logs?${params}`);
        setLogs(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [selectedHospitalId]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Audit Logs</h2>
        <p className="text-xs text-neutral-500 mt-1">System-wide activity and security mutation trail</p>
      </div>

      <Card>
        {isLoading ? (
          <p className="text-center py-8 text-slate-500">Loading audit logs...</p>
        ) : logs.length > 0 ? (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="p-4 rounded-lg border border-slate-100 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <FileText size={18} className="text-indigo-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-sm text-slate-800">{log.action}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{log.module} · {log.hospitalName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{log.userName} ({log.userRole}) {log.ipAddress && `· ${log.ipAddress}`}</p>
                      {log.details && <p className="text-xs text-slate-600 mt-1">{log.details}</p>}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{formatDateTime(log.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-slate-500">No audit logs recorded yet</p>
        )}
      </Card>
    </div>
  );
};
