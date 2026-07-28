import React, { useState, useEffect } from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { Building2, ShieldCheck, CheckCircle, Clock, Users, PlusCircle, X, Key } from 'lucide-react';

export const SuperAdminDashboard = () => {
  const [hospitals, setHospitals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDirectCreateOpen, setIsDirectCreateOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [provisionedCreds, setProvisionedCreds] = useState(null);

  useScrollLock(isDirectCreateOpen || Boolean(provisionedCreds));

  const [directForm, setDirectForm] = useState({
    hospitalName: '',
    subdomain: '',
    plan: 'ENTERPRISE',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    adminPassword: '',
  });

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      const res = await axiosClient.get('/saas/hospitals');
      setHospitals(res.data);
    } catch (err) {
      console.error('Failed to load SaaS hospitals:', err);
    }
  };

  const handleApprove = async (hospitalId, name) => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await axiosClient.patch(`/saas/hospitals/${hospitalId}/approve`);
      setActionMessage(`Hospital '${name}' approved successfully! Admin account provisioned: ${res.data.adminUser?.email}`);
      fetchHospitals();
    } catch (err) {
      setActionMessage(`Failed to approve hospital: ${err.error?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectCreate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setActionMessage(null);
    try {
      // 1. Submit Registration
      const res = await axiosClient.post('/saas/register-hospital', {
        ...directForm,
        adminPassword: directForm.adminPassword || 'HospitalAdmin123!',
      });
      const hospitalId = res.data.hospital._id;

      // 2. Instantly Approve & Provision Credentials
      const approveRes = await axiosClient.patch(`/saas/hospitals/${hospitalId}/approve`);

      setProvisionedCreds({
        hospitalName: directForm.hospitalName,
        adminEmail: approveRes.data.adminUser?.email || directForm.contactEmail,
        adminPassword: directForm.adminPassword || 'HospitalAdmin123!',
        loginUrl: 'http://localhost:5173/login',
      });

      fetchHospitals();
    } catch (err) {
      setActionMessage(`Failed to provision hospital: ${err.error?.message || err.message}`);
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
      console.error('Failed to toggle status:', err);
    }
  };

  const pendingHospitals = hospitals.filter((h) => h.status === 'PENDING_APPROVAL');
  const approvedHospitals = hospitals.filter((h) => h.status === 'APPROVED');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Master Platform Owner SaaS Control Center</h2>
          <p className="text-xs text-slate-400 mt-1">Platform Master Super Admin — `superadmin@platform.com`</p>
        </div>
        <Button variant="primary" size="sm" className="font-bold" onClick={() => setIsDirectCreateOpen(true)}>
          <PlusCircle size={16} /> Provision Hospital & Create Credentials
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Registered Hospitals" value={`${hospitals.length} Tenants`} subtitle="Multi-Tenant Isolation" icon={Building2} color="sky" />
        <StatCard title="Pending SaaS Approvals" value={`${pendingHospitals.length} Applications`} subtitle="Action Required" icon={Clock} color="amber" />
        <StatCard title="Active Subscriptions" value={`${approvedHospitals.length} Approved`} subtitle="Enterprise & Pro" icon={ShieldCheck} color="emerald" />
        <StatCard title="Platform Data Protection" value="100% Isolated" subtitle="Zero Cross-Tenant Access" icon={Users} color="purple" />
      </div>

      {actionMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle size={16} /> {actionMessage}
        </div>
      )}

      {/* Pending Hospital Applications */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock size={18} className="text-amber-400" />
            Pending SaaS Hospital Registration Applications ({pendingHospitals.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Hospital Name</th>
                <th className="p-3">Subdomain</th>
                <th className="p-3">Contact Officer</th>
                <th className="p-3">SaaS Plan</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Approval Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {pendingHospitals.length > 0 ? (
                pendingHospitals.map((hosp) => (
                  <tr key={hosp._id} className="hover:bg-slate-900/40">
                    <td className="p-3 font-bold text-white">{hosp.name}</td>
                    <td className="p-3 font-mono text-sky-400">{hosp.subdomain}.hpmbs.com</td>
                    <td className="p-3 text-slate-300">{hosp.contactName} ({hosp.contactEmail})</td>
                    <td className="p-3 font-bold text-purple-400">{hosp.plan}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                        PENDING_APPROVAL
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="success" className="font-bold" isLoading={isLoading} onClick={() => handleApprove(hosp._id, hosp.name)}>
                        <CheckCircle size={14} /> Approve Hospital Tenant
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-500">
                    No pending hospital applications. Click 'Provision Hospital & Create Credentials' to create a tenant directly!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Approved Active SaaS Hospitals */}
      <Card>
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Building2 size={18} className="text-sky-400" />
          Active SaaS Tenant Hospitals ({approvedHospitals.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Hospital Tenant Name</th>
                <th className="p-3">Subdomain Code</th>
                <th className="p-3">Authorized Admin Email</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {approvedHospitals.length > 0 ? (
                approvedHospitals.map((hosp) => (
                  <tr key={hosp._id} className="hover:bg-slate-900/40">
                    <td className="p-3 font-bold text-white">{hosp.name}</td>
                    <td className="p-3 font-mono text-sky-400">{hosp.subdomain}</td>
                    <td className="p-3 text-slate-300">{hosp.contactEmail}</td>
                    <td className="p-3 font-bold text-purple-400">{hosp.plan}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        hosp.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {hosp.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant={hosp.status === 'SUSPENDED' ? 'success' : 'outline'} onClick={() => handleStatusToggle(hosp._id, hosp.status)}>
                        {hosp.status === 'SUSPENDED' ? 'Re-Activate' : 'Suspend Tenant'}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-500">
                    No active approved hospitals yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Direct Provisioning Modal */}
      {isDirectCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full glass-panel rounded-2xl p-6 relative border border-sky-500/30">
            <button onClick={() => { setIsDirectCreateOpen(false); setProvisionedCreds(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X size={20} />
            </button>

            {provisionedCreds ? (
              <div className="text-center space-y-4 py-4 text-xs">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle size={28} />
                </div>
                <h3 className="text-xl font-bold text-white">Hospital Account Handover Ready!</h3>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left space-y-2 font-mono">
                  <p><span className="text-slate-400">Hospital:</span> <span className="text-white font-bold">{provisionedCreds.hospitalName}</span></p>
                  <p><span className="text-slate-400">Admin Email:</span> <span className="text-sky-400 font-bold">{provisionedCreds.adminEmail}</span></p>
                  <p><span className="text-slate-400">Admin Password:</span> <span className="text-emerald-400 font-bold">{provisionedCreds.adminPassword}</span></p>
                  <p><span className="text-slate-400">Login URL:</span> <span className="text-purple-400">{provisionedCreds.loginUrl}</span></p>
                </div>
                <p className="text-[11px] text-slate-400">
                  Hand over these login credentials to the hospital client. They can now log in, create their doctors, staff, and run their hospital!
                </p>
                <Button variant="primary" className="w-full font-bold" onClick={() => { setIsDirectCreateOpen(false); setProvisionedCreds(null); }}>
                  Done & Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleDirectCreate} className="space-y-4 text-xs">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="text-sky-400" size={22} />
                  <div>
                    <h3 className="text-lg font-bold text-white">Direct Hospital Sale & Credentials Provisioning</h3>
                    <p className="text-[11px] text-slate-400">Create an approved hospital tenant and generate their Admin credentials immediately.</p>
                  </div>
                </div>

                <Input
                  label="Hospital Client Name"
                  value={directForm.hospitalName}
                  onChange={(e) => setDirectForm({ ...directForm, hospitalName: e.target.value })}
                  placeholder="e.g. City General Hospital"
                  required
                />

                <Input
                  label="Subdomain / Code"
                  value={directForm.subdomain}
                  onChange={(e) => setDirectForm({ ...directForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                  placeholder="e.g. citygeneral"
                  required
                />

                <Input
                  label="Hospital Authorized Officer Name"
                  value={directForm.contactName}
                  onChange={(e) => setDirectForm({ ...directForm, contactName: e.target.value })}
                  placeholder="e.g. Dr. Robert Vance"
                  required
                />

                <Input
                  label="Hospital Admin Email (Handover Login ID)"
                  type="email"
                  value={directForm.contactEmail}
                  onChange={(e) => setDirectForm({ ...directForm, contactEmail: e.target.value })}
                  placeholder="e.g. admin@citygeneral.com"
                  required
                />

                <Input
                  label="Hospital Admin Password"
                  type="password"
                  value={directForm.adminPassword}
                  onChange={(e) => setDirectForm({ ...directForm, adminPassword: e.target.value })}
                  placeholder="Default: HospitalAdmin123!"
                />

                <div className="pt-2 flex gap-2">
                  <Button type="button" variant="outline" className="w-1/2" onClick={() => setIsDirectCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" className="w-1/2 font-bold" isLoading={isLoading}>
                    Provision & Generate Credentials
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
