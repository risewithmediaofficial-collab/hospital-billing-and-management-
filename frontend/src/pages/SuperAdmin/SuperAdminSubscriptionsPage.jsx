import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, Building2, AlertTriangle, CheckCircle2, Clock,
  TrendingUp, Zap, Globe, RefreshCw, ChevronRight, XCircle
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { formatDate } from '../../utils/formatters';

const PLAN_STYLES = {
  BASIC:       { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: Zap },
  STANDARD:    { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', icon: TrendingUp },
  UNLIMITED:   { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: Globe },
  PROFESSIONAL: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', icon: TrendingUp },
  ENTERPRISE:  { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', icon: Globe },
  STARTER:     { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', icon: Zap },
};

const PLAN_PRICES = {
  BASIC: '₹4,000/mo',
  STANDARD: '₹30,000/mo',
  UNLIMITED: '₹50,000/mo',
  PROFESSIONAL: '₹6,999/mo',
  ENTERPRISE: '₹14,999/mo',
  STARTER: '₹2,999/mo',
};

export const SuperAdminSubscriptionsPage = () => {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [alerts, setAlerts] = useState({ expiringSoon: [], expired: [], trialsExpiringSoon: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [hospRes, alertsRes] = await Promise.allSettled([
        axiosClient.get('/saas/hospitals/stats'),
        axiosClient.get('/saas/subscriptions/alerts'),
      ]);
      if (hospRes.status === 'fulfilled') setHospitals(hospRes.value.data || []);
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.data || { expiringSoon: [], expired: [], trialsExpiringSoon: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const byPlan = hospitals.reduce((acc, h) => {
    const plan = h.plan || 'BASIC';
    if (!acc[plan]) acc[plan] = [];
    acc[plan].push(h);
    return acc;
  }, {});

  const activeHospitals = hospitals.filter((h) => !h.isDeleted && h.status === 'APPROVED');
  const trialHospitals = hospitals.filter((h) => h.isTrial && h.status === 'APPROVED');
  const paidHospitals = hospitals.filter((h) => !h.isTrial && h.status === 'APPROVED');
  const expiredHospitals = hospitals.filter((h) => h.status === 'EXPIRED');

  const totalAlerts = (alerts.expiringSoon?.length || 0) + (alerts.trialsExpiringSoon?.length || 0);

  const getDaysLeft = (dateStr) => {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const tabs = [
    { key: 'overview', label: 'Overview', count: null },
    { key: 'alerts', label: 'Alerts', count: totalAlerts, urgent: totalAlerts > 0 },
    { key: 'active', label: 'Active Hospitals', count: activeHospitals.length },
    { key: 'expired', label: 'Expired', count: expiredHospitals.length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-3">
            <CreditCard size={24} className="text-indigo-600" />
            Subscription Management
          </h2>
          <p className="text-xs text-neutral-500 mt-1">Manage hospital SaaS plans, expiry alerts & billing across the platform</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Hospitals', value: hospitals.length, color: 'text-slate-900', bg: 'bg-slate-50', border: 'border-slate-200' },
          { label: 'Active Subscriptions', value: activeHospitals.length, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'On Free Trial', value: trialHospitals.length, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
          { label: 'Expiring / Expired', value: totalAlerts + expiredHospitals.length, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', urgent: totalAlerts > 0 },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-2xl border p-4 ${stat.bg} ${stat.border} ${stat.urgent ? 'ring-2 ring-red-300' : ''}`}>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{stat.label}</p>
            <p className={`text-3xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                tab.urgent ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Alerts */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {totalAlerts === 0 && (alerts.expired?.length || 0) === 0 ? (
            <Card>
              <div className="text-center py-10">
                <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3" />
                <p className="text-slate-600 font-semibold">No active subscription alerts</p>
                <p className="text-xs text-slate-400 mt-1">All hospital plans are active and healthy.</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Expiring Soon (paid) */}
              {(alerts.expiringSoon?.length || 0) > 0 && (
                <Card>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                    <AlertTriangle size={18} className="text-amber-500" />
                    Paid Plans Expiring Within 7 Days ({alerts.expiringSoon.length})
                  </h3>
                  <div className="space-y-2">
                    {alerts.expiringSoon.map((h) => {
                      const days = getDaysLeft(h.subscriptionEndDate);
                      return (
                        <div key={h._id} className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors">
                          <div>
                            <p className="font-bold text-sm text-slate-900">{h.name}</p>
                            <p className="text-xs text-slate-500">{h.plan} · Expires: {formatDate(h.subscriptionEndDate)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-black ${days <= 2 ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                              {days} days left
                            </span>
                            <Button size="sm" variant="outline" onClick={() => navigate(`/admin/hospital/${h._id}/dashboard`)}>
                              Manage
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Trials Expiring Soon */}
              {(alerts.trialsExpiringSoon?.length || 0) > 0 && (
                <Card>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                    <Clock size={18} className="text-blue-500" />
                    Free Trials Expiring Within 7 Days ({alerts.trialsExpiringSoon.length})
                  </h3>
                  <div className="space-y-2">
                    {alerts.trialsExpiringSoon.map((h) => {
                      const days = getDaysLeft(h.trialEndDate);
                      return (
                        <div key={h._id} className="flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50">
                          <div>
                            <p className="font-bold text-sm text-slate-900">{h.name}</p>
                            <p className="text-xs text-slate-500">{h.plan} plan · Trial ends: {formatDate(h.trialEndDate)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-500 text-white">
                              {days} days left
                            </span>
                            <Button size="sm" variant="outline" onClick={() => navigate(`/admin/hospital/${h._id}/dashboard`)}>
                              Manage
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Expired */}
              {(alerts.expired?.length || 0) > 0 && (
                <Card>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                    <XCircle size={18} className="text-red-500" />
                    Expired Subscriptions — Data Retention Active ({alerts.expired.length})
                  </h3>
                  <div className="space-y-2">
                    {alerts.expired.slice(0, 10).map((h) => {
                      const retentionDays = h.dataRetentionDeadline ? getDaysLeft(h.dataRetentionDeadline) : null;
                      return (
                        <div key={h._id} className="flex items-center justify-between p-3 rounded-xl border border-red-200 bg-red-50">
                          <div>
                            <p className="font-bold text-sm text-slate-900">{h.name}</p>
                            <p className="text-xs text-slate-500">
                              {h.plan} · Expired: {formatDate(h.subscriptionEndDate)}
                              {retentionDays !== null && ` · Data deleted in ${retentionDays} days`}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/admin/hospital/${h._id}/dashboard`)}>
                            View
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { code: 'BASIC', price: '₹4,000/mo', limit: '100 patients', count: (byPlan.BASIC || []).length },
              { code: 'STANDARD', price: '₹30,000/mo', limit: '1,000 patients', count: (byPlan.STANDARD || []).length },
              { code: 'UNLIMITED', price: '₹50,000/mo', limit: 'Unlimited patients', count: (byPlan.UNLIMITED || []).length },
            ].map((tier) => {
              const style = PLAN_STYLES[tier.code] || PLAN_STYLES.BASIC;
              const Icon = style.icon;
              return (
                <div key={tier.code} className={`p-5 rounded-2xl border ${style.bg} ${style.border}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <Icon size={18} className={style.text} />
                    <span className={`font-black text-sm uppercase tracking-wide ${style.text}`}>{tier.code}</span>
                  </div>
                  <p className="text-3xl font-black text-slate-900 mb-1">{tier.count}</p>
                  <p className="text-xs text-slate-500">hospitals · {tier.price}</p>
                  <p className={`text-xs font-semibold mt-1 ${style.text}`}>{tier.limit}/month</p>
                </div>
              );
            })}
          </div>
          {Object.entries(byPlan).map(([plan, list]) => {
            const style = PLAN_STYLES[plan] || PLAN_STYLES.BASIC;
            const Icon = style.icon;
            return (
              <Card key={plan}>
                <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                  <Icon size={18} className={style.text} />
                  {plan} Plan — {PLAN_PRICES[plan] || ''} · {list.length} hospitals
                </h3>
                <div className="space-y-2">
                  {list.map((h) => (
                    <div key={h._id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <Building2 size={16} className="text-slate-400" />
                        <div>
                          <p className="font-semibold text-sm">{h.name}</p>
                          <p className="text-xs text-slate-500">
                            {h.isTrial ? '7-day Trial' : 'Paid'} · {formatDate(h.createdAt)} · {h.status}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/admin/hospital/${h._id}/dashboard`)}>
                        <ChevronRight size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tab: Active */}
      {activeTab === 'active' && (
        <Card>
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
            <CheckCircle2 size={18} className="text-emerald-500" /> Active Hospital Subscriptions ({activeHospitals.length})
          </h3>
          <div className="space-y-2">
            {activeHospitals.map((h) => (
              <div key={h._id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                <div>
                  <p className="font-semibold text-sm">{h.name}</p>
                  <p className="text-xs text-slate-500">
                    {h.plan} · {h.isTrial ? `Trial ends ${formatDate(h.trialEndDate)}` : `Renews ${formatDate(h.subscriptionEndDate)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${h.isTrial ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {h.isTrial ? 'FREE TRIAL' : 'PAID'}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/admin/hospital/${h._id}/dashboard`)}>
                    Manage
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab: Expired */}
      {activeTab === 'expired' && (
        <Card>
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
            <XCircle size={18} className="text-red-500" /> Expired Subscriptions ({expiredHospitals.length})
          </h3>
          <div className="space-y-2">
            {expiredHospitals.map((h) => {
              const days = h.dataRetentionDeadline ? getDaysLeft(h.dataRetentionDeadline) : null;
              return (
                <div key={h._id} className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50 hover:bg-red-100">
                  <div>
                    <p className="font-semibold text-sm">{h.name}</p>
                    <p className="text-xs text-slate-500">
                      {h.plan} · Expired: {formatDate(h.subscriptionEndDate)}
                      {days !== null && ` · ${days > 0 ? `Data deleted in ${days} days` : 'Awaiting deletion'}`}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/admin/hospital/${h._id}/dashboard`)}>View</Button>
                </div>
              );
            })}
            {expiredHospitals.length === 0 && (
              <p className="text-center text-slate-400 py-8 text-sm">No expired subscriptions.</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
