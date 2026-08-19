import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { axiosClient } from '../../api/axiosClient';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import {
  Bell, FileText, BarChart3, BadgeCheck, Gauge, Settings,
  TrendingUp, Users, UserCheck, Activity, CreditCard, Receipt,
  BedDouble, CheckCircle2, AlertCircle, Clock, RefreshCw, CheckCheck,
  Trash2, ExternalLink, Shield, Database, Cpu, Layers, Calendar,
  IndianRupee, Package, Info, ChevronRight, AlertTriangle, XCircle,
  Building2, Phone, Mail, MapPin, Hash, Search, Filter, Download
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';

// ─── Utility Helpers ──────────────────────────────────────────────────────
const fmt = (n) => (n != null ? Number(n).toLocaleString('en-IN') : '—');
const fmtCurrency = (n) => `₹ ${fmt(n)}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const daysDiff = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;
const pct = (used, limit) => limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

function ProgressBar({ used, limit, label, colorClass = 'bg-indigo-600' }) {
  const p = pct(used, limit);
  const barColor = p >= 90 ? 'bg-rose-600' : p >= 70 ? 'bg-amber-500' : colorClass;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className={`font-black ${p >= 90 ? 'text-rose-600' : 'text-slate-600'}`}>
          {fmt(used)} / {fmt(limit)} ({p}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

function ModuleBadge({ label, enabled }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
      enabled
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-slate-50 text-slate-400 border-slate-200 line-through opacity-70'
    }`}>
      {enabled ? <CheckCircle2 size={11} /> : <XCircle size={11} />} {label}
    </span>
  );
}

// ─── Tab Definitions ──────────────────────────────────────────────────────
const ADMIN_TABS = [
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  { key: 'audit', label: 'Audit Logs', icon: FileText },
  { key: 'plan-details', label: 'Plan Details', icon: BadgeCheck },
  { key: 'usage-limits', label: 'Usage & Limits', icon: Gauge },
  { key: 'settings', label: 'Hospital Settings', icon: Settings },
];

