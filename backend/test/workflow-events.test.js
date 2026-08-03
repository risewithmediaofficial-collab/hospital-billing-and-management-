import test from 'node:test';
import assert from 'node:assert/strict';

import { WorkflowEventService, WORKFLOW_EVENTS } from '../src/events/workflowEventService.js';

test('completed consultations notify only billing role variants', () => {
  const targets = WorkflowEventService.getTargetRoles(WORKFLOW_EVENTS.CONSULTATION_COMPLETE);

  for (const role of ['CASHIER', 'BILLING_STAFF']) {
    assert.equal(targets.includes(role), true, `${role} should receive completed consultations`);
  }
  for (const role of ['RECEPTIONIST', 'PHARMACIST', 'PHARMACY_STAFF']) {
    assert.equal(targets.includes(role), false, `${role} must not receive the billing-ready event`);
  }
});

test('payment completion notifies reception only after cashier collection', () => {
  const targets = WorkflowEventService.getTargetRoles(WORKFLOW_EVENTS.PAYMENT_COLLECTED);
  assert.equal(targets.includes('RECEPTIONIST'), true);
  assert.equal(targets.includes('CASHIER'), false);
  assert.equal(targets.includes('BILLING_STAFF'), false);
});

test('diagnostic requests notify both legacy and staff department roles', () => {
  assert.deepEqual(
    WorkflowEventService.getTargetRoles(WORKFLOW_EVENTS.LAB_ORDER_CREATED),
    ['LAB_TECH', 'LABORATORY_STAFF'],
  );
  assert.deepEqual(
    WorkflowEventService.getTargetRoles(WORKFLOW_EVENTS.RADIOLOGY_ORDER_CREATED),
    ['RADIOLOGIST', 'RADIOLOGY_STAFF'],
  );
});
