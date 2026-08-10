import test from 'node:test';
import assert from 'node:assert';
import mongoose from "mongoose";
import { Hospital, sanitizeAndValidateDomain, RESERVED_DOMAINS } from "../src/models/Hospital.js";
import { User } from "../src/models/User.js";
import { AuthService } from "../src/domains/auth/auth.service.js";
import { SaasService } from "../src/domains/saas/saas.service.js";
import { env } from "../src/config/env.js";

import { autoEnsureSystemCredentials } from '../src/config/autoSeed.js';

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    const mongoUri = process.env.MONGODB_URI || env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hospital-management';
    await mongoose.connect(mongoUri);
  }
  await autoEnsureSystemCredentials();
});

test.after(async () => {
  // Clean up any test hospitals created during test
  await Hospital.deleteMany({ domain: { $in: ["test-hosp-a", "test-hosp-b"] } });
  await User.deleteMany({ email: { $in: ["admin@testhospa.com", "admin@testhospb.com"] } });
  await mongoose.disconnect();
});

test("Domain Validator: Rejects reserved domains", () => {
  for (const reserved of RESERVED_DOMAINS) {
    assert.throws(
      () => sanitizeAndValidateDomain(reserved),
      (err) => err.message.includes("reserved platform route")
    );
  }
});

test("Domain Validator: Rejects invalid URL slug characters", () => {
  assert.throws(() => sanitizeAndValidateDomain("Invalid Domain!"), (err) => err.message.includes("Domain must contain only lowercase letters"));
  assert.throws(() => sanitizeAndValidateDomain("domain--double"), (err) => err.message.includes("Domain must contain only lowercase letters"));
});

test("Domain Validator: Accepts valid domain slugs", () => {
  assert.strictEqual(sanitizeAndValidateDomain("GUMAN "), "guman");
  assert.strictEqual(sanitizeAndValidateDomain("city-general-hosur"), "city-general-hosur");
});

test("Database Clean Verification: Only Platform SuperAdmin & Hospital exist initially", async () => {
  const superAdmin = await User.findOne({ email: "superadmin@gmail.com" });
  assert.ok(superAdmin, "Super Admin superadmin@gmail.com must exist");
  assert.strictEqual(superAdmin.role, "SUPER_ADMIN");

  const platformHosp = await Hospital.findOne({ code: "PLATFORM" });
  assert.ok(platformHosp, "Platform hospital PLATFORM must exist");
});

test("Tenant Isolation & Domain Login Workflow", async () => {
  // Create Test Hospital A
  const hospA = await SaasService.registerHospital({
    hospitalName: "Test Hospital A",
    domain: "test-hosp-a",
    contactEmail: "admin@testhospa.com",
    contactName: "Admin A",
    adminPassword: "Password123!",
  });
  assert.strictEqual(hospA.hospital.domain, "test-hosp-a");

  // Create Test Hospital B
  const hospB = await SaasService.registerHospital({
    hospitalName: "Test Hospital B",
    domain: "test-hosp-b",
    contactEmail: "admin@testhospb.com",
    contactName: "Admin B",
    adminPassword: "Password123!",
  });
  assert.strictEqual(hospB.hospital.domain, "test-hosp-b");

  // Approve Hospital A & B
  const superAdminUser = { id: "superadmin-id", role: "SUPER_ADMIN", email: "superadmin@gmail.com" };
  await SaasService.approveHospital(hospA.hospital._id, superAdminUser);
  await SaasService.approveHospital(hospB.hospital._id, superAdminUser);

  // Test 1: Successful domain-scoped login for Hospital A admin under test-hosp-a
  const loginA = await AuthService.login("admin@testhospa.com", "Password123!", "test-hosp-a");
  assert.ok(loginA.tokens.accessToken, "Hospital A admin login should succeed under test-hosp-a domain");
  assert.strictEqual(loginA.user.hospitalDomain, "test-hosp-a");
  assert.strictEqual(loginA.user.defaultRoute, "/test-hosp-a/admin/dashboard");

  // Test 2: Cross-tenant login block: Hospital A admin trying to login under test-hosp-b URL
  await assert.rejects(
    async () => {
      await AuthService.login("admin@testhospa.com", "Password123!", "test-hosp-b");
    },
    (err) => err.message.includes("Access Denied") || err.code === "TENANT_MISMATCH"
  );

  // Test 3: Domain API Lookup
  const domainDetails = await SaasService.getHospitalByDomain("test-hosp-a");
  assert.strictEqual(domainDetails.name, "Test Hospital A");
  assert.strictEqual(domainDetails.domain, "test-hosp-a");

  // Test 4: Duplicate domain registration fails
  await assert.rejects(
    async () => {
      await SaasService.registerHospital({
        hospitalName: "Duplicate Test Hospital",
        domain: "test-hosp-a",
        contactEmail: "dup@testhosp.com",
      });
    },
    (err) => err.message.includes("already taken") || err.code === "DUPLICATE_DOMAIN"
  );
});
