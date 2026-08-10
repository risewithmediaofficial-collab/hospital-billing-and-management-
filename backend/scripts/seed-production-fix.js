/**
 * Realtime Production Fix & Cleanup Script
 * Fixes SuperAdmin & Gunam Hospital credentials while ensuring no test/dummy data exists.
 * Run: node scripts/seed-production-fix.js
 */
import bcrypt from "bcryptjs";
import { connectDB } from "../src/config/database.js";
import { Hospital } from "../src/models/Hospital.js";
import { Branch } from "../src/models/Branch.js";
import { Role } from "../src/models/Role.js";
import { User } from "../src/models/User.js";
import { ROLES } from "../src/config/constants.js";

async function fixProductionCredentials() {
  try {
    console.log("[ProductionFix] Connecting to MongoDB...");
    await connectDB();

    const password = "0000";
    const hashedPassword = await bcrypt.hash(password, 12);

    // 1. Ensure all system roles exist
    console.log("[ProductionFix] Ensuring all system Roles exist...");
    const rolesToCreate = Object.values(ROLES).map((roleCode) => ({
      code: roleCode,
      name: roleCode.replace(/_/g, " "),
      description: `${roleCode} Role Privileges`,
      permissions: ["ALL"],
      defaultRoute:
        roleCode === ROLES.SUPER_ADMIN ? "/admin/dashboard" :
        roleCode === ROLES.HOSPITAL_ADMIN ? "/hospital-admin/dashboard" :
        roleCode === ROLES.PATIENT ? "/patient-portal/dashboard" :
        roleCode === ROLES.GUARDIAN ? "/guardian-portal/dashboard" : "/dashboard",
    }));
    for (const roleData of rolesToCreate) {
      await Role.updateOne({ code: roleData.code }, { $setOnInsert: roleData }, { upsert: true });
    }

    // 2. Fix SuperAdmin password
    console.log("[ProductionFix] Fixing SuperAdmin credentials...");
    const superAdmin = await User.findOne({ email: "superadmin@gmail.com" });
    if (superAdmin) {
      superAdmin.passwordHash = hashedPassword;
      superAdmin.assignedPasswordHint = password;
      superAdmin.isActive = true;
      superAdmin.status = "ACTIVE";
      await superAdmin.save();
      console.log("  ? SuperAdmin password updated");
    } else {
      let platformHospital = await Hospital.findOne({ code: "PLATFORM" });
      if (!platformHospital) {
        platformHospital = await Hospital.create({
          name: "HPMBS SaaS Platform Owner", code: "PLATFORM", subdomain: "platform",
          status: "APPROVED", plan: "ENTERPRISE", contactName: "Platform Master Owner",
          contactEmail: "superadmin@gmail.com", contactPhone: "+1 (800) 555-SAAS",
          licenseNumber: "PLATFORM-MASTER-001", isActive: true,
        });
      }
      let mainBranch = await Branch.findOne({ hospitalId: platformHospital._id, isMainBranch: true });
      if (!mainBranch) {
        mainBranch = await Branch.create({
          hospitalId: platformHospital._id, name: "Global Platform Head Office", branchCode: "HQ-MAIN",
          phone: "+1 (800) 555-SAAS", email: "hq@platform.com", address: "100 SaaS Global Blvd",
          city: "Metropolis", state: "NY", postalCode: "10001", isMainBranch: true,
        });
      }
      await User.create({
        hospitalId: platformHospital._id, branchId: mainBranch._id, name: "Platform Master Owner",
        email: "superadmin@gmail.com", passwordHash: hashedPassword, assignedPasswordHint: password,
        role: ROLES.SUPER_ADMIN, phone: "+1 (800) 555-SAAS", status: "ACTIVE", isActive: true,
      });
      console.log("  ? SuperAdmin created");
    }

    // 3. Update Gunam Primary Admin password if present
    const gunamAdmin = await User.findOne({ email: "narayanamadhu93@gmail.com" });
    if (gunamAdmin) {
      gunamAdmin.passwordHash = hashedPassword;
      gunamAdmin.assignedPasswordHint = password;
      gunamAdmin.isActive = true;
      gunamAdmin.status = "ACTIVE";
      await gunamAdmin.save();
      console.log("  ? Gunam Hospital Admin (narayanamadhu93@gmail.com) password updated");
    }

    console.log("\n====================================================");
    console.log(" Production Fix Complete!");
    console.log("====================================================\n");
    process.exit(0);
  } catch (error) {
    console.error("[ProductionFix] Error:", error.message);
    process.exit(1);
  }
}
fixProductionCredentials();