// ─── Notifications Panel ─────────────────────────────────────────────────
function NotificationsPanel() {
  const { notifications, unreadCount, fetchNotifications, markAllAsRead, clearAllNotifications, markAsRead, clearNotification, isLoading } = useNotificationStore();

  useEffect(() => { fetchNotifications(); }, []);

  const getIcon = (type) => {
    const icons = {
      BILLING: CreditCard, LAB: Activity, RADIOLOGY: Activity, WORKFLOW: CheckCircle2,
      EMERGENCY: AlertTriangle, PATIENT: Users, SYSTEM: Info,
    };
    const I = icons[type] || Bell;
    return <I size={16} />;
  };

  const getPriorityColor = (priority, read) => {
    if (read) return 'border-slate-100 bg-white';
    if (priority === 'HIGH' || priority === 'CRITICAL') return 'border-l-4 border-l-rose-500 bg-rose-50/40';
    if (priority === 'MEDIUM') return 'border-l-4 border-l-amber-400 bg-amber-50/30';
    return 'border-l-4 border-l-indigo-400 bg-indigo-50/20';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900">Hospital System Notifications</h3>
          <p className="text-xs text-slate-500 mt-0.5">All departmental alerts and workflow messages</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white">{unreadCount} unread</span>
          )}
          <Button size="sm" variant="outline" className="gap-1.5 text-xs font-bold" onClick={fetchNotifications}>
            <RefreshCw size={13} /> Refresh
          </Button>
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs font-bold text-emerald-700 border-emerald-300" onClick={markAllAsRead}>
              <CheckCheck size={13} /> Mark All Read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs font-bold text-rose-700 border-rose-300" onClick={clearAllNotifications}>
              <Trash2 size={13} /> Clear All
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={22} className="animate-spin text-indigo-500" />
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Bell size={26} className="text-slate-400" />
            </div>
            <p className="font-bold text-slate-600">No notifications</p>
            <p className="text-xs text-slate-400 mt-1">All departmental alerts and workflow messages will appear here.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n._id || n.id} className={`flex items-start gap-3 p-4 rounded-xl border ${getPriorityColor(n.priority, n.isRead)} transition-all`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.isRead ? 'bg-slate-100 text-slate-400' : 'bg-indigo-100 text-indigo-600'}`}>
                {getIcon(n.notificationType || n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-bold ${n.isRead ? 'text-slate-600' : 'text-slate-900'}`}>{n.title}</p>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />}
                  {n.priority && n.priority !== 'NORMAL' && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      n.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>{n.priority}</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                <p className="text-[11px] text-slate-400 mt-1">{fmtDateTime(n.createdAt)}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!n.isRead && (
                  <button onClick={() => markAsRead(n._id || n.id)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors" title="Mark as read">
                    <CheckCheck size={14} />
                  </button>
                )}
                <button onClick={() => clearNotification(n._id || n.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors" title="Dismiss">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Reports & Analytics Panel ─────────────────────────────────────────────
function ReportsPanel({ formatTenantPath }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/hospital-admin/reports');
      setData(res.data?.data || res.data);
    } catch { setData(null); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw size={24} className="animate-spin text-indigo-500 mr-2" />
      <span className="text-slate-500 text-sm">Loading reports…</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900">Operational & Revenue Reports</h3>
          <p className="text-xs text-slate-500 mt-0.5">Last 6 months financial and clinical summary</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs font-bold" onClick={load}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { title: 'Total Revenue', value: fmtCurrency(data?.totalRevenue), icon: IndianRupee, color: 'emerald' },
          { title: 'Total Invoices', value: fmt(data?.totalInvoices), icon: Receipt, color: 'indigo' },
          { title: 'Total Patients', value: fmt(data?.totalPatients), icon: Users, color: 'purple' },
          { title: 'Active Admissions', value: fmt(data?.activeAdmissions), icon: BedDouble, color: 'amber' },
          { title: 'Pending Bills', value: fmt(data?.pendingInvoices), icon: AlertCircle, color: 'rose' },
        ].map((s) => (
          <StatCard key={s.title} title={s.title} value={s.value} icon={s.icon} color={s.color} />
        ))}
      </div>

      {/* Monthly Breakdown Table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600" /> Monthly Performance — Last 6 Months
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="p-3">Month</th>
                <th className="p-3">Revenue (₹)</th>
                <th className="p-3">Invoices</th>
                <th className="p-3">Patients Registered</th>
                <th className="p-3">Consultations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.revenueByMonth || []).map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-bold text-slate-800">{row.month}</td>
                  <td className="p-3 font-black text-emerald-700">₹ {fmt(row.revenue)}</td>
                  <td className="p-3 text-slate-700 font-semibold">{fmt(row.invoices)}</td>
                  <td className="p-3 text-slate-700 font-semibold">{fmt(row.patients)}</td>
                  <td className="p-3 text-slate-700 font-semibold">{fmt(row.consultations)}</td>
                </tr>
              ))}
              {(!data?.revenueByMonth?.length) && (
                <tr><td colSpan={5} className="p-6 text-center text-slate-400">No data available for the last 6 months.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Revenue Bar Chart (Pure CSS) */}
      {data?.revenueByMonth?.length > 0 && (
        <Card>
          <h4 className="font-black text-slate-900 text-sm mb-5 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-600" /> Revenue Trend (₹)
          </h4>
          <div className="flex items-end gap-3 h-40">
            {data.revenueByMonth.map((row, i) => {
              const max = Math.max(...data.revenueByMonth.map((r) => r.revenue), 1);
              const h = Math.round((row.revenue / max) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[10px] font-black text-emerald-700">
                    {row.revenue > 0 ? `₹${(row.revenue / 1000).toFixed(1)}k` : '—'}
                  </span>
                  <div className="w-full flex items-end justify-center" style={{ height: '96px' }}>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all duration-700"
                      style={{ height: `${h}%`, minHeight: row.revenue > 0 ? '6px' : '2px', opacity: row.revenue > 0 ? 1 : 0.3 }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">{row.month}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Audit Logs Panel ─────────────────────────────────────────────────────
function AuditLogsPanel() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const modules = ['ALL', 'billing', 'patients', 'diagnostics', 'pharmacy', 'auth', 'admissions', 'appointments', 'emergency', 'workflow'];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (moduleFilter !== 'ALL') params.set('module', moduleFilter);
      const res = await axiosClient.get(`/hospital-admin/audit-logs?${params}`);
      const d = res.data?.data || res.data;
      setLogs(Array.isArray(d?.logs) ? d.logs : []);
      setTotal(d?.total || 0);
    } catch { setLogs([]); } finally { setLoading(false); }
  }, [moduleFilter]);

  useEffect(() => { load(); }, [load]);

  const actionColor = (action) => {
    if (!action) return 'bg-slate-100 text-slate-600';
    const a = action.toUpperCase();
    if (a.includes('DELETE') || a.includes('REMOVE') || a.includes('VOID')) return 'bg-rose-100 text-rose-700';
    if (a.includes('CREATE') || a.includes('REGISTER') || a.includes('ADD')) return 'bg-emerald-100 text-emerald-700';
    if (a.includes('UPDATE') || a.includes('EDIT') || a.includes('CHANGE')) return 'bg-amber-100 text-amber-700';
    if (a.includes('LOGIN') || a.includes('AUTH') || a.includes('VIEW')) return 'bg-indigo-100 text-indigo-700';
    return 'bg-slate-100 text-slate-600';
  };

  const filteredLogs = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return l.userName?.toLowerCase().includes(q) || l.action?.toLowerCase().includes(q) || l.module?.toLowerCase().includes(q) || l.details?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900">Audit Logs</h3>
          <p className="text-xs text-slate-500 mt-0.5">{total} total records — all critical data access and modification events</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs font-bold" onClick={load}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            placeholder="Search user, action, module, details…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold"
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
        >
          {modules.map((m) => <option key={m} value={m}>{m === 'ALL' ? 'All Modules' : m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={20} className="animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Module</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{fmtDateTime(log.timestamp)}</td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{log.userName || 'System'}</p>
                      <p className="text-[11px] text-slate-400">{log.userRole}</p>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 text-[11px]">
                        {log.module}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${actionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 max-w-xs truncate text-slate-600" title={log.details}>{log.details || '—'}</td>
                    <td className="p-3 font-mono text-slate-400">{log.ipAddress || '—'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400">No audit records found{search ? ` matching "${search}"` : ''}.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Plan Details Panel ─────────────────────────────────────────────────
function PlanDetailsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get('/hospital-admin/plan-details')
      .then((r) => setData(r.data?.data || r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw size={22} className="animate-spin text-indigo-500" />
    </div>
  );
  if (!data) return (
    <Card><div className="p-8 text-center text-slate-400">Failed to load plan details. Please try again.</div></Card>
  );

  const daysLeft = daysDiff(data.isTrial ? data.trialEndDate : data.subscriptionEndDate);
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7;

  const MODULE_LABELS = {
    dashboard: 'Dashboard', patientRegistration: 'Patient Registration', patients: 'Patients',
    tokens: 'OPD Tokens', appointments: 'Appointments', doctors: 'Doctors', reception: 'Reception',
    nursing: 'Nursing', laboratory: 'Laboratory', radiology: 'Radiology', pharmacy: 'Pharmacy',
    billing: 'Billing', opd: 'OPD', ipd: 'IPD', emergency: 'Emergency', departments: 'Departments',
    staffManagement: 'Staff Management', reports: 'Reports', notifications: 'Notifications',
    hospitalSettings: 'Hospital Settings', auditLogs: 'Audit Logs', patientPortal: 'Patient Portal',
    guardianPortal: 'Guardian Portal',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900">Subscription & Plan Details</h3>
          <p className="text-xs text-slate-500 mt-0.5">Your hospital's current plan, status, and enabled capabilities</p>
        </div>
      </div>

      {/* Plan Summary Card */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-lg">
              <BadgeCheck size={26} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Active Plan</p>
              <h4 className="text-2xl font-black text-slate-900 tracking-tight">{data.plan}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  data.trialStatus === 'SUBSCRIPTION_ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : data.trialStatus === 'TRIAL_ACTIVE'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {data.trialStatus?.replace(/_/g, ' ')}
                </span>
                {isExpiringSoon && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <AlertTriangle size={11} /> Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            {[
              { label: data.isTrial ? 'Trial Start' : 'Subscription Start', value: fmtDate(data.isTrial ? data.trialStartDate : data.subscriptionStartDate) },
              { label: data.isTrial ? 'Trial End' : 'Subscription End', value: fmtDate(data.isTrial ? data.trialEndDate : data.subscriptionEndDate) },
            ].map((i) => (
              <div key={i.label}>
                <p className="text-slate-400 font-semibold">{i.label}</p>
                <p className="font-black text-slate-800 text-sm">{i.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Staff Limits */}
      <Card>
        <h4 className="font-black text-slate-900 text-sm mb-4 flex items-center gap-2">
          <Users size={16} className="text-indigo-600" /> Staff Seat Limits
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-2 text-xs">
          {Object.entries(data.staffLimits || {}).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-semibold capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
              <span className="font-black text-slate-900">{v}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Enabled Modules */}
      <Card>
        <h4 className="font-black text-slate-900 text-sm mb-4 flex items-center gap-2">
          <Layers size={16} className="text-indigo-600" /> Enabled Modules ({Object.values(data.enabledModules || {}).filter(Boolean).length}/{Object.keys(data.enabledModules || {}).length})
        </h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.enabledModules || {}).map(([key, enabled]) => (
            <ModuleBadge key={key} label={MODULE_LABELS[key] || key} enabled={enabled} />
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Usage & Limits Panel ─────────────────────────────────────────────────
function UsageLimitsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get('/hospital-admin/usage-limits')
      .then((r) => setData(r.data?.data || r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw size={22} className="animate-spin text-indigo-500" />
    </div>
  );
  if (!data) return (
    <Card><div className="p-8 text-center text-slate-400">Failed to load usage data. Please try again.</div></Card>
  );

  const { usage = {}, limits = {} } = data;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-black text-slate-900">Usage & Limits</h3>
        <p className="text-xs text-slate-500 mt-0.5">Real-time consumption vs. your plan's capacity for this month</p>
      </div>

      {/* Quick KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { title: 'Staff Members', value: fmt(usage.totalStaff), limit: fmt(limits.totalStaff), icon: Users, color: 'indigo' },
          { title: 'Total Patients', value: fmt(usage.totalPatients), icon: UserCheck, color: 'purple' },
          { title: 'Active Admissions', value: fmt(usage.activeAdmissions), icon: BedDouble, color: 'amber' },
          { title: 'This Month Patients', value: fmt(usage.monthPatients), limit: fmt(limits.monthlyPatients), icon: Activity, color: 'emerald' },
        ].map((s) => (
          <Card key={s.title}>
            <div className="flex flex-col h-full gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{s.title}</p>
                <s.icon size={16} className="text-slate-400" />
              </div>
              <p className="text-3xl font-black text-slate-900">{s.value}</p>
              {s.limit && <p className="text-[11px] text-slate-400">Limit: {s.limit}</p>}
            </div>
          </Card>
        ))}
      </div>

      {/* Progress Bars */}
      <Card>
        <h4 className="font-black text-slate-900 text-sm mb-5 flex items-center gap-2">
          <Gauge size={16} className="text-indigo-600" /> Capacity Utilization
        </h4>
        <div className="space-y-5">
          <ProgressBar label="Staff Members" used={usage.totalStaff} limit={limits.totalStaff} colorClass="bg-indigo-600" />
          <ProgressBar label="Monthly Patients" used={usage.monthPatients} limit={limits.monthlyPatients} colorClass="bg-violet-600" />
          <ProgressBar label="Monthly Appointments" used={usage.monthAppointments} limit={limits.monthlyAppointments} colorClass="bg-emerald-600" />
          <ProgressBar label="Monthly Invoices/Bills" used={usage.monthBills} limit={limits.monthlyBills} colorClass="bg-amber-600" />
        </div>
      </Card>

      {/* Other Limits */}
      <Card>
        <h4 className="font-black text-slate-900 text-sm mb-4 flex items-center gap-2">
          <Package size={16} className="text-indigo-600" /> Plan Resource Limits
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
          {[
            { label: 'Branches Allowed', value: limits.branches },
            { label: 'Departments Allowed', value: limits.departments },
            { label: 'Storage Allocated', value: `${limits.storageInGB} GB` },
          ].map((i) => (
            <div key={i.label} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-slate-500 font-semibold">{i.label}</p>
              <p className="text-xl font-black text-slate-900 mt-1">{i.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Hospital Settings Panel ──────────────────────────────────────────────
function HospitalSettingsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get('/hospital-admin/settings')
      .then((r) => setData(r.data?.data || r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw size={22} className="animate-spin text-indigo-500" />
    </div>
  );
  if (!data) return (
    <Card><div className="p-8 text-center text-slate-400">Failed to load hospital settings. Please try again.</div></Card>
  );

  const fields = [
    { icon: Building2, label: 'Hospital Name', value: data.name },
    { icon: Hash, label: 'Hospital Code', value: data.code },
    { icon: ExternalLink, label: 'Domain / URL Slug', value: data.domain },
    { icon: UserCheck, label: 'Contact Person', value: data.contactName },
    { icon: Mail, label: 'Contact Email', value: data.contactEmail },
    { icon: Phone, label: 'Contact Phone', value: data.contactPhone },
    { icon: Shield, label: 'License Number', value: data.licenseNumber },
    { icon: MapPin, label: 'City / State', value: `${data.address?.city || '—'}, ${data.address?.state || '—'}` },
    { icon: MapPin, label: 'Full Address', value: data.address?.street || '—' },
    { icon: Database, label: 'System Status', value: data.status },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900">Hospital Settings</h3>
          <p className="text-xs text-slate-500 mt-0.5">Core hospital configuration and profile information. Contact platform admin to update.</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
          data.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
        }`}>
          {data.status}
        </span>
      </div>

      {/* Info Grid */}
      <Card>
        <h4 className="font-black text-slate-900 text-sm mb-4 flex items-center gap-2">
          <Building2 size={16} className="text-indigo-600" /> Hospital Profile
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <f.icon size={15} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{f.label}</p>
                <p className="text-sm font-bold text-slate-900">{f.value || '—'}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Enabled Departments */}
      {data.enabledDepartments && Object.keys(data.enabledDepartments).length > 0 && (
        <Card>
          <h4 className="font-black text-slate-900 text-sm mb-3 flex items-center gap-2">
            <Cpu size={16} className="text-indigo-600" /> Enabled Departments
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.enabledDepartments).map(([k, v]) => (
              <ModuleBadge key={k} label={k.replace(/_/g, ' ')} enabled={Boolean(v)} />
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800">
            <span className="font-black">Need to update hospital info?</span> Contact the platform administrator to modify your hospital name, domain, license number, or contact details.
          </p>
        </div>
      </Card>
    </div>
  );
}

// ─── Main Admin Extra Pages Component ─────────────────────────────────────
export const AdminExtraPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const getTab = () => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    const pathname = location.pathname;
    if (tabParam) return tabParam;
    if (pathname.includes('reports')) return 'reports';
    if (pathname.includes('plan-details')) return 'plan-details';
    if (pathname.includes('usage-limits')) return 'usage-limits';
    if (pathname.includes('tariffs') || pathname.includes('settings')) return 'settings';
    return 'notifications';
  };

  const [activeTab, setActiveTab] = useState(getTab);

  useEffect(() => { setActiveTab(getTab()); }, [location.pathname, location.search]);

  const formatTenantPath = (path) => {
    if (!path) return path;
    if (user?.role === 'SUPER_ADMIN') return path;
    const domainFromPath = location.pathname.split('/')[1];
    const isKnownNonTenant = ['admin', 'hospital-admin', 'doctor', 'reception', 'billing', 'pharmacy', 'laboratory', 'radiology', 'nursing', '403', 'login'].includes(domainFromPath);
    const domain = user?.hospitalDomain || (!isKnownNonTenant && domainFromPath ? domainFromPath : null);
    if (!domain) return path;
    if (path.startsWith(`/${domain}`)) return path;
    return `/${domain}${path}`;
  };

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    let targetPath = '/admin/dashboard?tab=notifications';
    if (tabKey === 'reports') targetPath = '/admin/reports';
    else if (tabKey === 'audit') targetPath = '/admin/reports?tab=audit';
    else if (tabKey === 'plan-details') targetPath = '/admin/plan-details';
    else if (tabKey === 'usage-limits') targetPath = '/admin/usage-limits';
    else if (tabKey === 'settings') targetPath = '/admin/tariffs';
    else if (tabKey === 'notifications') targetPath = '/admin/dashboard?tab=notifications';
    navigate(formatTenantPath(targetPath));
  };

  const tabIcon = (key) => {
    const t = ADMIN_TABS.find((t) => t.key === key);
    if (!t) return null;
    const I = t.icon;
    return <I size={15} />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            {tabIcon(activeTab)}
            {ADMIN_TABS.find((t) => t.key === activeTab)?.label || 'Admin'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Hospital Administration Control Panel</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs font-bold"
          onClick={() => navigate(formatTenantPath('/admin/dashboard'))}
        >
          ← Back to Admin Dashboard
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {ADMIN_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'notifications' && <NotificationsPanel />}
        {activeTab === 'reports' && <ReportsPanel formatTenantPath={formatTenantPath} />}
        {activeTab === 'audit' && <AuditLogsPanel />}
        {activeTab === 'plan-details' && <PlanDetailsPanel />}
        {activeTab === 'usage-limits' && <UsageLimitsPanel />}
        {activeTab === 'settings' && <HospitalSettingsPanel />}
      </div>
    </div>
  );
};

export default AdminExtraPage;
