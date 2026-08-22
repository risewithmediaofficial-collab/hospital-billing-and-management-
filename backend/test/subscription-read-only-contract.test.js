import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('expired hospitals retain reads but operational writes require renewal', async () => {
  const source = await readFile(new URL('../src/middleware/verifyJwt.js', import.meta.url), 'utf8');
  assert.match(source, /status === 'EXPIRED'/);
  assert.match(source, /trialStatus === 'TRIAL_EXPIRED'/);
  assert.match(source, /!\['GET', 'HEAD', 'OPTIONS'\]\.includes\(req\.method\)/);
  assert.match(source, /SUBSCRIPTION_READ_ONLY/);
  assert.match(source, /Data remains available in read-only mode/);
  assert.doesNotMatch(source, /deleteMany[\s\S]{0,500}SUBSCRIPTION_READ_ONLY/);
});

test('subscription expiry never schedules automatic tenant-data deletion', async () => {
  const source = await readFile(new URL('../src/domains/saas/saas.service.js', import.meta.url), 'utf8');
  assert.match(source, /hosp\.dataRetentionDeadline = null/);
  assert.match(source, /no automatic data deletion is scheduled/);
  assert.doesNotMatch(source, /now\.getTime\(\) \+ 90 \* 24 \* 60 \* 60 \* 1000/);
});

test('production auth recovery never returns reset or verification tokens', async () => {
  const source = await readFile(new URL('../src/domains/auth/auth.service.js', import.meta.url), 'utf8');
  assert.match(source, /NODE_ENV !== 'production' && process\.env\.EXPOSE_DEV_AUTH_TOKENS === 'true'/);
  assert.doesNotMatch(source, /return \{ message: [^\n]+, resetToken: token \}/);
  assert.doesNotMatch(source, /return \{ message: [^\n]+, verificationToken: token \}/);
});
