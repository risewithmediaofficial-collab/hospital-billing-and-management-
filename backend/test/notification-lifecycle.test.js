import test from 'node:test';
import assert from 'node:assert/strict';
import { NotificationService } from '../src/domains/notifications/notification.service.js';
import { Notification } from '../src/models/Notification.js';
import { WorkflowEventService, WORKFLOW_EVENTS, EVENT_COMPLETIONS } from '../src/events/workflowEventService.js';

test('Notification Lifecycle & Enterprise Routing Contract', async (t) => {
  await t.test('EVENT_COMPLETIONS maps workflow milestones to their upstream entities', () => {
    assert.equal(EVENT_COMPLETIONS[WORKFLOW_EVENTS.CONSULTATION_COMPLETE]?.entityType, 'Appointment');
    assert.equal(EVENT_COMPLETIONS[WORKFLOW_EVENTS.LAB_SUBMITTED]?.entityType, 'DiagnosticOrder');
    assert.equal(EVENT_COMPLETIONS[WORKFLOW_EVENTS.RADIOLOGY_SUBMITTED]?.entityType, 'DiagnosticOrder');
    assert.equal(EVENT_COMPLETIONS[WORKFLOW_EVENTS.DOCTOR_REVIEWED_LAB]?.entityType, 'DiagnosticOrder');
    assert.equal(EVENT_COMPLETIONS[WORKFLOW_EVENTS.PHARMACY_DISPENSED]?.entityType, 'Prescription');
    assert.equal(EVENT_COMPLETIONS[WORKFLOW_EVENTS.NURSE_REQUEST_COMPLETED]?.entityType, 'NurseTask');
    assert.equal(EVENT_COMPLETIONS[WORKFLOW_EVENTS.PAYMENT_COLLECTED]?.entityType, 'Invoice');
  });

  await t.test('Notification schema supports isCompleted, priority, and completedAt', () => {
    const paths = Notification.schema.paths;
    assert.ok(paths.isCompleted, 'isCompleted path exists in Notification schema');
    assert.ok(paths.completedAt, 'completedAt path exists in Notification schema');
    assert.ok(paths.priority, 'priority path exists in Notification schema');
    assert.equal(paths.isCompleted.defaultValue, false);
    assert.equal(paths.priority.defaultValue, 'NORMAL');
  });

  await t.test('WorkflowEventService defines strict target roles for every clinical milestone', () => {
    assert.deepEqual(WorkflowEventService.getTargetRoles(WORKFLOW_EVENTS.PATIENT_QUEUED), ['DOCTOR']);
    assert.deepEqual(WorkflowEventService.getTargetRoles(WORKFLOW_EVENTS.LAB_ORDER_CREATED), ['LAB_TECH', 'LABORATORY_STAFF']);
    assert.deepEqual(WorkflowEventService.getTargetRoles(WORKFLOW_EVENTS.RADIOLOGY_ORDER_CREATED), ['RADIOLOGIST', 'RADIOLOGY_STAFF']);
    assert.deepEqual(WorkflowEventService.getTargetRoles(WORKFLOW_EVENTS.PRESCRIPTION_ISSUED), ['PHARMACIST', 'PHARMACY_STAFF']);
    assert.deepEqual(WorkflowEventService.getTargetRoles(WORKFLOW_EVENTS.CONSULTATION_COMPLETE), ['CASHIER', 'BILLING_STAFF']);
    assert.deepEqual(WorkflowEventService.getTargetRoles(WORKFLOW_EVENTS.LAB_SUBMITTED), ['DOCTOR']);
    assert.deepEqual(WorkflowEventService.getTargetRoles(WORKFLOW_EVENTS.RADIOLOGY_SUBMITTED), ['DOCTOR']);
  });

  // ── NEW: dept-response notification lifecycle ──────────────────────────────
  await t.test('DEPT_RESPONSE notification is created with correct role targeting', () => {
    // Validate the WORKFLOW_EVENTS map includes dept response routing to DOCTOR
    const deptResponseEvents = [
      WORKFLOW_EVENTS.LAB_SUBMITTED,
      WORKFLOW_EVENTS.RADIOLOGY_SUBMITTED,
    ];
    for (const evt of deptResponseEvents) {
      const roles = WorkflowEventService.getTargetRoles(evt);
      assert.ok(roles.includes('DOCTOR'), `${evt} must target DOCTOR for dept-response delivery`);
    }
  });

  // ── NEW: PAYMENT_PENDING routes to billing staff ─────────────────────────
  await t.test('PAYMENT_PENDING workflow event routes notification to cashier/billing', () => {
    const roles = WorkflowEventService.getTargetRoles(WORKFLOW_EVENTS.PAYMENT_PENDING);
    assert.ok(
      roles.includes('CASHIER') || roles.includes('BILLING_STAFF'),
      'PAYMENT_PENDING must target CASHIER or BILLING_STAFF'
    );
  });

  await t.test('PAYMENT_COLLECTED workflow event routes notification to receptionist', () => {
    const roles = WorkflowEventService.getTargetRoles(WORKFLOW_EVENTS.PAYMENT_COLLECTED);
    assert.ok(
      roles.includes('RECEPTIONIST'),
      'PAYMENT_COLLECTED must target RECEPTIONIST'
    );
  });

  // ── NEW: isCompleted flag resolves notifications on payment ───────────────
  await t.test('Notification schema isCompleted field defaults to false and can be set true', () => {
    const paths = Notification.schema.paths;
    assert.equal(paths.isCompleted.defaultValue, false, 'isCompleted defaults to false');
    // Schema must allow setting to true (boolean type)
    assert.equal(paths.isCompleted.instance, 'Boolean', 'isCompleted is Boolean type');
  });

  // ── NEW: completedAt is a Date field set on resolution ────────────────────
  await t.test('Notification schema completedAt is a Date field (set when billing clears)', () => {
    const paths = Notification.schema.paths;
    assert.equal(paths.completedAt.instance, 'Date', 'completedAt must be a Date field');
  });

  // ── NEW: Notification schema supports linkedPath for nav badge sync ────────
  await t.test('Notification schema has linkedPath field for sidebar badge sync', () => {
    const paths = Notification.schema.paths;
    assert.ok(paths.linkedPath || paths.targetRoute, 'Notification schema must have linkedPath or targetRoute for route-based badge resolution');
  });

  // ── NEW: NURSE_REQUEST_COMPLETED resolves NurseTask entity ────────────────
  await t.test('NURSE_REQUEST_COMPLETED event completion maps to NurseTask entity', () => {
    const completion = EVENT_COMPLETIONS[WORKFLOW_EVENTS.NURSE_REQUEST_COMPLETED];
    assert.ok(completion, 'NURSE_REQUEST_COMPLETED must have an EVENT_COMPLETIONS entry');
    assert.equal(completion.entityType, 'NurseTask');
  });
});
