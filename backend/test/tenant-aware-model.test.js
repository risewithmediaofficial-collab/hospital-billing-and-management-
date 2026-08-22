import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import { tenantAwareModel, tenantRuntimeReadiness } from '../src/config/tenantAwareModel.js';
import {
  getTenantModelContext,
  runWithTenantModelContext,
  setTenantModelConnection,
} from '../src/config/tenantModelContext.js';

test('tenant model context is isolated across concurrent asynchronous work', async () => {
  const first = mongoose.connection.useDb('tenant_64b000000000000000000011', { useCache: true });
  const second = mongoose.connection.useDb('tenant_64b000000000000000000012', { useCache: true });

  const [firstResult, secondResult] = await Promise.all([
    runWithTenantModelContext(async () => {
      setTenantModelConnection({ connection: first, hospitalId: 'hospital-1' });
      await Promise.resolve();
      return getTenantModelContext();
    }),
    runWithTenantModelContext(async () => {
      setTenantModelConnection({ connection: second, hospitalId: 'hospital-2' });
      await Promise.resolve();
      return getTenantModelContext();
    }),
  ]);

  assert.equal(firstResult.connection.name, first.name);
  assert.equal(firstResult.hospitalId, 'hospital-1');
  assert.equal(secondResult.connection.name, second.name);
  assert.equal(secondResult.hospitalId, 'hospital-2');
});

test('tenant-aware model binds static calls to the request connection', async () => {
  const modelName = 'TenantAwareProbe';
  const schema = new mongoose.Schema({ value: String });
  schema.statics.connectionName = function connectionName() { return this.db.name; };
  const platformModel = mongoose.models[modelName] || mongoose.model(modelName, schema);
  const Model = tenantAwareModel(platformModel);
  const tenantConnection = mongoose.connection.useDb('tenant_64b000000000000000000013', { useCache: true });

  assert.equal(Model.connectionName(), mongoose.connection.name);
  await runWithTenantModelContext(async () => {
    setTenantModelConnection({ connection: tenantConnection, hospitalId: 'hospital-3' });
    assert.equal(Model.connectionName(), tenantConnection.name);
    assert.equal(new Model({ value: 'tenant' }).constructor.db.name, tenantConnection.name);
  });
});

test('dedicated runtime cannot activate with only partial model coverage', () => {
  const readiness = tenantRuntimeReadiness();
  assert.equal(readiness.ready, false);
  assert.equal(readiness.missingModels.includes('Patient'), true);
  assert.equal(readiness.missingModels.includes('Invoice'), true);
});
