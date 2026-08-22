import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const routesFile = path.resolve(testDirectory, '../src/routes/AppRoutes.jsx');

test('emergency pages are nested inside authenticated route guards', async () => {
  const source = await readFile(routesFile, 'utf8');
  const compact = source.replace(/\s+/g, ' ');

  assert.equal(
    compact.includes('<Route element={<ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.NURSE, ROLES.NURSE_INCHARGE, ROLES.IPD_STAFF, ROLES.RECEPTIONIST, ROLES.OPD_STAFF]} />}> <Route path="/emergency" element={<MainLayout><EmergencyConsoleView /></MainLayout>} /> </Route>'),
    true,
  );
  assert.equal(
    compact.includes('<Route element={<TenantRouteGuard allowedRoles={[ROLES.DOCTOR, ROLES.NURSE, ROLES.NURSE_INCHARGE, ROLES.IPD_STAFF, ROLES.RECEPTIONIST, ROLES.OPD_STAFF]} />}> <Route path="/:hospitalDomain/emergency" element={<MainLayout><EmergencyConsoleView /></MainLayout>} /> </Route>'),
    true,
  );
});

test('patient and guardian portals do not authorize governance accounts', async () => {
  const source = await readFile(routesFile, 'utf8');

  assert.match(source, /TenantRouteGuard allowedRoles=\{\[ROLES\.PATIENT\]\}/);
  assert.match(source, /TenantRouteGuard allowedRoles=\{\[ROLES\.GUARDIAN\]\}/);
  assert.match(source, /ProtectedRoute allowedRoles=\{\[ROLES\.PATIENT\]\}/);
  assert.match(source, /ProtectedRoute allowedRoles=\{\[ROLES\.GUARDIAN\]\}/);
});

test('operational tenant portals require their actual staff roles', async () => {
  const source = await readFile(routesFile, 'utf8');
  const operationalGuards = [
    'ROLES.DOCTOR',
    'ROLES.CASHIER, ROLES.BILLING_STAFF',
    'ROLES.PHARMACIST, ROLES.PHARMACY_STAFF',
    'ROLES.LAB_TECH, ROLES.LABORATORY_STAFF',
    'ROLES.RADIOLOGIST, ROLES.RADIOLOGY_STAFF',
  ];

  for (const roles of operationalGuards) {
    assert.match(source, new RegExp(`TenantRouteGuard allowedRoles=\\{\\[${roles.replaceAll('.', '\\.')}\\]\\}`));
  }
});

test('hospital admin work mode shows only explicitly assigned operational desks', async () => {
  const sidebar = await readFile(new URL('../src/components/layout/Sidebar.jsx', import.meta.url), 'utf8');
  const workNavigation = sidebar.slice(sidebar.indexOf('export const WORK_MODE_NAVIGATION'), sidebar.indexOf('const ALL_MODULE_NAVIGATION'));
  assert.doesNotMatch(workNavigation, /requiredRoles: \[[^\]]*'HOSPITAL_ADMIN'/);
  assert.match(workNavigation, /requiredRoles: \['DOCTOR'\]/);
  assert.match(workNavigation, /requiredRoles: \['CASHIER', 'BILLING_STAFF'\]/);
});

test('every Hospital Admin keeps the Admin Mode and Work Mode switch with clinic-owner provisioning', async () => {
  const [workspace, navbar, authRoutes] = await Promise.all([
    readFile(new URL('../src/store/workspaceModeStore.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/layout/Navbar.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../../backend/src/domains/auth/auth.routes.js', import.meta.url), 'utf8'),
  ]);
  assert.match(workspace, /if \(user\.role === 'HOSPITAL_ADMIN'\) return true/);
  assert.match(navbar, /enable-clinic-work-mode/);
  assert.match(navbar, /Clinic Owner Work Mode/);
  assert.match(authRoutes, /post\('\/me\/enable-clinic-work-mode'/);
});

test('new Hospital Admin accounts receive governance defaults, not clinical work permissions', async () => {
  const dashboard = await readFile(new URL('../src/pages/Dashboards/HospitalAdminDashboard.jsx', import.meta.url), 'utf8');
  const defaults = dashboard.split('HOSPITAL_ADMIN: {')[1].split('  DOCTOR: {')[0];
  assert.match(defaults, /staffManagement/);
  assert.match(defaults, /hospitalSettings/);
  assert.doesNotMatch(defaults, /doctorConsultation|nursing:|pharmacy:|billing:|emergency:/);
});

test('diagnostic and cashier pages honor exact notification entity ids', async () => {
  const [lab, radiology, cashier] = await Promise.all([
    readFile(path.resolve(testDirectory, '../src/pages/Dashboards/LabTechDashboard.jsx'), 'utf8'),
    readFile(path.resolve(testDirectory, '../src/pages/Dashboards/RadiologistDashboard.jsx'), 'utf8'),
    readFile(path.resolve(testDirectory, '../src/pages/Dashboards/CashierDashboard.jsx'), 'utf8'),
  ]);

  for (const source of [lab, radiology]) {
    assert.match(source, /searchParams\.get\('orderId'\)/);
    assert.match(source, /data-testid="billing-query-banner"/);
    assert.match(source, /Resubmit to Billing/);
  }
  assert.match(cashier, /searchParams\.get\('invoiceId'\)/);
  assert.match(cashier, /invoice\._id === requestedInvoiceId/);
});

test('doctor department responses focus the exact pharmacy substitution request', async () => {
  const source = await readFile(path.resolve(testDirectory, '../src/pages/Dashboards/DoctorDashboard.jsx'), 'utf8');

  assert.match(source, /get\('substitutionId'\)/);
  assert.match(source, /activeTab !== 'DEPT_RESPONSES'/);
  assert.match(source, /id=\{`substitution-\$\{req\._id\}`\}/);
  assert.match(source, /String\(req\._id\) === String\(requestedSubstitutionId\)/);
});

test('nursing and doctor response pages focus the exact nurse task from notification URLs', async () => {
  const [nursing, doctor] = await Promise.all([
    readFile(path.resolve(testDirectory, '../src/pages/Dashboards/NurseInchargeDashboard.jsx'), 'utf8'),
    readFile(path.resolve(testDirectory, '../src/pages/Dashboards/DoctorDashboard.jsx'), 'utf8'),
  ]);

  assert.match(nursing, /get\('taskId'\)/);
  assert.match(nursing, /id=\{`nurse-task-\$\{t\._id\}`\}/);
  assert.match(nursing, /String\(t\._id\) === String\(requestedTaskId\)/);
  assert.match(doctor, /get\('taskId'\)/);
  assert.match(doctor, /id=\{`doctor-nurse-task-\$\{task\._id\}`\}/);
  assert.match(doctor, /String\(task\._id\) === String\(requestedNurseTaskId\)/);
});

test('doctor billing review notifications focus the exact persisted invoice query', async () => {
  const doctor = await readFile(new URL('../src/pages/Dashboards/DoctorDashboard.jsx', import.meta.url), 'utf8');
  assert.match(doctor, /get\('invoiceId'\)/);
  assert.match(doctor, /doctor-billing-query-\$\{requestedInvoiceId\}/);
  assert.match(doctor, /doctor-billing-query-\$\{rx\.invoiceId \|\| rx\.billingQuery\?\.invoiceId/);
});
