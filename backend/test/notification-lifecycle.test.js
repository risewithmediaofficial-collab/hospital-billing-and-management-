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
});
