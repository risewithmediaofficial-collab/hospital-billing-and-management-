import test from 'node:test';
import assert from 'node:assert/strict';

import { hasPermission, permissionsFor } from '../src/config/permissions.js';

test('additional roles contribute all of their module permissions', () => {
  const user = { role: 'RECEPTIONIST', additionalRoles: ['DOCTOR'] };

  const permissions = permissionsFor(user);

  assert.equal(permissions.doctorConsultation.includes('finalize'), true);
  assert.equal(permissions.diagnostics.includes('requestTest'), true);
  assert.equal(hasPermission(user, 'doctor', 'create'), true);
  assert.equal(hasPermission(user, 'diagnostics', 'create'), true);
});

test('granular diagnostic request permissions authorize the POST request gate', () => {
  for (const action of ['requestTest', 'requestLab', 'requestRadiology']) {
    const user = {
      role: 'CUSTOM_ROLE',
      permissions: { doctorConsultation: [action] },
    };

    assert.equal(
      hasPermission(user, 'diagnostics', 'create'),
      true,
      `${action} should authorize creating a diagnostic request`,
    );
  }
});

test('finalize permission authorizes consultation creation and completion update', () => {
  const user = {
    role: 'CUSTOM_ROLE',
    permissions: { doctorConsultation: ['finalize'] },
  };

  assert.equal(hasPermission(user, 'doctor', 'create'), true);
  assert.equal(hasPermission(user, 'appointments', 'edit'), true);
});

test('unrelated permissions do not authorize clinical writes', () => {
  const user = {
    role: 'CUSTOM_ROLE',
    permissions: { dashboard: ['view'] },
  };

  assert.equal(hasPermission(user, 'diagnostics', 'create'), false);
  assert.equal(hasPermission(user, 'doctor', 'create'), false);
});
