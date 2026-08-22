import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import {
  databaseKeyForHospital,
  getTenantConnection,
  validateTenantDatabaseKey,
} from '../src/config/tenantDatabase.js';

test('tenant database names are immutable-id based and do not depend on editable domains', () => {
  const hospitalId = new mongoose.Types.ObjectId('64b000000000000000000001');
  assert.equal(databaseKeyForHospital(hospitalId), 'tenant_64b000000000000000000001');
  assert.equal(databaseKeyForHospital({ _id: hospitalId, domain: 'renamed-hospital' }), 'tenant_64b000000000000000000001');
});

test('tenant database selection rejects unsafe database names', () => {
  assert.throws(() => validateTenantDatabaseKey('../platform'), /Invalid tenant database key/);
  assert.throws(() => validateTenantDatabaseKey('tenant_hospital-name'), /Invalid tenant database key/);
  assert.throws(() => databaseKeyForHospital('not-an-object-id'), /valid hospital id/);
});

test('shared and unprovisioned hospitals cannot be opened as dedicated databases', () => {
  assert.throws(
    () => getTenantConnection({ _id: new mongoose.Types.ObjectId(), storageMode: 'SHARED' }),
    /provisioned dedicated hospital/,
  );
  assert.throws(
    () => getTenantConnection({ _id: new mongoose.Types.ObjectId(), storageMode: 'DEDICATED_PENDING' }),
    /provisioned dedicated hospital/,
  );
});
