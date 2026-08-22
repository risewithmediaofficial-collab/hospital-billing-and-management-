import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { env, validateProductionEnvironment } from '../src/config/env.js';
import { EmailDeliveryService } from '../src/services/emailDelivery.service.js';

test('production recovery email uses the configured provider without exposing authorization in content', async () => {
  const original = { ...env };
  Object.assign(env, {
    NODE_ENV: 'production',
    EMAIL_PROVIDER: 'resend',
    RESEND_API_KEY: 'provider-secret',
    EMAIL_FROM: 'security@hospital.test',
    PUBLIC_APP_URL: 'https://hms.hospital.test',
  });
  let request;
  try {
    const result = await EmailDeliveryService.send({
      to: 'doctor@hospital.test',
      subject: 'Recovery',
      text: 'safe message',
      html: '<p>safe message</p>',
    }, async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ id: 'email-1' }) };
    });
    assert.strictEqual(result.id, 'email-1');
    assert.strictEqual(request.url, 'https://api.resend.com/emails');
    assert.strictEqual(request.options.headers.authorization, 'Bearer provider-secret');
    assert.doesNotMatch(request.options.body, /provider-secret/);
  } finally {
    Object.assign(env, original);
  }
});

test('production boot validation requires recovery-delivery configuration', () => {
  assert.throws(() => validateProductionEnvironment({
    NODE_ENV: 'production',
    JWT_SECRET: 'a'.repeat(40),
    REFRESH_TOKEN_SECRET: 'b'.repeat(40),
    SEARCH_HASH_KEY: 'c'.repeat(40),
    CORS_ORIGIN: 'https://hms.test',
    PUBLIC_APP_URL: 'https://hms.test',
    EMAIL_PROVIDER: '',
    EMAIL_FROM: '',
    RESEND_API_KEY: '',
  }), /EMAIL_PROVIDER=resend/);
});

test('auth recovery sends links through email delivery and invalidates tokens on delivery failure', async () => {
  const source = await readFile(new URL('../src/domains/auth/auth.service.js', import.meta.url), 'utf8');
  assert.match(source, /EmailDeliveryService\.sendEmailVerification/);
  assert.match(source, /EmailDeliveryService\.sendPasswordReset/);
  assert.match(source, /user\.passwordResetToken = null;[\s\S]{0,120}throw error/);
  assert.match(source, /user\.emailVerificationToken = null;[\s\S]{0,120}throw error/);
});
