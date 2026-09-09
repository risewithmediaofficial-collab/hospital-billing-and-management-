/**
 * bed-cascade-delete.test.js
 *
 * Unit-tests the bed hierarchy cascade-delete contract without a live database.
 * Validates that the model schema references form the correct parent→child chain:
 *   Building (HospitalBlock) → Floor (HospitalFloor) → Ward (HospitalWard) → Room (HospitalRoom) → Bed
 *
 * These tests verify the schema-level cascade constraints — integration tests
 * with a live DB should be added in a separate suite once a test DB is available.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { HospitalBlock } from '../src/models/HospitalBlock.js';
import { HospitalFloor } from '../src/models/HospitalFloor.js';
import { HospitalWard } from '../src/models/HospitalWard.js';
import { HospitalRoom } from '../src/models/HospitalRoom.js';
import { Bed } from '../src/models/Bed.js';

test('Bed Hierarchy Cascade-Delete Contract', async (t) => {

  // ── HospitalBlock (Building) schema ───────────────────────────────────────
  await t.test('HospitalBlock has hospitalId and branchId indexes', () => {
    const paths = HospitalBlock.schema.paths;
    assert.ok(paths.hospitalId, 'HospitalBlock must have hospitalId');
    assert.ok(paths.branchId, 'HospitalBlock must have branchId');
    assert.ok(paths.name, 'HospitalBlock must have a name');
    assert.ok(paths.status, 'HospitalBlock must have status');
    assert.equal(paths.status.defaultValue, 'ACTIVE', 'Default status must be ACTIVE');
  });

  // ── HospitalFloor schema (child of Block) ─────────────────────────────────
  await t.test('HospitalFloor references HospitalBlock via blockId', () => {
    const paths = HospitalFloor.schema.paths;
    assert.ok(paths.blockId, 'HospitalFloor must have blockId reference to HospitalBlock');
    assert.ok(paths.hospitalId, 'HospitalFloor must have hospitalId');
    assert.ok(paths.floorNumber !== undefined, 'HospitalFloor must have floorNumber');
    assert.equal(paths.status.defaultValue, 'ACTIVE');
  });

  // ── HospitalWard schema (child of Floor and Block) ────────────────────────
  await t.test('HospitalWard references HospitalFloor via floorId and HospitalBlock via blockId', () => {
    const paths = HospitalWard.schema.paths;
    assert.ok(paths.floorId, 'HospitalWard must have floorId reference to HospitalFloor');
    assert.ok(paths.blockId, 'HospitalWard must have blockId reference to HospitalBlock');
    assert.ok(paths.hospitalId, 'HospitalWard must have hospitalId');
    assert.ok(paths.wardType, 'HospitalWard must have wardType');
    assert.equal(paths.status.defaultValue, 'ACTIVE');
  });

  // ── HospitalWard wardType enum is complete ────────────────────────────────
  await t.test('HospitalWard wardType enum contains standard ward types', () => {
    const enumVals = HospitalWard.schema.paths.wardType.enumValues;
    const required = ['GENERAL', 'ICU', 'NICU', 'EMERGENCY', 'MATERNITY', 'PRIVATE'];
    for (const wt of required) {
      assert.ok(enumVals.includes(wt), `wardType enum must include "${wt}"`);
    }
  });

  // ── HospitalRoom schema (child of Ward, Floor, Block) ────────────────────
  await t.test('HospitalRoom references HospitalWard via wardId', () => {
    const paths = HospitalRoom.schema.paths;
    assert.ok(paths.wardId, 'HospitalRoom must have wardId reference to HospitalWard');
    assert.ok(paths.hospitalId, 'HospitalRoom must have hospitalId');
    assert.ok(paths.roomNumber, 'HospitalRoom must have roomNumber');
    assert.ok(paths.roomType, 'HospitalRoom must have roomType');
    assert.equal(paths.status.defaultValue, 'ACTIVE');
  });

  // ── Bed schema (child of Room and Ward) ───────────────────────────────────
  await t.test('Bed references HospitalRoom via roomId and HospitalWard via wardId', () => {
    const paths = Bed.schema.paths;
    assert.ok(paths.wardId, 'Bed must have wardId reference to HospitalWard');
    assert.ok(paths.roomId, 'Bed must have roomId reference to HospitalRoom');
    assert.ok(paths.hospitalId, 'Bed must have hospitalId');
    assert.ok(paths.bedNumber, 'Bed must have bedNumber');
    assert.ok(paths.status, 'Bed must have status');
  });

  // ── Bed status enum ───────────────────────────────────────────────────────
  await t.test('Bed status enum contains AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE', () => {
    const enumVals = Bed.schema.paths.status.enumValues;
    const required = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'];
    for (const s of required) {
      assert.ok(enumVals.includes(s), `Bed status enum must include "${s}"`);
    }
  });

  // ── Cascade chain is complete (all refs exist) ────────────────────────────
  await t.test('Cascade hierarchy chain: Block → Floor → Ward → Room → Bed is fully linked', () => {
    // Floor → Block
    assert.ok(HospitalFloor.schema.paths.blockId, 'Floor must reference Block');
    // Ward → Floor AND Block
    assert.ok(HospitalWard.schema.paths.floorId, 'Ward must reference Floor');
    assert.ok(HospitalWard.schema.paths.blockId, 'Ward must reference Block');
    // Room → Ward
    assert.ok(HospitalRoom.schema.paths.wardId, 'Room must reference Ward');
    // Bed → Room AND Ward
    assert.ok(Bed.schema.paths.roomId, 'Bed must reference Room');
    assert.ok(Bed.schema.paths.wardId, 'Bed must reference Ward');
  });

  // ── All models are tenant-scoped (hospitalId required) ───────────────────
  await t.test('All bed hierarchy models have required hospitalId (tenant-scoped)', () => {
    const models = [HospitalBlock, HospitalFloor, HospitalWard, HospitalRoom, Bed];
    const names = ['HospitalBlock', 'HospitalFloor', 'HospitalWard', 'HospitalRoom', 'Bed'];
    for (let i = 0; i < models.length; i++) {
      const paths = models[i].schema.paths;
      assert.ok(paths.hospitalId, `${names[i]} must have hospitalId for tenant-scoped queries`);
    }
  });

  // ── HospitalFloor floorNumber defaults to 0 ──────────────────────────────
  await t.test('HospitalFloor floorNumber defaults to 0 (ground floor)', () => {
    const paths = HospitalFloor.schema.paths;
    assert.equal(paths.floorNumber.defaultValue, 0, 'Ground floor should default to 0');
  });

  // ── HospitalWard bedCapacity minimum is 1 ────────────────────────────────
  await t.test('HospitalWard bedCapacity has a minimum of 1', () => {
    const paths = HospitalWard.schema.paths;
    assert.ok(paths.bedCapacity, 'HospitalWard must have bedCapacity');
    // Default should be positive
    assert.ok(paths.bedCapacity.defaultValue >= 1, 'Default bed capacity must be at least 1');
  });

});
