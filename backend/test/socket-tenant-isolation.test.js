import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { socketManager } from '../src/events/socketManager.js';

const fakeIo = () => {
  const calls = [];
  return {
    calls,
    to(room) {
      return {
        emit(event, data) {
          calls.push({ room, event, data });
        },
      };
    },
    emit() {
      throw new Error('Global Socket.IO broadcast is forbidden for tenant clinical events');
    },
  };
};

test('emergency socket delivery is branch scoped and never global', () => {
  const previous = socketManager.io;
  const io = fakeIo();
  socketManager.io = io;
  try {
    socketManager.emitEmergency('emergency:raised', { emergencyId: 'e1' }, {
      hospitalId: 'hospital-a',
      branchId: 'branch-a',
    });
    assert.equal(io.calls.length, 15);
    assert.equal(io.calls.every((call) => call.room.startsWith('branch_branch-a_role_')), true);
    assert.equal(io.calls.some((call) => call.room.includes('PATIENT')), false);
    assert.equal(io.calls.some((call) => call.room.includes('GUARDIAN')), false);
    assert.equal(io.calls.some((call) => call.room.includes('HOSPITAL_ADMIN')), false);
  } finally {
    socketManager.io = previous;
  }
});

test('emergency socket delivery refuses an event without tenant context', () => {
  const previous = socketManager.io;
  const io = fakeIo();
  socketManager.io = io;
  try {
    socketManager.emitEmergency('emergency:raised', { emergencyId: 'e1' });
    assert.deepEqual(io.calls, []);
  } finally {
    socketManager.io = previous;
  }
});

test('hospital-role delivery uses a tenant-specific room', () => {
  const previous = socketManager.io;
  const io = fakeIo();
  socketManager.io = io;
  try {
    socketManager.emitToHospitalRole('hospital-a', 'DOCTOR', 'workflow:notification', { id: 'n1' });
    assert.deepEqual(io.calls.map((call) => call.room), ['hospital_hospital-a_role_DOCTOR']);
  } finally {
    socketManager.io = previous;
  }
});

test('SaaS and branch updates never use direct global socket broadcasts', async () => {
  const source = await readFile(new URL('../src/domains/saas/saas.service.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /socketManager\.io\.emit\(/);
  assert.doesNotMatch(source, /\.to\('super-admins'\)/);
  assert.match(source, /emitToRole\('SUPER_ADMIN', 'saas:pending_changed'/);
  assert.match(source, /emitToHospital\(String\(branch\.hospitalId\), 'branch:updated'/);
});

test('governance and portal identities are not subscribed to operational socket rooms', async () => {
  const source = await readFile(new URL('../src/events/socketManager.js', import.meta.url), 'utf8');
  assert.match(source, /isPortalIdentity = \['PATIENT', 'GUARDIAN'\]\.includes/);
  assert.match(source, /rawHospId && !isPortalIdentity/);
  assert.doesNotMatch(source, /Hospital Administrators and Super Admins oversee all workstation desks/);
  assert.doesNotMatch(source, /roles\.has\('HOSPITAL_ADMIN'\)[\s\S]{0,500}roles\.add/);
});
