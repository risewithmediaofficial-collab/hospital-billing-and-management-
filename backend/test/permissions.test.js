import test from 'node:test';
import assert from 'node:assert/strict';

import { hasOperationalRoleForModule, hasPermission, permissionsFor } from '../src/config/permissions.js';

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

test('hospital admin governance does not imply operational staff assignment', () => {
  const admin = { role: 'HOSPITAL_ADMIN', additionalRoles: [] };

  assert.equal(hasOperationalRoleForModule(admin, 'doctor'), false);
  assert.equal(hasOperationalRoleForModule(admin, 'billing'), false);
  assert.equal(hasOperationalRoleForModule(admin, 'pharmacy'), false);
});

test('hospital admin can work only in modules covered by explicit additional roles', () => {
  const clinicOwnerDoctor = { role: 'HOSPITAL_ADMIN', additionalRoles: ['DOCTOR'] };

  assert.equal(hasOperationalRoleForModule(clinicOwnerDoctor, 'doctor'), true);
  assert.equal(hasOperationalRoleForModule(clinicOwnerDoctor, 'diagnostics'), true);
  assert.equal(hasOperationalRoleForModule(clinicOwnerDoctor, 'billing'), false);
});

test('super admin remains platform governance and never becomes an operational role', () => {
  const platformOwner = { role: 'SUPER_ADMIN', additionalRoles: [] };
  assert.equal(hasOperationalRoleForModule(platformOwner, 'doctor'), false);
  assert.equal(hasOperationalRoleForModule(platformOwner, 'billing'), false);
  assert.equal(hasOperationalRoleForModule(platformOwner, 'beds'), false);
});
