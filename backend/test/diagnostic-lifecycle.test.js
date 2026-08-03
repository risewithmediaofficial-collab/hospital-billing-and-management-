import test from 'node:test';
import assert from 'node:assert/strict';
import { DiagnosticOrder } from '../src/models/DiagnosticOrder.js';

test('diagnostic orders preserve the complete department response lifecycle', () => {
  const statuses = DiagnosticOrder.schema.path('status').enumValues;

  for (const status of ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'REPORT_UPLOADED', 'COMPLETED', 'REVIEWED']) {
    assert.ok(statuses.includes(status), `missing lifecycle status: ${status}`);
  }

  for (const timestamp of ['acceptedAt', 'startedAt', 'responseSubmittedAt', 'reviewedAt', 'reviewedBy']) {
    assert.ok(DiagnosticOrder.schema.path(timestamp), `missing lifecycle audit field: ${timestamp}`);
  }
});
