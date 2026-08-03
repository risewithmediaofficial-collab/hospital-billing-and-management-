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
