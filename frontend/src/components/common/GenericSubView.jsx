import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatCard } from '../ui/StatCard';
import { useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';

export const GenericSubView = ({ title, subtitle, icon: IconName, stats = [], actions = [], tableData = [] }) => {
  const location = useLocation();
  const HeaderIcon = Icons[IconName] || Icons.Layers;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-neutral-100 text-neutral-600 border border-neutral-200">
              <HeaderIcon size={22} />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">{title}</h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1 font-medium">{subtitle}</p>
        </div>

        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map((act, idx) => {
              const BtnIcon = Icons[act.icon] || Icons.Plus;
              return (
                <Button key={idx} variant={act.variant || 'primary'} size="sm" onClick={act.onClick}>
                  <BtnIcon size={16} /> {act.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((st, idx) => (
            <StatCard
              key={idx}
              title={st.title}
              value={st.value}
              subtitle={st.subtitle}
              icon={Icons[st.icon] || Icons.Activity}
              color={st.color || 'sky'}
            />
          ))}
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
            <HeaderIcon size={18} className="text-neutral-600" />
            {title} Workstation Records
          </h3>
          <span className="text-xs text-neutral-500 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-neutral-400"></span> Live Connected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100 text-neutral-600 uppercase tracking-wider text-[10px] border-b border-neutral-200">
              <tr>
                <th className="p-3">Reference ID</th>
                <th className="p-3">Subject / Patient</th>
                <th className="p-3">Department / Ward</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {tableData.length > 0 ? (
                tableData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-neutral-600">{row.refId}</td>
                    <td className="p-3 font-bold text-neutral-900">{row.subject}</td>
                    <td className="p-3 text-neutral-600">{row.department}</td>
                    <td className="p-3 text-neutral-600">{row.time}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-300">
                        {row.status || 'COMPLETED'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => alert(`View Record ${row.refId}`)}>
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-neutral-500">
                    No workstation records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
