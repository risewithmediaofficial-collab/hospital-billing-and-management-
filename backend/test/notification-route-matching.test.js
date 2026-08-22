import test from 'node:test';
import assert from 'node:assert/strict';

import { notificationBelongsToRoute } from '../src/domains/notifications/notification.service.js';

test('notification route matching preserves workflow tab boundaries', () => {
  assert.equal(
    notificationBelongsToRoute(
      '/doctor/dashboard?tab=DEPT_RESPONSES&patientId=p1',
      '/doctor/dashboard?tab=DEPT_RESPONSES',
    ),
    true,
  );
  assert.equal(
    notificationBelongsToRoute('/doctor/dashboard?tab=DEPT_RESPONSES', '/doctor/dashboard'),
    false,
  );
  assert.equal(
    notificationBelongsToRoute('/doctor/dashboard', '/doctor/dashboard?tab=COMPLETED'),
    false,
  );
});

test('notification route matching understands tenant-prefixed URLs', () => {
  assert.equal(
    notificationBelongsToRoute(
      '/city-hospital/laboratory/dashboard?orderId=123',
      '/laboratory/dashboard',
    ),
    true,
  );
});

test('notification route matching rejects unrelated modules', () => {
  assert.equal(
    notificationBelongsToRoute('/billing/dashboard', '/doctor/dashboard'),
    false,
  );
});
