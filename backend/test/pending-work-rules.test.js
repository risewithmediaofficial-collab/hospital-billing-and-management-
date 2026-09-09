import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIVE_DIAGNOSTIC_STATUSES,
  ACTIVE_REQUEST_STATUSES,
  LAB_CATEGORIES,
  RADIOLOGY_CATEGORIES,
} from '../src/domains/workflow/workflow.service.js';

test('department pending work excludes completed and uploaded diagnostic stages', () => {
  for (const status of ['REQUESTED', 'DEPARTMENT_RECEIVED', 'ACCEPTED', 'IN_PROGRESS']) {
    assert.equal(ACTIVE_DIAGNOSTIC_STATUSES.includes(status), true);
  }
  for (const status of ['REPORT_UPLOADED', 'COMPLETED']) {
    assert.equal(ACTIVE_DIAGNOSTIC_STATUSES.includes(status), false);
  }
});

test('processed patient requests are excluded from pending work', () => {
  for (const status of ['COMPLETED', 'REJECTED', 'CANCELLED']) {
    assert.equal(ACTIVE_REQUEST_STATUSES.includes(status), false);
  }
});

test('lab and radiology queues remain independent', () => {
  assert.equal(RADIOLOGY_CATEGORIES.includes('XRAY'), true);
  assert.equal(RADIOLOGY_CATEGORIES.includes('PATHOLOGY'), false);
  assert.equal(LAB_CATEGORIES.includes('PATHOLOGY'), true);
  assert.equal(LAB_CATEGORIES.includes('XRAY'), false);
});

// ── NEW: finished appointments excluded from pending task queries ───────────
test('ACTIVE_DIAGNOSTIC_STATUSES does not include terminal states', () => {
  const terminalStates = ['COMPLETED', 'REPORT_UPLOADED', 'CANCELLED', 'REJECTED'];
  for (const state of terminalStates) {
    assert.equal(
      ACTIVE_DIAGNOSTIC_STATUSES.includes(state),
      false,
      `Terminal state "${state}" must not appear in ACTIVE_DIAGNOSTIC_STATUSES`
    );
  }
});

// ── NEW: ACTIVE_DIAGNOSTIC_STATUSES is non-empty ───────────────────────────
test('ACTIVE_DIAGNOSTIC_STATUSES is a non-empty array', () => {
  assert.ok(Array.isArray(ACTIVE_DIAGNOSTIC_STATUSES), 'Must be an array');
  assert.ok(ACTIVE_DIAGNOSTIC_STATUSES.length > 0, 'Must have at least one active status');
});

// ── NEW: ACTIVE_REQUEST_STATUSES is non-empty ──────────────────────────────
test('ACTIVE_REQUEST_STATUSES is a non-empty array', () => {
  assert.ok(Array.isArray(ACTIVE_REQUEST_STATUSES), 'Must be an array');
  assert.ok(ACTIVE_REQUEST_STATUSES.length > 0, 'Must have at least one active request status');
});

// ── NEW: submitted status is active (NurseTask/Request still needs action) ─
test('SUBMITTED status is included in ACTIVE_REQUEST_STATUSES (still needs processing)', () => {
  assert.equal(
    ACTIVE_REQUEST_STATUSES.includes('SUBMITTED'),
    true,
    'SUBMITTED requests must appear in active work queue'
  );
});

// ── NEW: IN_PROGRESS status included in active diagnostics (mid-processing) ─
test('IN_PROGRESS status is included in ACTIVE_DIAGNOSTIC_STATUSES', () => {
  assert.equal(
    ACTIVE_DIAGNOSTIC_STATUSES.includes('IN_PROGRESS'),
    true,
    'IN_PROGRESS diagnostics must remain in active queue until completed'
  );
});

// ── NEW: LAB_CATEGORIES is a non-empty array ───────────────────────────────
test('LAB_CATEGORIES is a non-empty array with standard lab types', () => {
  assert.ok(Array.isArray(LAB_CATEGORIES));
  assert.ok(LAB_CATEGORIES.length > 0);
  // Standard lab category check
  assert.equal(LAB_CATEGORIES.includes('PATHOLOGY'), true);
});

// ── NEW: RADIOLOGY_CATEGORIES is a non-empty array ────────────────────────
test('RADIOLOGY_CATEGORIES is a non-empty array with standard radiology types', () => {
  assert.ok(Array.isArray(RADIOLOGY_CATEGORIES));
  assert.ok(RADIOLOGY_CATEGORIES.length > 0);
  assert.equal(RADIOLOGY_CATEGORIES.includes('XRAY'), true);
});

// ── NEW: categories are mutually exclusive (no overlap) ───────────────────
test('LAB_CATEGORIES and RADIOLOGY_CATEGORIES have no overlapping values', () => {
  const overlap = LAB_CATEGORIES.filter((cat) => RADIOLOGY_CATEGORIES.includes(cat));
  assert.equal(
    overlap.length,
    0,
    `Lab and radiology categories must not overlap. Found overlapping: ${overlap.join(', ')}`
  );
});
