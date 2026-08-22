import test from 'node:test';
import assert from 'node:assert/strict';

import '../src/models/index.js';
import {
  REQUIRED_TENANT_RUNTIME_MODELS,
  registeredTenantModelNames,
  tenantRuntimeReadiness,
} from '../src/config/tenantAwareModel.js';

test('every required operational model is tenant-aware at application startup', () => {
  const readiness = tenantRuntimeReadiness();
  assert.deepEqual(readiness, { ready: true, missingModels: [] });
  for (const modelName of REQUIRED_TENANT_RUNTIME_MODELS) {
    assert.equal(registeredTenantModelNames().includes(modelName), true, `${modelName} must be tenant-aware`);
  }
});
