import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, ShieldCheck, CheckCircle, XCircle, PlusCircle, Key, Eye, MapPin, Mail, Phone } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';

export const SuperAdminHospitalsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');

  const [hospitals, setHospitals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDirectCreateOpen, setIsDirectCreateOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [provisionedCreds, setProvisionedCreds] = useState(null);
  const [viewMode, setViewMode] = useState('cards');

  useScrollLock(isDirectCreateOpen || Boolean(provisionedCreds));

  const [directForm, setDirectForm] = useState({
    hospitalName: '', subdomain: '', plan: 'ENTERPRISE',
    contactName: '', contactEmail: '', contactPhone: '', adminPassword: '',
  });

  useEffect(() => { fetchHospitals(); }, []);

  const fetchHospitals = async () => {
    try {
      const res = await axiosClient.get('/saas/hospitals/stats');
      setHospitals(res.data || []);
    } catch {
      try {
        const fallback = await axiosClient.get('/saas/hospitals');
        setHospitals(fallback.data || []);
      } catch (err) {
        console.error('Failed to load hospitals:', err);
      }
    }
  };

  const filteredHospitals = hospitals.filter((h) => {
    if (!statusFilter) return true;
    if (statusFilter === 'APPROVED') return h.status === 'APPROVED';
    if (statusFilter === 'inactive') return h.status !== 'APPROVED';
    return h.status === statusFilter;
  });

  const handleApprove = async (hospitalId, name) => {
    setIsLoading(true);
    try {
      await axiosClient.patch(`/saas/hospitals/${hospitalId}/approve`);
      setActionMessage(`Hospital '${name}' approved successfully!`);
      fetchHospitals();
    } catch (err) {
      setActionMessage(`Failed: ${err.error?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (hospitalId, name) => {
    setIsLoading(true);
    try {
      await axiosClient.patch(`/saas/hospitals/${hospitalId}/status`, { status: 'REJECTED' });
      setActionMessage(`Application for '${name}' rejected.`);
      fetchHospitals();
    } catch (err) {
      setActionMessage(`Failed: ${err.error?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusToggle = async (hospitalId, currentStatus) => {
    const nextStatus = currentStatus === 'SUSPENDED' ? 'APPROVED' : 'SUSPENDED';
    try {
      await axiosClient.patch(`/saas/hospitals/${hospitalId}/status`, { status: nextStatus });
      fetchHospitals();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDirectCreate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axiosClient.post('/saas/register-hospital', {
        ...directForm,
        adminPassword: directForm.adminPassword || 'HospitalAdmin123!',
      });
      const approveRes = await axiosClient.patch(`/saas/hospitals/${res.data.hospital._id}/approve`);
      setProvisionedCreds({
        hospitalName: directForm.hospitalName,
        adminEmail: approveRes.data.adminUser?.email || directForm.contactEmail,
        adminPassword: directForm.adminPassword || 'HospitalAdmin123!',
        loginUrl: `${window.location.origin}/login`,
      });
      fetchHospitals();
    } catch (err) {
      setActionMessage(`Failed: ${err.error?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Hospital Management</h2>
          <p className="text-xs text-neutral-500 mt-1">{filteredHospitals.length} hospitals · Full platform visibility</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}>
            {viewMode === 'cards' ? 'Table View' : 'Card View'}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsDirectCreateOpen(true)}>
            <PlusCircle size={16} /> Provision Hospital
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-700 text-xs font-bold flex items-center gap-2">
          <CheckCircle size={16} /> {actionMessage}
        </div>
      )}

      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredHospitals.map((hosp) => (
            <Card key={hosp._id} interactive className="cursor-pointer hover:border-indigo-200" onClick={() => navigate(`/admin/hospital/${hosp._id}/dashboard`)}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                  <Building2 size={24} className="text-indigo-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900 truncate">{hosp.name}</h3>
                  <p className="text-[10px] font-mono text-slate-500">{hosp.code} · ID: {hosp._id?.slice(-6)}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                  hosp.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>{hosp.status}</span>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                <p className="flex items-center gap-1.5"><ShieldCheck size={12} /> {hosp.administrator?.name || hosp.contactName} ({hosp.administrator?.email || hosp.contactEmail})</p>
                <p className="flex items-center gap-1.5"><Phone size={12} /> {hosp.contactPhone}</p>
                <p className="flex items-center gap-1.5"><MapPin size={12} /> {[hosp.address?.street, hosp.address?.city, hosp.address?.state].filter(Boolean).join(', ') || 'N/A'}</p>
                <p className="flex items-center gap-1.5"><Mail size={12} /> Reg: {formatDate(hosp.registrationDate || hosp.createdAt)} · Plan: {hosp.subscriptionPlan || hosp.plan}</p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-slate-50"><p className="text-lg font-black text-slate-800">{hosp.totalStaff || 0}</p><p className="text-[10px] text-slate-500">Staff</p></div>
                <div className="p-2 rounded-lg bg-slate-50"><p className="text-lg font-black text-slate-800">{hosp.totalPatients || 0}</p><p className="text-[10px] text-slate-500">Patients</p></div>
                <div className="p-2 rounded-lg bg-slate-50"><p className="text-lg font-black text-emerald-700">{formatCurrency(hosp.todayRevenue || 0)}</p><p className="text-[10px] text-slate-500">Today</p></div>
              </div>

              <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="primary" className="flex-1" onClick={() => navigate(`/admin/hospital/${hosp._id}/dashboard`)}>
                  <Eye size={14} /> View Hospital
                </Button>
                {hosp.status === 'PENDING_APPROVAL' && (
                  <>
                    <Button size="sm" variant="primary" isLoading={isLoading} onClick={() => handleApprove(hosp._id, hosp.name)}><CheckCircle size={14} /></Button>
                    <Button size="sm" variant="outline" isLoading={isLoading} onClick={() => handleReject(hosp._id, hosp.name)}><XCircle size={14} /></Button>
                  </>
                )}
                {hosp.status === 'APPROVED' && (
                  <Button size="sm" variant="outline" onClick={() => handleStatusToggle(hosp._id, hosp.status)}>Suspend</Button>
                )}
                {hosp.status === 'SUSPENDED' && (
                  <Button size="sm" variant="outline" onClick={() => handleStatusToggle(hosp._id, hosp.status)}>Re-Activate</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100 text-neutral-600 uppercase tracking-wider text-[10px] border-b">
                <tr>
                  <th className="p-3">Hospital</th>
                  <th className="p-3">Admin</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Staff</th>
                  <th className="p-3">Patients</th>
                  <th className="p-3">Revenue Today</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Last Login</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredHospitals.map((hosp) => (
                  <tr key={hosp._id} className="hover:bg-neutral-50">
                    <td className="p-3 font-bold">{hosp.name}<br /><span className="font-mono text-neutral-500">{hosp.code}</span></td>
                    <td className="p-3">{hosp.administrator?.email || hosp.contactEmail}</td>
                    <td className="p-3">{hosp.plan}</td>
                    <td className="p-3">{hosp.totalStaff || 0}</td>
                    <td className="p-3">{hosp.totalPatients || 0}</td>
                    <td className="p-3">{formatCurrency(hosp.todayRevenue || 0)}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-200">{hosp.status}</span></td>
                    <td className="p-3">{formatDateTime(hosp.lastLogin)}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="primary" onClick={() => navigate(`/admin/hospital/${hosp._id}/dashboard`)}>View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {filteredHospitals.length === 0 && (
        <Card><p className="text-center text-slate-500 py-8">No hospitals match the current filter.</p></Card>
      )}

      {isDirectCreateOpen && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-container max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neutral-100 border"><Key size={18} /></div>
                <h3 className="text-base font-bold">{provisionedCreds ? 'Credentials Ready' : 'Provision New Hospital'}</h3>
              </div>
              <button onClick={() => { setIsDirectCreateOpen(false); setProvisionedCreds(null); }} className="modal-close-btn">×</button>
            </div>
            <div className="modal-body">
              {provisionedCreds ? (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-neutral-50 border font-mono space-y-1">
                    <p>Hospital: <strong>{provisionedCreds.hospitalName}</strong></p>
                    <p>Admin: <strong>{provisionedCreds.adminEmail}</strong></p>
                    <p>Password: <strong>{provisionedCreds.adminPassword}</strong></p>
                  </div>
                  <Button variant="primary" className="w-full" onClick={() => { setIsDirectCreateOpen(false); setProvisionedCreds(null); }}>Done</Button>
                </div>
              ) : (
                <form onSubmit={handleDirectCreate} className="space-y-3 text-xs">
                  <Input label="Hospital Name" value={directForm.hospitalName} onChange={(e) => setDirectForm({ ...directForm, hospitalName: e.target.value })} required />
                  <Input label="Subdomain" value={directForm.subdomain} onChange={(e) => setDirectForm({ ...directForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })} required />
                  <Input label="Contact Name" value={directForm.contactName} onChange={(e) => setDirectForm({ ...directForm, contactName: e.target.value })} required />
                  <Input label="Admin Email" type="email" value={directForm.contactEmail} onChange={(e) => setDirectForm({ ...directForm, contactEmail: e.target.value })} required />
                  <Input label="Admin Password" type="password" value={directForm.adminPassword} onChange={(e) => setDirectForm({ ...directForm, adminPassword: e.target.value })} />
                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" className="w-1/2" onClick={() => setIsDirectCreateOpen(false)}>Cancel</Button>
                    <Button type="submit" variant="primary" className="w-1/2" isLoading={isLoading}>Provision</Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};