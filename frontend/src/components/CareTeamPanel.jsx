import React, { useState, useEffect } from 'react';

const roleColors = {
  PRIMARY_DOCTOR: '#4f46e5',
  CONSULTING_DOCTOR: '#7c3aed',
  NURSE: '#0891b2',
  DUTY_NURSE: '#0e7490',
  CARETAKER: '#059669',
  ICU_SPECIALIST: '#dc2626',
  WARD_STAFF: '#d97706',
  PHYSIOTHERAPIST: '#2563eb',
  DIETITIAN: '#16a34a',
};

const roleIcons = {
  PRIMARY_DOCTOR: '',
  CONSULTING_DOCTOR: '',
  NURSE: '',
  DUTY_NURSE: '',
  CARETAKER: '',
  ICU_SPECIALIST: '',
  WARD_STAFF: '',
  PHYSIOTHERAPIST: '',
  DIETITIAN: '',
};

const roleLabels = {
  PRIMARY_DOCTOR: 'Primary Doctor',
  CONSULTING_DOCTOR: 'Consulting Doctor',
  NURSE: 'Assigned Nurse',
  DUTY_NURSE: 'Duty Nurse',
  CARETAKER: 'Caretaker',
  ICU_SPECIALIST: 'ICU Specialist',
  WARD_STAFF: 'Ward Staff',
  PHYSIOTHERAPIST: 'Physiotherapist',
  DIETITIAN: 'Dietitian',
};

const fmt = (date) => date ? new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export default function CareTeamPanel({ admissionId, isReadOnly = false, token, onAssign }) {
  const [careTeam, setCareTeam] = useState({ active: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState('');

  const fetchCareTeam = async () => {
    if (!admissionId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/admissions/${admissionId}/care-team`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setCareTeam(data.data);
    } catch (e) {
      setError('Failed to load care team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCareTeam(); }, [admissionId]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.skeleton}>Loading care team...</div>
      </div>
    );
  }

  const activeByRole = {};
  careTeam.active.forEach(a => {
    if (!activeByRole[a.role]) activeByRole[a.role] = [];
    activeByRole[a.role].push(a);
  });

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerTitle}>Care Team</span>
          {isReadOnly && (
            <span style={styles.readOnlyBadge}>DISCHARGED · READ ONLY</span>
          )}
        </div>
        {!isReadOnly && onAssign && (
          <button onClick={onAssign} style={styles.assignBtn}>
            + Assign Member
          </button>
        )}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Active Team */}
      {careTeam.active.length === 0 ? (
        <div style={styles.emptyState}>
          <span>No care team assigned yet</span>
          {!isReadOnly && <span style={styles.emptyHint}>Assign a doctor and nurse to activate care team</span>}
        </div>
      ) : (
        <div style={styles.grid}>
          {Object.entries(activeByRole).map(([role, members]) =>
            members.map((member, idx) => (
              <div key={member._id || idx} style={styles.card}>
                <div style={{ ...styles.roleStripe, background: roleColors[role] || '#6b7280' }} />
                <div style={styles.cardBody}>
                  <div style={styles.roleLabel}>
                    <span style={{ ...styles.roleBadge, background: roleColors[role] || '#6b7280' }}>
                      {roleLabels[role] || role}
                    </span>
                  </div>
                  <div style={styles.memberName}>{member.userId?.name || member.userName}</div>
                  {member.userId?.specialization && (
                    <div style={styles.memberDetail}>{member.userId.specialization}</div>
                  )}
                  {member.userId?.phone && (
                    <div style={styles.memberDetail}>Phone: {member.userId.phone}</div>
                  )}
                  <div style={styles.assignedAt}>
                    Assigned: {fmt(member.assignedAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History Toggle */}
      {careTeam.history.length > 0 && (
        <div style={styles.historySection}>
          <button
            onClick={() => setShowHistory(s => !s)}
            style={styles.historyToggle}
          >
            {showHistory ? 'Hide' : 'Show'} Assignment History ({careTeam.history.length} changes)
          </button>

          {showHistory && (
            <div style={styles.historyList}>
              {careTeam.history.map((h, idx) => (
                <div key={idx} style={styles.historyRow}>
                  <div style={styles.historyRole}>
                    <span>{roleLabels[h.role] || h.role}</span>
                  </div>
                  <div style={styles.historyName}>{h.userId?.name || h.userName}</div>
                  <div style={styles.historyTimes}>
                    <span>Assigned: {fmt(h.assignedAt)}</span>
                    <span style={{ color: '#ef4444' }}>Removed: {fmt(h.removedAt)}</span>
                  </div>
                  {h.removalReason && (
                    <div style={styles.historyReason}>Reason: {h.removalReason}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerIcon: { fontSize: '20px' },
  headerTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#f0f0f0',
  },
  readOnlyBadge: {
    background: 'rgba(239,68,68,0.15)',
    color: '#f87171',
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 10px',
    borderRadius: '20px',
    border: '1px solid rgba(239,68,68,0.3)',
  },
  assignBtn: {
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  skeleton: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '14px',
    textAlign: 'center',
    padding: '20px',
  },
  error: {
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    borderRadius: '8px',
    padding: '8px 14px',
    fontSize: '13px',
    marginBottom: '12px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '24px',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
  },
  emptyHint: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '12px',
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  roleStripe: {
    height: '4px',
    width: '100%',
  },
  cardBody: {
    padding: '14px',
  },
  roleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
    fontSize: '12px',
  },
  roleBadge: {
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
  },
  memberName: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#f0f0f0',
    marginBottom: '4px',
  },
  memberDetail: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '2px',
  },
  assignedAt: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
    marginTop: '8px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '8px',
  },
  historySection: {
    marginTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    paddingTop: '12px',
  },
  historyToggle: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '4px 0',
  },
  historyList: {
    marginTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  historyRow: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    padding: '10px 14px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  historyRole: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '4px',
  },
  historyName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#d0d0d0',
    marginBottom: '4px',
  },
  historyTimes: {
    display: 'flex',
    gap: '16px',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
  },
  historyReason: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
    marginTop: '4px',
    fontStyle: 'italic',
  },
};
