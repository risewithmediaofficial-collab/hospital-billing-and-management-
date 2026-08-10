import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, ShieldCheck, CheckCircle, CheckCircle2, XCircle, PlusCircle, Key, Eye, EyeOff, MapPin, Mail, Phone, Trash2, RotateCcw, Clock } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';

export const SuperAdminHospitalsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');
  const tabFilter = searchParams.get('tab') || (statusFilter === 'APPROVED' ? 'ACTIVE' : statusFilter === 'inactive' ? 'EXPIRED' : 'ALL');

  const [hospitals, setHospitals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDirectCreateOpen, setIsDirectCreateOpen] = useState(false);
  const [isEditCredentialsOpen, setIsEditCredentialsOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [credentialsForm, setCredentialsForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
  });
  const [actionMessage, setActionMessage] = useState(null);
  const [provisionedCreds, setProvisionedCreds] = useState(null);
  const [viewMode, setViewMode] = useState('cards');

  useScrollLock(isDirectCreateOpen || isEditCredentialsOpen || Boolean(provisionedCreds));

  const [directForm, setDirectForm] = useState({
    hospitalName: '', subdomain: '', plan: 'ENTERPRISE',
    contactName: '', contactEmail: '', contactPhone: '', adminPassword: '', confirmAdminPassword: '',
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
    const isDel = h.isDeleted === true || h.status === 'DELETED';
    const isExp = h.isExpired === true || h.status === 'EXPIRED';

    if (tabFilter === 'PENDING') {
      return !isDel && (h.status === 'PENDING_APPROVAL' || h.status === 'PENDING');
    }
    if (tabFilter === 'ACTIVE') {
      return !isDel && !isExp && h.status === 'APPROVED';
    }
    if (tabFilter === 'EXPIRED') {
      return !isDel && isExp;
    }
    if (tabFilter === 'DELETED') {
      return isDel;
    }
    // Default 'ALL': Show all registered hospitals matching Total Hospitals count
    return true;
  });

  const pendingCount = hospitals.filter((h) => !h.isDeleted && (h.status === 'PENDING_APPROVAL' || h.status === 'PENDING')).length;
  const activeCount = hospitals.filter((h) => !h.isDeleted && h.status !== 'DELETED' && !h.isExpired && h.status === 'APPROVED').length;
  const expiredCount = hospitals.filter((h) => (h.isExpired || h.status === 'EXPIRED') && !h.isDeleted).length;
  const deletedCount = hospitals.filter((h) => h.isDeleted || h.status === 'DELETED').length;

  const handleApprove = async (hospitalId, name) => {
    setIsLoading(true);
    try {
      await axiosClient.patch(`/saas/hospitals/${hospitalId}/approve`);
      setActionMessage(`Hospital '${name}' approved successfully! Initial Admin password generated.`);
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

  const handleDeleteHospital = async (hospitalId, name) => {
    if (!window.confirm(`Are you sure you want to delete hospital '${name}'? It can be restored anytime from Deleted Hospitals.`)) return;
    setIsLoading(true);
    try {
      await axiosClient.patch(`/saas/hospitals/${hospitalId}/delete`);
      setActionMessage(`Hospital '${name}' moved to Deleted Hospitals.`);
      fetchHospitals();
    } catch (err) {
      setActionMessage(`Failed to delete: ${err.error?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreHospital = async (hospitalId, name) => {
    setIsLoading(true);
    try {
      await axiosClient.patch(`/saas/hospitals/${hospitalId}/restore`);
      setActionMessage(`Hospital '${name}' restored to Active Hospitals successfully!`);
      fetchHospitals();
    } catch (err) {
      setActionMessage(`Failed to restore: ${err.error?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermanentDelete = async (hospitalId, name) => {
    if (!window.confirm(`⚠️ WARNING: Are you absolutely sure you want to PERMANENTLY delete hospital '${name}'? This will completely wipe all of its branches, departments, users, and transactions from the database immediately. This action CANNOT be undone.`)) return;
    setIsLoading(true);
    try {
      await axiosClient.delete(`/saas/hospitals/${hospitalId}/permanent`);
      setActionMessage(`Hospital '${name}' and all associated database records permanently deleted.`);
      fetchHospitals();
    } catch (err) {
      setActionMessage(`Failed to permanently delete: ${err.error?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditCredentialsModal = (hosp) => {
    setEditingHospital(hosp);
    setShowCurrentPassword(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setCredentialsForm({
      name: hosp.contactName || '',
      email: hosp.contactEmail || '',
      password: '',
      confirmPassword: '',
    });
    setIsEditCredentialsOpen(true);
  };

  const handleUpdateCredentials = async (e) => {
    e.preventDefault();
    const pass = (credentialsForm.password || '').trim();
    const confirm = (credentialsForm.confirmPassword || '').trim();

    if (pass || confirm) {
      if (pass !== confirm) {
        setActionMessage('New Password and Confirm Password do not match.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const payload = {
        name: credentialsForm.name,
        email: credentialsForm.email,
      };
      if (pass) {
        payload.password = pass;
      }

      await axiosClient.patch(`/saas/hospitals/${editingHospital._id}/admin-credentials`, payload);
      setActionMessage(`Admin credentials for '${editingHospital.name}' updated successfully!`);
      setIsEditCredentialsOpen(false);
      setEditingHospital(null);
      fetchHospitals();
    } catch (err) {
      const errorMsg = err.message || err.error?.message || (typeof err === 'string' ? err : 'Failed to update credentials');
      setActionMessage(`Failed to update credentials: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectCreate = async (e) => {
    e.preventDefault();
    const pass = (directForm.adminPassword || '').trim();
    const confirm = (directForm.confirmAdminPassword || '').trim();
    if (pass !== confirm) {
      setActionMessage('Admin Password and Confirm Admin Password do not match.');
      return;
    }
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
          <p className="text-xs text-neutral-500 mt-1">{filteredHospitals.length} hospitals displayed · Platform tenant overview</p>
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

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setSearchParams({ tab: 'ALL' })}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
            tabFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Building2 size={14} /> All Hospitals ({hospitals.filter((h) => !h.isDeleted && h.status !== 'DELETED').length})
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'PENDING' })}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
            tabFilter === 'PENDING' ? 'bg-amber-500 text-white shadow-xs' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
          }`}
        >
          <Clock size={14} /> Hospitals Requests ({pendingCount})
          {pendingCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          )}
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'ACTIVE' })}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
            tabFilter === 'ACTIVE' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <CheckCircle2 size={14} /> Active Hospitals ({activeCount})
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'EXPIRED' })}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
            tabFilter === 'EXPIRED' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Clock size={14} /> Expired Hospitals ({expiredCount})
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'DELETED' })}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
            tabFilter === 'DELETED' ? 'bg-red-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Trash2 size={14} /> Deleted Hospitals ({deletedCount})
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-700 text-xs font-bold flex items-center justify-between">
          <span className="flex items-center gap-2"><CheckCircle size={16} /> {actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
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
                  hosp.isDeleted || hosp.status === 'DELETED'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : hosp.isExpired || hosp.status === 'EXPIRED'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : hosp.status === 'APPROVED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>{hosp.isDeleted || hosp.status === 'DELETED' ? 'DELETED' : hosp.isExpired || hosp.status === 'EXPIRED' ? 'EXPIRED' : hosp.status}</span>
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

              <div className="mt-4 flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="primary" className="flex-1" onClick={() => navigate(`/admin/hospital/${hosp._id}/dashboard`)}>
                  <Eye size={14} /> View
                </Button>
                
                {!hosp.isDeleted && hosp.status !== 'DELETED' && (
                  <Button size="sm" variant="outline" className="flex-1 text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100 font-bold gap-1" onClick={() => openEditCredentialsModal(hosp)}>
                    <Key size={13} /> Admin
                  </Button>
                )}

                {hosp.isDeleted || hosp.status === 'DELETED' ? (
                  <>
                    <Button size="sm" variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 font-bold gap-1" isLoading={isLoading} onClick={() => handleRestoreHospital(hosp._id, hosp.name)}>
                      <RotateCcw size={13} /> Restore
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-700 bg-red-50 border-red-200 hover:bg-red-100 font-bold gap-1" isLoading={isLoading} onClick={() => handlePermanentDelete(hosp._id, hosp.name)}>
                      <Trash2 size={13} /> Permanent Delete
                    </Button>
                  </>
                ) : (
                  <>
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
                    <Button size="sm" variant="outline" className="text-red-700 bg-red-50 border-red-200 hover:bg-red-100 font-bold px-2.5" isLoading={isLoading} onClick={() => handleDeleteHospital(hosp._id, hosp.name)}>
                      <Trash2 size={13} /> Delete
                    </Button>
                  </>
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
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        hosp.isDeleted || hosp.status === 'DELETED' ? 'bg-red-100 text-red-800' : hosp.isExpired ? 'bg-amber-100 text-amber-800' : 'bg-neutral-200 text-neutral-800'
                      }`}>
                        {hosp.isDeleted || hosp.status === 'DELETED' ? 'DELETED' : hosp.isExpired ? 'EXPIRED' : hosp.status}
                      </span>
                    </td>
                    <td className="p-3">{formatDateTime(hosp.lastLogin)}</td>
                    <td className="p-3 text-right flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="primary" onClick={() => navigate(`/admin/hospital/${hosp._id}/dashboard`)}>View</Button>
                      {!hosp.isDeleted && hosp.status !== 'DELETED' && (
                        <Button size="sm" variant="outline" onClick={() => openEditCredentialsModal(hosp)}>Admin</Button>
                      )}
                      {hosp.isDeleted || hosp.status === 'DELETED' ? (
                        <>
                          <Button size="sm" variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200" onClick={() => handleRestoreHospital(hosp._id, hosp.name)}>Restore</Button>
                          <Button size="sm" variant="outline" className="text-red-700 bg-red-50 border-red-200" onClick={() => handlePermanentDelete(hosp._id, hosp.name)}>Permanent Delete</Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" className="text-red-700 bg-red-50 border-red-200" onClick={() => handleDeleteHospital(hosp._id, hosp.name)}>Delete</Button>
                      )}
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
                  <Input label="Hospital Name" value={directForm.hospitalName} onChange={(e) => setDirectForm({ ...directForm, hospitalName: e.target.value })} placeholder="Enter hospital name" required />
                  <Input label="Subdomain" value={directForm.subdomain} onChange={(e) => setDirectForm({ ...directForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })} placeholder="hospitalcode" required />
                  <Input label="Contact Name" value={directForm.contactName} onChange={(e) => setDirectForm({ ...directForm, contactName: e.target.value })} placeholder="Your Name" required />
                  <Input label="Admin Email" type="email" value={directForm.contactEmail} onChange={(e) => setDirectForm({ ...directForm, contactEmail: e.target.value })} placeholder="email@gmail.com" required />
                  <Input label="Admin Password" type="password" value={directForm.adminPassword} onChange={(e) => setDirectForm({ ...directForm, adminPassword: e.target.value })} placeholder="••••••••" />
                  <Input label="Confirm Admin Password" type="password" value={directForm.confirmAdminPassword} onChange={(e) => setDirectForm({ ...directForm, confirmAdminPassword: e.target.value })} placeholder="••••••••" />
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

      {isEditCredentialsOpen && editingHospital && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-container max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100"><Key size={18} /></div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Hospital Admin Credentials</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{editingHospital.name} ({editingHospital.code})</p>
                </div>
              </div>
              <button onClick={() => { setIsEditCredentialsOpen(false); setEditingHospital(null); }} className="modal-close-btn">×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdateCredentials} className="space-y-4 text-xs">
                <Input
                  label="Hospital Admin Name"
                  value={credentialsForm.name}
                  onChange={(e) => setCredentialsForm({ ...credentialsForm, name: e.target.value })}
                  placeholder="Enter name"
                  required
                />
                <Input
                  label="Hospital Admin Email"
                  type="email"
                  value={credentialsForm.email}
                  onChange={(e) => setCredentialsForm({ ...credentialsForm, email: e.target.value })}
                  placeholder="email@example.com"
                  required
                />
                <div className="relative">
                  <Input
                    label="Current Password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={editingHospital.initialAdminPassword || 'HospitalAdmin123!'}
                    disabled
                    className="pr-10 bg-slate-50 border-slate-200 select-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-8 text-slate-400 hover:text-slate-900 p-0.5"
                    title={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    label="New Password (Leave blank to keep current)"
                    type={showPassword ? 'text' : 'password'}
                    value={credentialsForm.password}
                    onChange={(e) => setCredentialsForm({ ...credentialsForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-8 text-slate-400 hover:text-slate-900 p-0.5"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    label="Confirm New Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={credentialsForm.confirmPassword}
                    onChange={(e) => setCredentialsForm({ ...credentialsForm, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-8 text-slate-400 hover:text-slate-900 p-0.5"
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl space-y-1">
                  <p className="font-bold flex items-center gap-1"><span className="text-sm">💡</span> Password Reminder</p>
                  <p className="text-[10px]">
                    If you change the password here, the administrator will need to use the new password on their next login attempt.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" className="w-1/2" onClick={() => { setIsEditCredentialsOpen(false); setEditingHospital(null); }}>Cancel</Button>
                  <Button type="submit" variant="primary" className="w-1/2 font-bold" isLoading={isLoading}>Update Credentials</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};