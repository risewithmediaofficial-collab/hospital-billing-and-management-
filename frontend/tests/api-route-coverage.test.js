import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const frontendSource = path.join(root, 'frontend/src');
const backendDomains = path.join(root, 'backend/src/domains');

const routeMounts = {
  'auth.routes.js': '/auth',
  'hospital-admin.routes.js': '/hospital-admin',
  'saas.routes.js': '/saas',
  'patients.routes.js': '/patients',
  'appointments.routes.js': '/appointments',
  'emr.routes.js': '/emr',
  'beds.routes.js': '/beds',
  'requests.routes.js': '/requests',
  'billing.routes.js': '/billing',
  'diagnostics.routes.js': '/diagnostics',
  'admissions.routes.js': '/admissions',
  'emergency.routes.js': '/emergency',
  'patient-portal.routes.js': '/patient-portal',
  'guardian-portal.routes.js': '/guardian-portal',
  'doctor-updates.routes.js': '/doctor-updates',
  'workflow.routes.js': '/workflow',
  'pharmacy.routes.js': '/pharmacy',
  'notification.routes.js': '/notifications',
  'chat.routes.js': '/chat',
};

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return nested.flat();
};

const pathsMatch = (backendPath, requestPath) => {
  const backendSegments = backendPath.split('/');
  const requestSegments = requestPath.split('/');
  return backendSegments.length === requestSegments.length && backendSegments.every((segment, index) => (
    segment.startsWith(':') || requestSegments[index] === '__value__' || segment === requestSegments[index]
  ));
};

test('every directly declared frontend API call has a backend route with the same HTTP method', async () => {
  const backendFiles = (await walk(backendDomains)).filter((file) => file.endsWith('.routes.js'));
  const backendRoutes = [];
  for (const file of backendFiles) {
    const mount = routeMounts[path.basename(file)];
    if (!mount) continue;
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g)) {
      backendRoutes.push({ method: match[1], path: `${mount}${match[2]}`.replace(/\/$/, '') || '/' });
    }
  }

  const frontendFiles = (await walk(frontendSource)).filter((file) => /\.(jsx?|tsx?)$/.test(file));
  const missing = [];
  let checked = 0;
  for (const file of frontendFiles) {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/axiosClient\.(get|post|put|patch|delete)\(\s*(['"`])([^'"`]+)\2/g)) {
      const method = match[1];
      const declared = match[3];
      if (!declared.startsWith('/')) continue;
      const requestPath = declared
        .replace(/\?.*$/, '')
        .replace(/\$\{queryParams\}/g, '')
        .replace(/\$\{[^}]+\}/g, '__value__')
        .replace(/\/$/, '') || '/';
      checked += 1;
      const exists = backendRoutes.some((route) => route.method === method && pathsMatch(route.path, requestPath));
      if (!exists) missing.push(`${path.relative(root, file)}: ${method.toUpperCase()} ${declared}`);
    }
  }

  assert.ok(checked >= 200, `Expected broad API coverage; only inspected ${checked} calls.`);
  assert.deepStrictEqual(missing, [], `Frontend calls without matching backend routes:\n${missing.join('\n')}`);
});
