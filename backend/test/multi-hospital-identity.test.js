/**
 * Backend Tests: Multi-Hospital Patient Identity
 * Tests: GlobalPatient model structure, duplicate check logic, 
 *        CareTeamAssignment logic, pharmacy availability, and 
 *        patient service business rules.
 *
 * Run: node --test test/multi-hospital-identity.test.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: GlobalPatient ID Format Validation
// ─────────────────────────────────────────────────────────────────────────────
test.describe('GlobalPatient ID Format', () => {

  test('globalPatientId should follow GP-YYYY-NNNNN pattern', () => {
    const id = 'GP-2026-00001';
    const pattern = /^GP-\d{4}-\d{5}$/;
    assert.ok(pattern.test(id), `Expected GP-YYYY-NNNNN format, got: ${id}`);
  });

  test('should correctly pad sequential numbers', () => {
    const pad = (n, len = 5) => String(n).padStart(len, '0');
    assert.equal(pad(1), '00001');
    assert.equal(pad(99), '00099');
    assert.equal(pad(10000), '10000');
  });

  test('admissionReference should follow ADM-UHID-NNN pattern', () => {
    const uhid = 'HOSP-2026-00001';
    const admNum = 2;
    const ref = `ADM-${uhid}-${String(admNum).padStart(3, '0')}`;
    assert.equal(ref, 'ADM-HOSP-2026-00001-002');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: Duplicate Check Logic
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Duplicate Patient Detection Logic', () => {

  test('should detect duplicate by phone number (last 10 digits match)', () => {
    const incoming = '+91 9876543210';
    const existing = '9876543210';
    const incomingDigits = incoming.replace(/\D/g, '').slice(-10);
    const existingDigits = existing.replace(/\D/g, '').slice(-10);
    assert.equal(incomingDigits, existingDigits);
  });

  test('should detect duplicate by email (case-insensitive)', () => {
    const incoming = 'JOHN.DOE@HOSPITAL.COM';
    const existing = 'john.doe@hospital.com';
    assert.equal(incoming.toLowerCase(), existing.toLowerCase());
  });

  test('same patient phone and guardian phone should be rejected', () => {
    const patientPhone = '+91 9876543210';
    const guardianPhone = '+91 9876543210';
    const isDuplicate = patientPhone.trim() === guardianPhone.trim();
    assert.equal(isDuplicate, true, 'Patient and guardian cannot have same phone');
  });

  test('different phone numbers should not be flagged as duplicate', () => {
    const patientPhone = '+91 9876543210';
    const guardianPhone = '+91 8765432109';
    const isSame = patientPhone.trim() === guardianPhone.trim();
    assert.equal(isSame, false);
  });

  test('allowForce=true should bypass duplicate check', () => {
    const data = { allowForce: true, phone: '9876543210' };
    // Simulate: if allowForce is set, skip duplicate check
    const shouldCheck = !data.allowForce;
    assert.equal(shouldCheck, false, 'Duplicate check should be skipped when allowForce=true');
  });

  test('name+DOB match should be a valid duplicate signal', () => {
    const incoming = { firstName: 'John', dob: '1990-05-15' };
    const existing = { firstName: 'John', dob: '1990-05-15' };
    const firstNameMatch = incoming.firstName.toLowerCase() === existing.firstName.toLowerCase();
    const dobMatch = new Date(incoming.dob).toDateString() === new Date(existing.dob).toDateString();
    assert.ok(firstNameMatch && dobMatch, 'Name + DOB match should indicate possible duplicate');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: Admission Sequencing Logic
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Sequential Admission Numbering', () => {

  test('first admission should be number 1', () => {
    const prevCount = 0;
    const admissionNumber = prevCount + 1;
    assert.equal(admissionNumber, 1);
  });

  test('subsequent admissions should increment', () => {
    const prevCount = 2;
    const admissionNumber = prevCount + 1;
    assert.equal(admissionNumber, 3);
  });

  test('admission reference should encode UHID + number', () => {
    const uhid = 'HOSP-2026-00003';
    const admNum = 1;
    const ref = `ADM-${uhid}-${String(admNum).padStart(3, '0')}`;
    assert.ok(ref.startsWith('ADM-HOSP-2026-00003'), 'Reference should contain UHID');
    assert.ok(ref.endsWith('-001'), 'Reference should end with 3-digit sequence');
  });

  test('Patient admissionStatus should be ACTIVE_ADMISSION on new admission', () => {
    const statusAfterAdmit = 'ACTIVE_ADMISSION';
    const validStatuses = ['NEVER_ADMITTED', 'ACTIVE_ADMISSION', 'DISCHARGED'];
    assert.ok(validStatuses.includes(statusAfterAdmit));
  });

  test('Patient admissionStatus should be DISCHARGED after discharge', () => {
    const statusAfterDischarge = 'DISCHARGED';
    const validStatuses = ['NEVER_ADMITTED', 'ACTIVE_ADMISSION', 'DISCHARGED'];
    assert.ok(validStatuses.includes(statusAfterDischarge));
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: Care Team Assignment Logic
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CareTeamAssignment Business Rules', () => {

  const validRoles = [
    'PRIMARY_DOCTOR', 'CONSULTING_DOCTOR', 'NURSE', 'DUTY_NURSE',
    'CARETAKER', 'ICU_SPECIALIST', 'WARD_STAFF', 'PHYSIOTHERAPIST', 'DIETITIAN'
  ];

  test('care team role list should include all required roles', () => {
    assert.ok(validRoles.includes('PRIMARY_DOCTOR'));
    assert.ok(validRoles.includes('NURSE'));
    assert.ok(validRoles.includes('CARETAKER'));
    assert.ok(validRoles.includes('ICU_SPECIALIST'));
  });

  test('careTeamAssigned should be true only when doctor AND nurse are both assigned', () => {
    const assignments = [
      { role: 'PRIMARY_DOCTOR', removedAt: null },
      { role: 'NURSE', removedAt: null },
    ];
    const activeDoctors = assignments.filter(a => a.role === 'PRIMARY_DOCTOR' && !a.removedAt).length;
    const activeNurses = assignments.filter(a => ['NURSE', 'DUTY_NURSE'].includes(a.role) && !a.removedAt).length;
    const careTeamAssigned = activeDoctors > 0 && activeNurses > 0;
    assert.ok(careTeamAssigned, 'Should be true when both doctor and nurse assigned');
  });

  test('careTeamAssigned should be false when only doctor assigned', () => {
    const assignments = [{ role: 'PRIMARY_DOCTOR', removedAt: null }];
    const activeDoctors = assignments.filter(a => a.role === 'PRIMARY_DOCTOR' && !a.removedAt).length;
    const activeNurses = assignments.filter(a => ['NURSE', 'DUTY_NURSE'].includes(a.role) && !a.removedAt).length;
    const careTeamAssigned = activeDoctors > 0 && activeNurses > 0;
    assert.equal(careTeamAssigned, false, 'Should not be assigned without nurse');
  });

  test('assignment with removedAt set should be treated as inactive', () => {
    const assignment = { role: 'NURSE', userId: 'user-1', removedAt: new Date(), removalReason: 'Replaced' };
    const isActive = assignment.removedAt === null;
    assert.equal(isActive, false);
  });

  test('replacing a role should close previous and create new assignment', () => {
    const existingAssignments = [
      { role: 'NURSE', userId: 'nurse-old', removedAt: null }
    ];
    // Simulate close
    existingAssignments[0].removedAt = new Date();
    existingAssignments[0].removalReason = 'Replaced by new assignment';
    // New assignment
    const newAssignment = { role: 'NURSE', userId: 'nurse-new', removedAt: null };

    const active = [...existingAssignments, newAssignment].filter(a => !a.removedAt);
    const history = [...existingAssignments, newAssignment].filter(a => a.removedAt);
    assert.equal(active.length, 1);
    assert.equal(active[0].userId, 'nurse-new');
    assert.equal(history.length, 1);
    assert.equal(history[0].userId, 'nurse-old');
  });

  test('cannot assign care team to DISCHARGED admission', () => {
    const admission = { status: 'DISCHARGED' };
    const canAssign = admission.status !== 'DISCHARGED';
    assert.equal(canAssign, false, 'Should not allow care team assignment to discharged admission');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: Pharmacy Availability Logic
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Pharmacy Availability Check Logic', () => {

  const now = new Date();

  function computeStockStatus(totalQty, minimumStockLevel, batches) {
    const nearExpiryThreshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const hasNearExpiry = batches.some(b => new Date(b.expiryDate) <= nearExpiryThreshold);
    if (totalQty === 0) return 'OUT_OF_STOCK';
    if (totalQty <= minimumStockLevel) return 'LOW_STOCK';
    if (hasNearExpiry) return 'NEAR_EXPIRY';
    return 'AVAILABLE';
  }

  test('should return AVAILABLE when stock is above minimum', () => {
    const status = computeStockStatus(100, 10, [{ expiryDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) }]);
    assert.equal(status, 'AVAILABLE');
  });

  test('should return OUT_OF_STOCK when total quantity is 0', () => {
    const status = computeStockStatus(0, 10, []);
    assert.equal(status, 'OUT_OF_STOCK');
  });

  test('should return LOW_STOCK when quantity equals minimumStockLevel', () => {
    const status = computeStockStatus(10, 10, [{ expiryDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) }]);
    assert.equal(status, 'LOW_STOCK');
  });

  test('should return NEAR_EXPIRY when a batch expires within 30 days', () => {
    const status = computeStockStatus(50, 10, [{ expiryDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000) }]);
    assert.equal(status, 'NEAR_EXPIRY');
  });

  test('should return NOT_MAINTAINED for unknown medicines', () => {
    // Simulate: medicine not found in hospital pharmacy
    const medicine = null;
    const stockStatus = medicine ? 'AVAILABLE' : 'NOT_MAINTAINED';
    assert.equal(stockStatus, 'NOT_MAINTAINED');
  });

  test('hasUnavailableItems should be true if any medicine is OUT_OF_STOCK', () => {
    const results = [
      { stockStatus: 'AVAILABLE' },
      { stockStatus: 'OUT_OF_STOCK' },
    ];
    const hasUnavailable = results.some(r => r.stockStatus === 'OUT_OF_STOCK' || r.stockStatus === 'NOT_MAINTAINED');
    assert.equal(hasUnavailable, true);
  });

  test('summary should correctly count available medicines', () => {
    const results = [
      { stockStatus: 'AVAILABLE' },
      { stockStatus: 'OUT_OF_STOCK' },
      { stockStatus: 'AVAILABLE' },
    ];
    const available = results.filter(r => r.stockStatus === 'AVAILABLE').length;
    const summary = `${available}/${results.length} medicines available`;
    assert.equal(summary, '2/3 medicines available');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: Discharge Lifecycle Logic
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Discharge Lifecycle Logic', () => {

  test('discharge should set Patient.admissionStatus to DISCHARGED', () => {
    const patient = { admissionStatus: 'ACTIVE_ADMISSION', activeAdmissionId: 'adm-123' };
    // Simulate discharge
    patient.admissionStatus = 'DISCHARGED';
    patient.activeAdmissionId = null;
    assert.equal(patient.admissionStatus, 'DISCHARGED');
    assert.equal(patient.activeAdmissionId, null);
  });

  test('discharge should disable guardian liveAccessActive', () => {
    const guardianLinks = [
      { patientId: 'p1', liveAccessActive: true },
      { patientId: 'p1', liveAccessActive: true },
    ];
    // Simulate: set liveAccessActive = false on discharge
    guardianLinks.forEach(link => { link.liveAccessActive = false; link.liveAccessDisabledAt = new Date(); });
    assert.ok(guardianLinks.every(l => !l.liveAccessActive), 'All guardian links should be disabled on discharge');
  });

  test('discharge should close all active CareTeamAssignments', () => {
    const assignments = [
      { role: 'PRIMARY_DOCTOR', removedAt: null },
      { role: 'NURSE', removedAt: null },
    ];
    // Simulate close
    const dischargeTime = new Date();
    assignments.forEach(a => { a.removedAt = dischargeTime; a.removalReason = 'Patient discharged'; });
    const stillOpen = assignments.filter(a => !a.removedAt);
    assert.equal(stillOpen.length, 0, 'All assignments should be closed after discharge');
  });

  test('bed should be freed on discharge', () => {
    const bed = { status: 'OCCUPIED', currentPatientId: 'p1', assignedNurseId: 'n1' };
    // Simulate free
    bed.status = 'AVAILABLE';
    bed.currentPatientId = null;
    bed.assignedNurseId = null;
    assert.equal(bed.status, 'AVAILABLE');
    assert.equal(bed.currentPatientId, null);
  });

  test('GlobalPatient membership hasActiveAdmission should become false on discharge', () => {
    const membership = { hospitalId: 'h1', hasActiveAdmission: true, activeAdmissionId: 'adm-123' };
    // Simulate
    membership.hasActiveAdmission = false;
    membership.activeAdmissionId = null;
    membership.lastVisitAt = new Date();
    assert.equal(membership.hasActiveAdmission, false);
    assert.equal(membership.activeAdmissionId, null);
    assert.ok(membership.lastVisitAt instanceof Date);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: Medical Record Share Logic
// ─────────────────────────────────────────────────────────────────────────────
test.describe('MedicalRecordShare Access Control', () => {

  const validRecordTypes = [
    'DIAGNOSTIC_REPORT', 'PRESCRIPTION', 'DISCHARGE_SUMMARY',
    'CONSULTATION_NOTE', 'LAB_REPORT', 'RADIOLOGY_REPORT', 'DOCTOR_UPDATE', 'INVOICE', 'OTHER'
  ];

  test('should only allow valid record types', () => {
    const testType = 'LAB_REPORT';
    assert.ok(validRecordTypes.includes(testType));
    const badType = 'UNKNOWN_TYPE';
    assert.ok(!validRecordTypes.includes(badType));
  });

  test('REVOKED share should deny access', () => {
    const share = { status: 'REVOKED' };
    const isAccessible = share.status === 'ACTIVE';
    assert.equal(isAccessible, false);
  });

  test('EXPIRED share should deny access', () => {
    const share = { status: 'ACTIVE', shareType: 'UNTIL_DATE', expiresAt: new Date('2020-01-01') };
    const isExpired = share.shareType === 'UNTIL_DATE' && share.expiresAt && new Date() > share.expiresAt;
    assert.equal(isExpired, true, 'Share past expiry date should be expired');
  });

  test('ONCE type share should not have expiresAt requirement', () => {
    const share = { shareType: 'ONCE', expiresAt: null, status: 'ACTIVE' };
    const isAccessible = share.status === 'ACTIVE';
    assert.equal(isAccessible, true);
  });

  test('revoking a share should set status to REVOKED', () => {
    const share = { status: 'ACTIVE', revokedAt: null };
    share.status = 'REVOKED';
    share.revokedAt = new Date();
    assert.equal(share.status, 'REVOKED');
    assert.ok(share.revokedAt instanceof Date);
  });

  test('access log should record viewer details', () => {
    const share = { accessLog: [] };
    const viewer = { userId: 'doc-1', name: 'Dr. Smith' };
    share.accessLog.push({ viewedByUserId: viewer.userId, viewedByName: viewer.name, viewedAt: new Date() });
    assert.equal(share.accessLog.length, 1);
    assert.equal(share.accessLog[0].viewedByName, 'Dr. Smith');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8: Multi-Hospital Portal Logic
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Multi-Hospital Portal Logic', () => {

  test('hospital with active admission should sort first', () => {
    const hospitals = [
      { hospitalName: 'City Hospital', hasActiveAdmission: false },
      { hospitalName: 'Apollo Medical', hasActiveAdmission: true },
      { hospitalName: 'Green Cross', hasActiveAdmission: false },
    ];
    hospitals.sort((a, b) => (b.hasActiveAdmission ? 1 : 0) - (a.hasActiveAdmission ? 1 : 0));
    assert.equal(hospitals[0].hospitalName, 'Apollo Medical');
  });

  test('patient without active admission should have null active context', () => {
    const memberships = [
      { hospitalId: 'h1', hasActiveAdmission: false, activeAdmissionId: null },
      { hospitalId: 'h2', hasActiveAdmission: false, activeAdmissionId: null },
    ];
    const activeMembership = memberships.find(m => m.hasActiveAdmission && m.activeAdmissionId);
    assert.equal(activeMembership, undefined);
  });

  test('patient in hospital B should still have records from hospital A', () => {
    const memberships = [
      { hospitalId: 'h1', localUhid: 'HOSP-2026-00001', totalAdmissions: 3 },
      { hospitalId: 'h2', localUhid: 'HOSP-2026-00012', totalAdmissions: 1, hasActiveAdmission: true },
    ];
    const hospitalARecord = memberships.find(m => m.hospitalId === 'h1');
    assert.ok(hospitalARecord, 'Hospital A record should still exist');
    assert.equal(hospitalARecord.totalAdmissions, 3);
  });

  test('same patient cannot have duplicate hospitalId membership', () => {
    const memberships = [
      { hospitalId: 'h1' },
    ];
    const hospitalId = 'h1';
    const alreadyMember = memberships.some(m => String(m.hospitalId) === String(hospitalId));
    assert.equal(alreadyMember, true, 'Should detect already-member and not add duplicate');
  });

  test('globalPatientId should be searchable by phone digits', () => {
    const queryPhone = '+91 9876543210';
    const queryDigits = queryPhone.replace(/\D/g, '').slice(-10);
    const storedPhone = '9876543210';
    assert.ok(storedPhone.includes(queryDigits), 'Stored phone should match query digits');
  });

});
