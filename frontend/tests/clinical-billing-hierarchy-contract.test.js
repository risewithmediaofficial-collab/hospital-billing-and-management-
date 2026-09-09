import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDirectory, '../..');

test('Bed hierarchy routes allow HOSPITAL_ADMIN to manage bed structure', async () => {
  const routesSource = await readFile(path.resolve(rootDir, 'backend/src/domains/beds/beds.routes.js'), 'utf8');
  assert.match(
    routesSource,
    /manageBedStructure\s*=\s*requireRole\(['"]HOSPITAL_ADMIN['"],\s*['"]NURSE_INCHARGE['"],\s*['"]IPD_STAFF['"]\)|manageBedStructure\s*=\s*requireAssignedRole\([^)]*['"]HOSPITAL_ADMIN['"]/,
    'manageBedStructure must permit HOSPITAL_ADMIN along with operational nurses'
  );
});

test('Beds service seeder does not resurrect deleted beds once initialized', async () => {
  const bedsServiceSource = await readFile(path.resolve(rootDir, 'backend/src/domains/beds/beds.service.js'), 'utf8');
  assert.match(
    bedsServiceSource,
    /bedStructureInitialized/,
    'Beds service must check bedStructureInitialized flag before auto-seeding'
  );
});

test('CreateWardModal and CreateRoomModal reset stale floorId on block changes', async () => {
  const [wardModal, roomModal] = await Promise.all([
    readFile(path.resolve(rootDir, 'frontend/src/components/modals/CreateWardModal.jsx'), 'utf8'),
    readFile(path.resolve(rootDir, 'frontend/src/components/modals/CreateRoomModal.jsx'), 'utf8'),
  ]);

  assert.match(wardModal, /filteredFloors\.some/, 'CreateWardModal must auto-clear floorId if not in filteredFloors');
  assert.match(roomModal, /filteredFloors\.some/, 'CreateRoomModal must auto-clear floorId if not in filteredFloors');
});

test('Doctor dashboard does not show premature department response notifications', async () => {
  const doctorDashboardSource = await readFile(path.resolve(rootDir, 'frontend/src/pages/Dashboards/DoctorDashboard.jsx'), 'utf8');
  assert.match(
    doctorDashboardSource,
    /completedDeptResponses|unreviewedDeptResponses/,
    'Doctor dashboard must only count completed or uploaded department responses for badge'
  );
});

test('Radiology notification route matching isolates sub-tabs without triplicating badges', async () => {
  const storeSource = await readFile(path.resolve(rootDir, 'frontend/src/store/departmentNotificationStore.js'), 'utf8');
  assert.match(
    storeSource,
    /nTab === 'DICOM'|nTab === 'REPORTS'/,
    'Radiology pathMatches must distinguish DICOM and REPORTS subtabs from main desk'
  );
});

test('Global CSS and Input component eliminate number spinners and wheel increments', async () => {
  const [inputComponent, indexCss] = await Promise.all([
    readFile(path.resolve(rootDir, 'frontend/src/components/ui/Input.jsx'), 'utf8'),
    readFile(path.resolve(rootDir, 'frontend/src/index.css'), 'utf8'),
  ]);

  assert.match(
    indexCss,
    /input\[type=["']?number["']?\]::-webkit-inner-spin-button/,
    'Global CSS must suppress number spin buttons'
  );
  assert.match(
    inputComponent,
    /onWheel|appearance-none|\[appearance:textfield\]/,
    'Input component must handle wheel events or spinner suppression'
  );
});

test('Pharmacist dashboard allows optional suggested alternative for substitution request', async () => {
  const pharmacistDashboardSource = await readFile(path.resolve(rootDir, 'frontend/src/pages/Dashboards/PharmacistDashboard.jsx'), 'utf8');
  assert.match(
    pharmacistDashboardSource,
    /Suggested Available Alternative \(Optional\)/,
    'Pharmacist dashboard must label suggested alternative as optional'
  );
  assert.doesNotMatch(
    pharmacistDashboardSource,
    /disabled=\{!subForm\.suggestedMedicineId/,
    'Pharmacist dashboard submit button must not be disabled when suggestedMedicineId is empty'
  );
});

test('Central billing desk shows pending invoices without false exclusion', async () => {
  const [billingService, cashierDashboard] = await Promise.all([
    readFile(path.resolve(rootDir, 'backend/src/domains/billing/billing.service.js'), 'utf8'),
    readFile(path.resolve(rootDir, 'frontend/src/pages/Dashboards/CashierDashboard.jsx'), 'utf8'),
  ]);

  assert.match(
    billingService,
    /doctorReviewQuery\.query['"]:\s*(\{\s*\$in:\s*\[['"]['"],\s*null\]\s*\}|['"]['"])/,
    'Billing service query must include invoices with empty doctorReviewQuery.query'
  );
  assert.match(
    cashierDashboard,
    /inv\.doctorReviewQuery\?\.query(\?\.trim\(\))? && !inv\.doctorReviewQuery\?\.resolved/,
    'Cashier dashboard must only exclude invoices with active non-empty doctorReviewQuery'
  );
});
