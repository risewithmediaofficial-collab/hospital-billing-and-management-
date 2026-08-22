import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  requireBranchContext,
  requireHospitalContext,
  tenantScope,
} from '../src/utils/tenantContext.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const domainsDirectory = path.resolve(testDirectory, '../src/domains');

const javascriptFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(target);
    return entry.isFile() && entry.name.endsWith('.js') ? [target] : [];
  }));
  return nested.flat();
};

test('tenant context rejects operations without an explicit hospital or branch', () => {
  assert.throws(
    () => requireHospitalContext({}),
    (error) => error.statusCode === 400 && error.code === 'HOSPITAL_CONTEXT_REQUIRED',
  );
  assert.throws(
    () => requireBranchContext({ hospitalId: 'hospital-1' }),
    (error) => error.statusCode === 400 && error.code === 'BRANCH_CONTEXT_REQUIRED',
  );
});

test('tenant scope normalizes populated ids without changing tenant ownership', () => {
  assert.deepEqual(
    tenantScope({ hospitalId: { _id: 'hospital-1' }, branchId: { _id: 'branch-1' } }, { branch: true }),
    { hospitalId: 'hospital-1', branchId: 'branch-1' },
  );
});

test('operational domains cannot silently fall back to an arbitrary or unowned hospital', async () => {
  const files = await javascriptFiles(domainsDirectory);
  const violations = [];

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (/Hospital\.findOne\(\s*\{\s*\}\s*\)/.test(source)) violations.push(`${file}: first-hospital fallback`);
    if (/hospitalId\s*:\s*null/.test(source)) violations.push(`${file}: null-hospital fallback`);
  }

  assert.deepEqual(violations, []);
});
