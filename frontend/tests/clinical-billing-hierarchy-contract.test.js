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

test('Doctor Department Responses badge clears completely when billing query is returned to billing', async () => {
  const [doctorDashboardSource, billingServiceSource] = await Promise.all([
    readFile(path.resolve(rootDir, 'frontend/src/pages/Dashboards/DoctorDashboard.jsx'), 'utf8'),
    readFile(path.resolve(rootDir, 'backend/src/domains/billing/billing.service.js'), 'utf8'),
  ]);

  assert.match(
    doctorDashboardSource,
    /setNavCount\(['"]\/doctor\/dashboard\?tab=DEPT_RESPONSES['"],\s*pendingReportsCount\)/,
    'Doctor dashboard navCount must strictly equal pendingReportsCount so 0 active subtabs clears the badge'
  );

  assert.match(
    doctorDashboardSource,
    /!rx\.billingQuery\?\.resolved/,
    'Doctor dashboard must exclude resolved billing queries from returned list'
  );

  assert.match(
    billingServiceSource,
    /NotificationService\.completeEntityTasks/,
    'Billing service must complete entity tasks when doctor responds to billing query'
  );
});

test('TeamChatWidget defines PRESETS and QUICK_EMOJIS constants without ReferenceError', async () => {
  const teamChatSource = await readFile(
    path.resolve(rootDir, 'frontend/src/components/chat/TeamChatWidget.jsx'),
    'utf8'
  );

  assert.match(
    teamChatSource,
    /const\s+PRESETS\s*=\s*\[/,
    'TeamChatWidget must define PRESETS constant array'
  );

  assert.match(
    teamChatSource,
    /const\s+QUICK_EMOJIS\s*=\s*\[/,
    'TeamChatWidget must define QUICK_EMOJIS constant array'
  );
});

test('Physical bed hierarchy performs cascading deletion across floors, wards, rooms, and beds', async () => {
  const bedsServiceSource = await readFile(
    path.resolve(rootDir, 'backend/src/domains/beds/beds.service.js'),
    'utf8'
  );

  // Floor deletion cascades to wards, rooms, and beds
  assert.match(
    bedsServiceSource,
    /HospitalFloor\.deleteOne[\s\S]*?HospitalWard\.deleteMany[\s\S]*?HospitalRoom\.deleteMany[\s\S]*?Bed\.deleteMany|HospitalWard\.find[\s\S]*?deleteFloor[\s\S]*?Bed\.deleteMany[\s\S]*?HospitalRoom\.deleteMany[\s\S]*?HospitalWard\.deleteMany[\s\S]*?HospitalFloor\.deleteOne/,
    'deleteFloor must cascade delete subordinate wards, rooms, and beds'
  );

  // Ward deletion cascades to rooms and beds
  assert.match(
    bedsServiceSource,
    /deleteWard[\s\S]*?Bed\.deleteMany[\s\S]*?HospitalRoom\.deleteMany[\s\S]*?HospitalWard\.deleteOne/,
    'deleteWard must cascade delete subordinate rooms and beds'
  );

  // Room deletion cascades to beds
  assert.match(
    bedsServiceSource,
    /deleteRoom[\s\S]*?Bed\.deleteMany[\s\S]*?HospitalRoom\.deleteOne/,
    'deleteRoom must cascade delete subordinate beds'
  );

  // Block deletion cascades to floors, wards, rooms, and beds
  assert.match(
    bedsServiceSource,
    /deleteBlock[\s\S]*?Bed\.deleteMany[\s\S]*?HospitalRoom\.deleteMany[\s\S]*?HospitalWard\.deleteMany[\s\S]*?HospitalFloor\.deleteMany[\s\S]*?HospitalBlock\.deleteOne/,
    'deleteBlock must cascade delete subordinate floors, wards, rooms, and beds'
  );
});

