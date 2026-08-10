import React from 'react';

/**
 * DuplicatePatientModal
 * Shows when registration API returns 409 POSSIBLE_DUPLICATE.
 * Lets staff choose: open existing | confirm different person | cancel.
 */
export default function DuplicatePatientModal({ isOpen, duplicates = [], onOpenExisting, onConfirmDifferent, onCancel }) {
  if (!isOpen) return null;

  return (
    <div style={overlay}>
      <div style={modal}>
        {/* Warning Header */}
        <div style={headerBar}>
          <span style={{ fontSize: 28 }}>⚠️</span>
          <div>
            <div style={headerTitle}>Possible Existing Patient Found</div>
            <div style={headerSub}>
              {duplicates.length} matching record{duplicates.length > 1 ? 's' : ''} found in this hospital
            </div>
          </div>
        </div>

        <p style={infoText}>
          The phone number, email, or date of birth you entered matches an existing patient record.
          Please review before creating a new record.
        </p>

        {/* Existing records */}
        <div style={listContainer}>
          {duplicates.map((p, idx) => (
            <div key={p._id || idx} style={recordCard}>
              <div style={recordHeader}>
                <span style={uhidBadge}>{p.uhid}</span>
                <span style={getAdmissionBadgeStyle(p.admissionStatus)}>
                  {p.admissionStatus === 'ACTIVE_ADMISSION' ? '🔴 Admitted' : p.admissionStatus === 'DISCHARGED' ? '🟡 Discharged' : '⚪ Outpatient'}
                </span>
              </div>
              <div style={recordName}>{p.firstName} {p.lastName}</div>
              <div style={recordDetail}>📞 {p.phone || '—'} &nbsp;|&nbsp; 🎂 {p.dob ? new Date(p.dob).toLocaleDateString('en-IN') : '—'}</div>
              <div style={recordDate}>Registered: {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—'}</div>
              <button
                style={openBtn}
                onClick={() => onOpenExisting(p)}
              >
                Open This Record →
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={actions}>
          <button style={cancelBtn} onClick={onCancel}>Cancel</button>
          <button style={differentBtn} onClick={onConfirmDifferent}>
            ✅ Different Person — Create New Record
          </button>
        </div>
      </div>
    </div>
  );
}

function getAdmissionBadgeStyle(status) {
  const base = {
    padding: '2px 10px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
  };
  if (status === 'ACTIVE_ADMISSION') return { ...base, background: 'rgba(239,68,68,0.15)', color: '#f87171' };
  if (status === 'DISCHARGED') return { ...base, background: 'rgba(234,179,8,0.15)', color: '#fbbf24' };
  return { ...base, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' };
}

const overlay = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: 'rgba(0,0,0,0.75)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 20,
};
const modal = {
  background: '#1a1a2e',
  border: '1px solid rgba(239,68,68,0.3)',
  borderRadius: 20,
  padding: 28,
  maxWidth: 560,
  width: '100%',
  boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
};
const headerBar = {
  display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16,
};
const headerTitle = {
  fontSize: 18, fontWeight: 700, color: '#fbbf24',
};
const headerSub = {
  fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2,
};
const infoText = {
  fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 16, lineHeight: 1.6,
};
const listContainer = {
  display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20,
  maxHeight: 300, overflowY: 'auto',
};
const recordCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12, padding: '12px 16px',
};
const recordHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
};
const uhidBadge = {
  background: 'rgba(79,70,229,0.2)', color: '#a78bfa',
  padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
};
const recordName = { fontSize: 15, fontWeight: 700, color: '#f0f0f0', marginBottom: 4 };
const recordDetail = { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 2 };
const recordDate = { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 10 };
const openBtn = {
  background: 'rgba(79,70,229,0.15)', color: '#818cf8',
  border: '1px solid rgba(79,70,229,0.3)', borderRadius: 8,
  padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
};
const actions = { display: 'flex', gap: 10, justifyContent: 'flex-end' };
const cancelBtn = {
  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
  padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const differentBtn = {
  background: 'linear-gradient(135deg, #16a34a, #15803d)',
  color: '#fff', border: 'none', borderRadius: 10,
  padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
