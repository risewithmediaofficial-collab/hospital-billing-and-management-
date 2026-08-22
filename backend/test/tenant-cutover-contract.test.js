import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));

test('tenant cutover locks writes, drains leases, verifies final copy, then activates', async () => {
  const source = await readFile(
    path.resolve(directory, '../src/domains/saas/tenantMigration.service.js'),
    'utf8',
  );
  const activation = source.slice(source.indexOf('static async activateDedicatedDatabase'));
  const lockAt = activation.indexOf('databaseWriteLocked: true');
  const drainAt = activation.indexOf('waitForTenantWritesToDrain');
  const finalCopyAt = activation.indexOf('prepareDedicatedDatabase');
  const activateAt = activation.indexOf("hospital.storageMode = 'DEDICATED'");

  assert.equal(lockAt >= 0, true);
  assert.equal(lockAt < drainAt && drainAt < finalCopyAt && finalCopyAt < activateAt, true);
  assert.match(activation, /databaseMigrationStatus !== 'COPY_PREPARED'/);
  assert.match(activation, /databaseWriteLocked: false/);
  assert.match(activation, /TENANT_ACTIVATION_FAILED/);
  assert.match(activation, /changedSince: previousPreparedAt/);
});

test('repeat copies reconcile tenant deletions and use bounded delta batches', async () => {
  const source = await readFile(
    path.resolve(directory, '../src/domains/saas/tenantMigration.service.js'),
    'utf8',
  );

  assert.match(source, /updatedAt: \{ \$gte: changedSince \}/);
  assert.match(source, /targetIds\.length >= batchSize/);
  assert.match(source, /targetCollection\.deleteMany\(\{ hospitalId, _id: \{ \$in: staleIds \} \}\)/);
  assert.match(source, /staleDeleted/);
});

test('write lease closes the lock-acquisition race and has crash expiry', async () => {
  const source = await readFile(
    path.resolve(directory, '../src/config/tenantOperationLease.js'),
    'utf8',
  );
  const insertAt = source.indexOf('insertOne');
  const lockReadAt = source.indexOf("collection('hospitals').findOne");

  assert.equal(insertAt >= 0 && insertAt < lockReadAt, true);
  assert.match(source, /expireAfterSeconds: 0/);
  assert.match(source, /deleteOne\(\{ requestId \}\)/);
  assert.match(source, /TENANT_WRITE_MAINTENANCE/);
  assert.match(source, /TENANT_WRITES_DRAIN_TIMEOUT/);
});

test('authenticated tenant writes acquire leases before database model activation', async () => {
  const source = await readFile(
    path.resolve(directory, '../src/middleware/verifyJwt.js'),
    'utf8',
  );
  const leaseAt = source.indexOf('acquireTenantWriteLease');
  const activateAt = source.lastIndexOf('activateVerifiedTenantConnection(req.user)');

  assert.equal(leaseAt >= 0 && leaseAt < activateAt, true);
  assert.match(source, /res\.once\('finish', releaseLease\)/);
  assert.match(source, /res\.once\('close', releaseLease\)/);
});
