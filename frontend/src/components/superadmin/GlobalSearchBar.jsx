import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, Stethoscope, Users, UserCircle, Receipt, ShieldCheck, X } from 'lucide-react';
import { axiosClient } from '../../api/axiosClient';
import { useSuperAdminContextStore } from '../../store/superAdminContextStore';

const TYPE_ICONS = {
  hospitals: Building2,
  doctors: Stethoscope,
  staff: Users,
  patients: UserCircle,
  bills: Receipt,
  administrators: ShieldCheck,
};

export const GlobalSearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const { selectedHospitalId, setSelectedHospital } = useSuperAdminContextStore();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ q: query.trim() });
        if (selectedHospitalId) params.set('hospitalId', selectedHospitalId);
        const res = await axiosClient.get(`/saas/search?${params}`);
        setResults(res.data);
        setIsOpen(true);
      } catch {
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, selectedHospitalId]);

  const handleResultClick = (type, item) => {
    setIsOpen(false);
    setQuery('');

    if (type === 'hospitals') {
      setSelectedHospital(item._id, item.name);
      navigate(`/admin/hospital/${item._id}/dashboard`);
    } else if (type === 'doctors') {
      if (item.hospitalId?._id) setSelectedHospital(item.hospitalId._id, item.hospitalId.name);
      navigate('/admin/doctors');
    } else if (type === 'staff' || type === 'administrators') {
      if (item.hospitalId?._id) setSelectedHospital(item.hospitalId._id, item.hospitalId.name);
      navigate('/admin/staff');
    } else if (type === 'patients') {
      if (item.hospitalId?._id) setSelectedHospital(item.hospitalId._id, item.hospitalId.name);
      navigate('/admin/patients');
    } else if (type === 'bills') {
      if (item.hospitalId?._id) setSelectedHospital(item.hospitalId._id, item.hospitalId.name);
      navigate('/admin/billing');
    }
  };

  const sections = results
    ? [
        { key: 'hospitals', label: 'Hospitals', items: results.hospitals },
        { key: 'doctors', label: 'Doctors', items: results.doctors },
        { key: 'staff', label: 'Staff', items: results.staff },
        { key: 'patients', label: 'Patients', items: results.patients },
        { key: 'bills', label: 'Bills', items: results.bills },
        { key: 'administrators', label: 'Administrators', items: results.administrators },
      ].filter((s) => s.items?.length > 0)
    : [];

  const getLabel = (type, item) => {
    if (type === 'hospitals') return item.name;
    if (type === 'patients') return `${item.firstName} ${item.lastName} (${item.uhid})`;
    if (type === 'bills') return `${item.invoiceNo} — ₹${item.grandTotal}`;
    return `${item.name} (${item.email})`;
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder="Search hospitals, doctors, staff, patients..."
          className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults(null); setIsOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (sections.length > 0 || isLoading) && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl z-50 max-h-96 overflow-y-auto">
          {isLoading && <p className="p-4 text-sm text-slate-500">Searching...</p>}
          {!isLoading && sections.length === 0 && query.length >= 2 && (
            <p className="p-4 text-sm text-slate-500">No results found</p>
          )}
          {sections.map(({ key, label, items }) => {
            const Icon = TYPE_ICONS[key] || Search;
            return (
              <div key={key} className="border-b border-slate-100 last:border-0">
                <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50">{label}</p>
                {items.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => handleResultClick(key, item)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-indigo-50 flex items-center gap-2"
                  >
                    <Icon size={14} className="text-indigo-500 shrink-0" />
                    <span className="truncate text-slate-700">{getLabel(key, item)}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
