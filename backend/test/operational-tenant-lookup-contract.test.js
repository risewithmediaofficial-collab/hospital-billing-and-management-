import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (relativePath) => readFile(new URL(`../src/domains/${relativePath}`, import.meta.url), 'utf8');

test('clinical workflow foreign keys are resolved inside the authenticated hospital', async () => {
  const [diagnostics, emr, doctorUpdates, nurseTasks] = await Promise.all([
    read('diagnostics/diagnostics.service.js'),
    read('emr/emr.service.js'),
    read('doctor-updates/doctor-updates.service.js'),
    read('pharmacy/nurse-tasks.service.js'),
  ]);

  assert.match(diagnostics, /Appointment\.findOne\(\{ _id: data\.appointmentId, hospitalId \}\)/);
  assert.match(emr, /Appointment\.findOne\(\{ _id: data\.appointmentId, hospitalId \}\)/);
  assert.match(emr, /DiagnosticOrder\.find\(\{\s+hospitalId,/);
  assert.match(doctorUpdates, /Patient\.findOne\(\{ _id: patientId, hospitalId: doctorUser\.hospitalId \}\)/);
  assert.match(doctorUpdates, /const query = \{ patientId, hospitalId: user\?\.hospitalId \}/);
  assert.match(nurseTasks, /Patient\.findOne\(\{ _id: data\.patientId, hospitalId \}\)/);
  assert.match(nurseTasks, /Appointment\.findOne\(\{ _id: data\.appointmentId, hospitalId \}\)/);
  assert.match(nurseTasks, /_id: assignedNurseId,\s+hospitalId,/);
});

test('direct chat rejects recipients outside the sender hospital', async () => {
  const chat = await read('chat/chat.service.js');

  assert.match(chat, /User\.findOne\(\{ _id: recipientId, hospitalId \}\)/);
  assert.match(chat, /RECIPIENT_NOT_FOUND/);
});

test('bed hierarchy, allocation, reservations, and transfers retain hospital ownership', async () => {
  const beds = await read('beds/beds.service.js');

  assert.match(beds, /resolveHierarchyDocuments\(hospitalId, data = \{\}\)/);
  assert.match(beds, /HospitalBlock\.findOne\(\{ _id: data\.blockId, hospitalId \}\)/);
  assert.match(beds, /HospitalFloor\.findOne\(\{ _id: data\.floorId, hospitalId \}\)/);
  assert.match(beds, /HospitalWard\.findOne\(\{ _id: data\.wardId, hospitalId \}\)/);
  assert.match(beds, /HospitalRoom\.findOne\(\{ _id: data\.roomId, hospitalId \}\)/);
  assert.match(beds, /Patient\.findOne\(\{ _id: patientId, hospitalId \}\)/);
  assert.match(beds, /Patient\.findOne\(\{ _id: data\.patientId, hospitalId \}\)/);
  assert.match(beds, /Bed\.findOne\(\{ _id: admission\.bedId, hospitalId \}\)/);
  assert.match(beds, /\{ hospitalId, bedId: bed\._id, status: 'ACTIVE' \}/);
  assert.doesNotMatch(beds, /updateMany\(\{ (?:blockId|floorId|wardId|roomId|bedId): id \}/);
});

test('pharmacy completion is tenant-scoped and links billing and substitution alerts to exact records', async () => {
  const pharmacy = await read('pharmacy/pharmacy.service.js');

  assert.match(pharmacy, /Prescription\.findOne\(\{ _id: prescriptionId, hospitalId: user\.hospitalId \}\)/);
  assert.match(pharmacy, /Patient\.findOne\(\{ _id: prescription\.patientId, hospitalId: user\.hospitalId \}\)/);
  assert.match(pharmacy, /WORKFLOW_EVENTS\.PHARMACY_DISPENSED/);
  assert.match(pharmacy, /invoiceId: billingInvoice\?\._id/);
  assert.match(pharmacy, /tab=DEPT_RESPONSES&substitutionId=\$\{req\._id\}/);
  assert.match(pharmacy, /sourceModule: 'pharmacy'/);
  assert.match(pharmacy, /entityType: 'PharmacySubstitutionRequest'/);
  assert.match(pharmacy, /emitToUser\(String\(prescription\.doctorId\), 'workflow:notification'/);
  assert.match(pharmacy, /emitToUser\(String\(req\.pharmacistId\), 'workflow:notification'/);
  assert.doesNotMatch(pharmacy, /sendBillingToDoctor/);
  assert.match(pharmacy, /\{ hospitalId: user\.hospitalId, patientId: prescription\.patientId, status: 'WAITING_PHARMACY' \}/);
});

test('pharmacy charges accumulate by stable source instead of deleting prior medicine lines', async () => {
  const [pharmacy, nurseTasks, invoice] = await Promise.all([
    read('pharmacy/pharmacy.service.js'),
    read('pharmacy/nurse-tasks.service.js'),
    readFile(new URL('../src/models/Invoice.js', import.meta.url), 'utf8'),
  ]);

  assert.match(invoice, /sourceRef: \{ type: String/);
  assert.match(pharmacy, /sourceRef: `prescription:\$\{prescription\._id\}:medicine:\$\{item\._id\}`/);
  assert.match(nurseTasks, /sourceRef: `nurse-task:/);
  assert.match(pharmacy, /String\(it\.sourceRef \|\| ''\) !== stableRef/);
  assert.doesNotMatch(pharmacy, /filter\(\(it\) => it\.category !== 'PHARMACY'\)/);
});

test('nurse tasks notify exact assignees or scoped nursing pools with actionable records', async () => {
  const nurseTasks = await read('pharmacy/nurse-tasks.service.js');

  assert.match(nurseTasks, /\['NURSE', 'NURSE_INCHARGE'\]/);
  assert.match(nurseTasks, /tab=TASKS&taskId=\$\{task\._id\}/);
  assert.match(nurseTasks, /tab=TASKS&taskId=\$\{pendingTask\._id\}/);
  assert.match(nurseTasks, /emitToBranchRole/);
  assert.match(nurseTasks, /emitToHospitalRole/);
  assert.doesNotMatch(nurseTasks, /emitToRole\(/);
  assert.doesNotMatch(nurseTasks, /emitToRole\('HOSPITAL_ADMIN'/);
  assert.match(nurseTasks, /Medicine\.findOne\(\{ _id: task\.medicineId, hospitalId: user\.hospitalId \}\)/);
  assert.match(nurseTasks, /Appointment\.findOne\(\{ _id: task\.appointmentId, hospitalId: user\.hospitalId \}\)/);
  assert.match(nurseTasks, /tab=DEPT_RESPONSES&taskId=\$\{task\._id\}/);
});

test('guardian discovery cannot auto-approve arbitrary UHID or patient-phone matches', async () => {
  const guardian = await read('guardian-portal/guardian-portal.service.js');

  assert.match(guardian, /'emergencyContact\.phone': \{ \$in: phones \}/);
  assert.doesNotMatch(guardian, /\{ phone: \{ \$in: phones \} \}/);
  assert.match(guardian, /Patient\.findOne\(\{ hospitalId: user\.hospitalId, uhid: cleanUhid \}\)/);
  assert.match(guardian, /accessStatus: 'PENDING'/);
  assert.doesNotMatch(guardian, /GuardianLink\.updateMany\([\s\S]{0,180}accessStatus: 'APPROVED'/);
  assert.match(guardian, /GuardianLink\.findOne\(\{ _id: linkId, hospitalId: user\.hospitalId \}\)/);
});

test('ordinary EHR lookup remains hospital-local unless explicit record sharing is used', async () => {
  const emr = await read('emr/emr.service.js');

  assert.match(emr, /Patient\.findOne\(\{ _id: identifier, hospitalId: currentTenantHospitalId \}\)/);
  assert.match(emr, /Patient\.find\(\{ hospitalId: currentTenantHospitalId, \$or: patientSearchConditions \}\)/);
  for (const model of ['Consultation', 'Prescription', 'DiagnosticOrder', 'NurseTask']) {
    assert.match(emr, new RegExp(`${model}\\.find\\(\\{ hospitalId: currentTenantHospitalId, patientId:`));
  }
  assert.match(emr, /Invoice\.find\(\{ hospitalId: currentTenantHospitalId, patientId:/);
  assert.match(emr, /Cross-hospital records[\s\S]{0,100}MedicalRecordShare/);
});

test('consultation completion sends both billing roles to the exact invoice', async () => {
  const emr = await read('emr/emr.service.js');

  assert.match(emr, /WORKFLOW_EVENTS\.CONSULTATION_COMPLETE/);
  assert.match(emr, /hospitalId: hospId/);
  assert.match(emr, /invoiceId: invoice\._id/);
  assert.match(emr, /tab=CENTRAL_DESK&invoiceId=\$\{invoice\._id\}/);
  assert.doesNotMatch(emr, /NotificationService\.createNotification\([\s\S]{0,500}New Bill Pending/);
});

test('consultation billing waits for actual pharmacy dispensing and commits diagnostic inclusion after invoice creation', async () => {
  const emr = await read('emr/emr.service.js');
  const invoiceCreateAt = emr.indexOf('const invoice = await Invoice.create');
  const diagnosticIncludedAt = emr.indexOf("chargeStatus: 'INCLUDED_IN_FINAL_BILL'", invoiceCreateAt);

  assert.ok(invoiceCreateAt > 0);
  assert.ok(diagnosticIncludedAt > invoiceCreateAt, 'diagnostic charges must be marked included only after invoice persistence');
  assert.match(emr, /appointmentId: appointment\._id,[\s\S]{0,100}chargeStatus: \{ \$ne: 'CANCELLED' \}/);
  assert.doesNotMatch(emr, /Include pharmacy billed medicine items/);
  assert.doesNotMatch(emr, /\[Prescription Medicine\][\s\S]{0,300}items\.push/);
  assert.doesNotMatch(emr, /ord\.status = 'REVIEWED'/);
});
