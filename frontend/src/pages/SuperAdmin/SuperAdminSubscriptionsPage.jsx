import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Building2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { formatDate } from '../../utils/formatters';

export const SuperAdminSubscriptionsPage = () => {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);

  useEffect(() => {
    axiosClient.get('/saas/hospitals/stats').then((res) => setHospitals(res.data || [])).catch(() => {});
  }, []);

  const byPlan = hospitals.reduce((acc, h) => {
    const plan = h.plan || 'PROFESSIONAL';
    if (!acc[plan]) acc[plan] = [];
    acc[plan].push(h);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Subscription Management</h2>
        <p className="text-xs text-neutral-500 mt-1">Manage hospital subscription plans across the platform</p>
      </div>

      {Object.entries(byPlan).map(([plan, list]) => (
        <Card key={plan}>
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-indigo-600" />
            {plan} Plan ({list.length} hospitals)
          </h3>
          <div className="space-y-2">
            {list.map((h) => (
              <div key={h._id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <Building2 size={16} className="text-slate-400" />
                  <div>
                    <p className="font-semibold text-sm">{h.name}</p>
                    <p className="text-xs text-slate-500">Registered {formatDate(h.createdAt)} · {h.status}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(`/admin/hospital/${h._id}/dashboard`)}>Manage</Button>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
};
