import test from 'node:test';
import assert from 'node:assert/strict';

import { FIFO_QUEUE_SORT } from '../src/domains/appointments/appointments.service.js';

test('OPD queue uses ascending token FIFO ordering with stable tie breakers', () => {
  assert.deepEqual(FIFO_QUEUE_SORT, {
    appointmentDate: 1,
    tokenNumber: 1,
    createdAt: 1,
    _id: 1,
  });
});
