import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { axiosClient } from '../../api/axiosClient';
import {
  Calendar,
  AlertTriangle,
  Phone,
  Ticket,
  History,
  CheckCircle2,
  Clock,
  User,
  RefreshCw,
  Search,
} from 'lucide-react';

export const FollowUpVisitsSection = ({ onIssueToken, onViewHistory }) => {
  const [followUps, setFollowUps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('MISSED'); // 'MISSED' | 'TODAY' | 'UPCOMING' | 'ALL'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const fetchFollowUps = async () => {
    setIsLoading(true);
    try {
      const res = await axiosClient.get('/emr/follow-ups');
      setFollowUps(res.data || []);
    } catch (err) {
      console.error('Failed to fetch follow-ups:', err);
      setFollowUps([]);
    } finally {
      setIsLoading(false);
    }
  };

  const missedList = followUps.filter((f) => f.followUpStatus === 'MISSED_OVERDUE');
  const todayList = followUps.filter((f) => f.followUpStatus === 'TODAY');
  const upcomingList = followUps.filter((f) => f.followUpStatus === 'UPCOMING');

  const displayedList = followUps.filter((f) => {
    if (filterTab === 'MISSED') return f.followUpStatus === 'MISSED_OVERDUE';
    if (filterTab === 'TODAY') return f.followUpStatus === 'TODAY';
    if (filterTab === 'UPCOMING') return f.followUpStatus === 'UPCOMING';
    return true;
  }).filter((f) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      f.patientId?.firstName?.toLowerCase().includes(q) ||
      f.patientId?.lastName?.toLowerCase().includes(q) ||
      f.patientId?.uhid?.toLowerCase().includes(q) ||
      f.patientId?.phone?.toLowerCase().includes(q) ||
      f.doctorId?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <Card className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar size={18} className="text-indigo-600" />
            Follow-Up Visits & Missed Appointments Monitor
          </h3>
          <p className="text-xs text-slate-500">Track doctor-scheduled return dates & follow-up with patients who haven't arrived</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchFollowUps}
            className="text-xs font-bold gap-1"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </Button>
        </div>
      </div>

      {/* Missed Follow-Up Warning Banner */}
      {missedList.length > 0 && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="font-extrabold text-xs">
                ⚠️ {missedList.length} Patient(s) Missed Scheduled Follow-Up Date!
              </p>
              <p className="text-[11px] text-rose-700">
                Action Required: Call these patients to inquire about their recovery and reschedule their OPD token.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0"
            onClick={() => setFilterTab('MISSED')}
          >
            Review Overdue ({missedList.length})
          </Button>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
          <button
            onClick={() => setFilterTab('MISSED')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              filterTab === 'MISSED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ⚠️ Overdue / Missed ({missedList.length})
          </button>
          <button
            onClick={() => setFilterTab('TODAY')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              filterTab === 'TODAY'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            📅 Due Today ({todayList.length})
          </button>
          <button
            onClick={() => setFilterTab('UPCOMING')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              filterTab === 'UPCOMING'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🗓️ Upcoming ({upcomingList.length})
          </button>
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              filterTab === 'ALL'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Scheduled ({followUps.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patient, phone, UHID..."
            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
          />
        </div>
      </div>

      {/* Roster of Follow-Ups */}
      <div className="space-y-2.5">
        {displayedList.length > 0 ? (
          displayedList.map((item) => {
            const isOverdue = item.followUpStatus === 'MISSED_OVERDUE';
            const isToday = item.followUpStatus === 'TODAY';
            const fDate = new Date(item.followUpDate).toLocaleDateString();

            return (
              <div
                key={item._id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  isOverdue
                    ? 'bg-rose-50/50 border-rose-300 hover:border-rose-400'
                    : isToday
                    ? 'bg-amber-50/40 border-amber-300 hover:border-amber-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      {item.patientId?.firstName} {item.patientId?.lastName}
                    </span>
                    <span className="font-mono text-[11px] font-black bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                      {item.patientId?.uhid}
                    </span>
                    {isOverdue && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-200 text-rose-900 border border-rose-300 animate-pulse">
                        OVERDUE / MISSED
                      </span>
                    )}
                    {isToday && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">
                        DUE TODAY
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-slate-600 text-[11px]">
                    <span className="font-bold text-slate-800">
                      Phone: <a href={`tel:${item.patientId?.phone}`} className="text-indigo-600 underline">{item.patientId?.phone}</a>
                    </span>
                    <span>&bull;</span>
                    <span>Doctor: <strong>{item.doctorId?.name || 'Doctor'}</strong></span>
                    <span>&bull;</span>
                    <span>Follow-Up Date: <strong className={isOverdue ? 'text-rose-700' : 'text-slate-900'}>{fDate}</strong></span>
                  </div>
                  {item.diagnosis && (
                    <p className="text-[11px] text-slate-500">
                      Previous Diagnosis: <span className="italic text-slate-700">{item.diagnosis}</span>
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`tel:${item.patientId?.phone}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs"
                    title="Call Patient"
                  >
                    <Phone size={13} className="text-emerald-600" /> Call
                  </a>

                  {onViewHistory && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-bold text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 gap-1"
                      onClick={() => onViewHistory(item.patientId?.uhid || item.patientId?._id)}
                    >
                      <History size={13} /> History
                    </Button>
                  )}

                  {onIssueToken && (
                    <Button
                      size="sm"
                      variant="primary"
                      className="font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                      onClick={() => onIssueToken(item.patientId)}
                    >
                      <Ticket size={13} /> Issue Token
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-400 space-y-1">
            <Calendar size={28} className="mx-auto text-slate-300" />
            <p className="text-xs font-semibold">No follow-up visits found in this category.</p>
          </div>
        )}
      </div>
    </Card>
  );
};
