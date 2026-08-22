import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { WorkflowEventService, WORKFLOW_ACTIONS, WORKFLOW_EVENTS } from '../src/events/workflowEventService.js';

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

test('IPD admission allocation alerts only staff who can allocate care', () => {
  assert.deepEqual(
    WorkflowEventService.getTargetRoles(WORKFLOW_EVENTS.IPD_ADMISSION_RECOMMENDED),
    ['NURSE_INCHARGE', 'IPD_STAFF'],
  );
});

test('emergency alerts exclude portals, billing, pharmacy, and governance-only admins', () => {
  const expected = ['DOCTOR', 'NURSE', 'NURSE_INCHARGE', 'IPD_STAFF', 'EMERGENCY_STAFF'];
  assert.deepEqual(WorkflowEventService.getTargetRoles(WORKFLOW_EVENTS.EMERGENCY_RAISED), expected);
  assert.deepEqual(WorkflowEventService.getTargetRoles(WORKFLOW_EVENTS.EMERGENCY_RESOLVED), expected);
});

test('every persisted actionable workflow event has entity and navigation metadata', () => {
  const transientEvents = new Set([
    WORKFLOW_EVENTS.DOCTOR_ACCEPTED_PATIENT,
    WORKFLOW_EVENTS.LAB_ACCEPTED,
    WORKFLOW_EVENTS.RADIOLOGY_ACCEPTED,
    WORKFLOW_EVENTS.PHARMACY_ACCEPTED,
    WORKFLOW_EVENTS.STAFF_WENT_OFFLINE,
    WORKFLOW_EVENTS.STAFF_CAME_ONLINE,
  ]);

  for (const event of Object.values(WORKFLOW_EVENTS)) {
    if (transientEvents.has(event)) continue;
    const targets = WorkflowEventService.getTargetRoles(event);
    if (targets.length === 0) continue;
    const action = WORKFLOW_ACTIONS[event];
    assert.ok(action, `${event} must define an actionable record target`);
    assert.ok(action.entityType, `${event} must define entityType`);
    assert.ok(action.idKey, `${event} must define its entity ID key`);
    assert.ok(action.targetModule, `${event} must define targetModule`);
    assert.ok(action.actionType, `${event} must define actionType`);
    assert.equal(typeof action.route, 'function', `${event} must build a target route`);
  }
});

test('critical domain workflows await notification persistence instead of fire-and-forget delivery', async () => {
  const domainFiles = [
    '../src/domains/appointments/appointments.service.js',
    '../src/domains/diagnostics/diagnostics.service.js',
    '../src/domains/emergency/emergency.service.js',
    '../src/domains/pharmacy/pharmacy.service.js',
    '../src/domains/billing/billing.service.js',
    '../src/domains/requests/requests.service.js',
    '../src/domains/emr/emr.service.js',
  ];
  for (const file of domainFiles) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /WorkflowEventService\.emitSync/);
  }

  const eventService = await readFile(new URL('../src/events/workflowEventService.js', import.meta.url), 'utf8');
  assert.match(eventService, /Failed to persist notification to DB:[^\n]+\n\s*throw dbErr/);
  assert.match(eventService, /throw new Error\(`Refusing unscoped workflow event/);
});
