import React, { useState, useCallback } from 'react';

/**
 * PharmacyAvailabilityBadge
 * Inline stock status indicator for a single medicine during prescription.
 * Calls /api/v1/pharmacy/prescriptions/check-availability on demand.
 */
export function PharmacyAvailabilityBadge({ medicineName, medicineId, token, hospitalId }) {
  const [status, setStatus] = useState(null); // null | checking | AVAILABLE | LOW_STOCK | OUT_OF_STOCK | NOT_MAINTAINED | NEAR_EXPIRY
  const [details, setDetails] = useState(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    if (!medicineName && !medicineId) return;
    setChecking(true);
    try {
      const res = await fetch('/api/v1/pharmacy/prescriptions/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          medicines: [{ medicineName, medicineId }],
        }),
      });
      const data = await res.json();
      if (data.success && data.data.results?.[0]) {
        const r = data.data.results[0];
        setStatus(r.stockStatus);
        setDetails(r);
      }
    } catch (e) {
      setStatus('ERROR');
    } finally {
      setChecking(false);
    }
  }, [medicineName, medicineId, token]);

  if (checking) return <span style={badges.checking}>Checking stock...</span>;
  if (!status) {
    return (
      <button onClick={check} style={badges.checkBtn}>
        Check Stock
      </button>
    );
  }

  const badge = BADGE_MAP[status] || BADGE_MAP.NOT_MAINTAINED;
  return (
    <span style={{ ...badges.base, ...badge.style }} title={details?.message || ''}>
      {badge.label}
      {details?.totalQuantity > 0 && ` (${details.totalQuantity})`}
    </span>
  );
}

const BADGE_MAP = {
  AVAILABLE: {
    label: 'In Stock',
    style: { background: 'rgba(22,163,74,0.15)', color: '#4ade80', border: '1px solid rgba(22,163,74,0.3)' }
  },
  LOW_STOCK: {
    label: 'Low Stock',
    style: { background: 'rgba(234,179,8,0.15)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.3)' }
  },
  OUT_OF_STOCK: {
    label: 'Out of Stock',
    style: { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }
  },
  NOT_MAINTAINED: {
    label: 'Not in Pharmacy',
    style: { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }
  },
  NEAR_EXPIRY: {
    label: 'Near Expiry',
    style: { background: 'rgba(234,179,8,0.12)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.25)' }
  },
  ERROR: {
    label: 'Check failed',
    style: { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
  },
};

const badges = {
  base: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
    cursor: 'default',
  },
  checking: {
    fontSize: 11, color: 'rgba(255,255,255,0.5)', padding: '2px 8px',
  },
  checkBtn: {
    background: 'rgba(79,70,229,0.12)', color: '#818cf8',
    border: '1px solid rgba(79,70,229,0.2)', borderRadius: 20,
    padding: '2px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
  },
};

/**
 * PharmacyAvailabilityInlineChecker
 * Used in prescription form to check all medicines at once.
 */
export function PharmacyAvailabilityInlineChecker({ medicines = [], token }) {
  const [results, setResults] = useState(null);
  const [checking, setChecking] = useState(false);

  const checkAll = async () => {
    if (medicines.length === 0) return;
    setChecking(true);
    try {
      const res = await fetch('/api/v1/pharmacy/prescriptions/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ medicines }),
      });
      const data = await res.json();
      if (data.success) setResults(data.data);
    } catch (e) {
      // silent
    } finally {
      setChecking(false);
    }
  };

  if (!results) {
    return (
      <button onClick={checkAll} disabled={checking || medicines.length === 0} style={checkAllBtn}>
        {checking ? 'Checking stock...' : 'Check All Medicine Availability'}
      </button>
    );
  }

  const hasUnavailable = results.hasUnavailableItems;
  return (
    <div style={checkerPanel}>
      <div style={checkerHeader}>
        <span style={{ fontWeight: 700, color: hasUnavailable ? '#fbbf24' : '#4ade80', fontSize: 14 }}>
          {results.summary}
        </span>
        <button onClick={checkAll} style={reCheckBtn}>Re-check</button>
      </div>
      {results.results.map((r, idx) => {
        const badge = BADGE_MAP[r.stockStatus] || BADGE_MAP.NOT_MAINTAINED;
        return (
          <div key={idx} style={resultRow}>
            <span style={medNameStyle}>{r.medicineName || r.medicineName}</span>
            <span style={{ ...badges.base, ...badge.style }}>
              {badge.label}{r.totalQuantity > 0 ? ` (${r.totalQuantity})` : ''}
            </span>
            {(r.stockStatus === 'OUT_OF_STOCK' || r.stockStatus === 'NOT_MAINTAINED') && (
              <span style={warningText}>{r.message}</span>
            )}
          </div>
        );
      })}
      {hasUnavailable && (
        <div style={unavailableAlert}>
          <strong>Some medicines are unavailable.</strong> The pharmacist will be notified. You may add a note or select an alternative.
        </div>
      )}
    </div>
  );
}

const checkAllBtn = {
  background: 'rgba(79,70,229,0.12)', color: '#818cf8',
  border: '1px solid rgba(79,70,229,0.25)', borderRadius: 10,
  padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%',
};
const checkerPanel = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12, padding: '14px 16px', marginTop: 10,
};
const checkerHeader = {
  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
  paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)',
};
const reCheckBtn = {
  marginLeft: 'auto', background: 'none', border: 'none',
  color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12,
};
const resultRow = {
  display: 'flex', alignItems: 'center', flexWrap: 'wrap',
  gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
};
const medNameStyle = {
  fontSize: 13, fontWeight: 600, color: '#e0e0e0', flexShrink: 0,
};
const warningText = {
  fontSize: 11, color: '#f87171', flexBasis: '100%',
};
const unavailableAlert = {
  marginTop: 12, background: 'rgba(239,68,68,0.1)',
  border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8,
  padding: '10px 14px', fontSize: 12, color: '#fca5a5', lineHeight: 1.6,
};
