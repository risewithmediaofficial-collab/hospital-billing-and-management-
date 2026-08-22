import test from 'node:test';
import assert from 'node:assert/strict';

import { validateProductionEnvironment } from '../src/config/env.js';

test('development configuration may use local defaults', () => {
  assert.equal(validateProductionEnvironment({ NODE_ENV: 'development' }), true);
});

test('production refuses built-in credentials and wildcard CORS', () => {
  assert.throws(
    () => validateProductionEnvironment({
      NODE_ENV: 'production',
      JWT_SECRET: 'hpmbs_super_secret_jwt_key_2026_production_grade_x89',
      REFRESH_TOKEN_SECRET: 'hpmbs_super_secret_refresh_key_2026_production_grade_x89',
      CORS_ORIGIN: '*',
    }),
    /Production configuration is insecure or incomplete/,
  );
});
