/**
 * Production Fix Script
 * Fixes Hospital Admin login credentials in production without wiping data.
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
      // Find or create platform hospital
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

    // 3. Fix or Create Hospital Admin (City General)
    console.log("[ProductionFix] Fixing Hospital Admin credentials...");
    let cityHospital = await Hospital.findOne({ code: "CITYGEN" });
    if (!cityHospital) {
      cityHospital = await Hospital.create({
        name: "City General Hospital", code: "CITYGEN", subdomain: "citygen",
        status: "APPROVED", plan: "ENTERPRISE", contactName: "Dr. Robert Vance",
        contactEmail: "admin@citygeneral.com", contactPhone: "+1 (555) 234-5678",
        licenseNumber: "HOSP-NY-88402", isActive: true,
        address: { street: "500 Health Way", city: "New York", state: "NY", country: "USA" },
      });
      console.log("  ? City General Hospital created");
    }
    let cityBranch = await Branch.findOne({ hospitalId: cityHospital._id, isMainBranch: true });
    if (!cityBranch) {
      cityBranch = await Branch.create({
        hospitalId: cityHospital._id, name: "City General Main Campus", branchCode: "CG-MAIN",
        phone: "+1 (555) 234-5678", email: "main@citygeneral.com", address: "500 Health Way",
        city: "New York", state: "NY", postalCode: "10002", isMainBranch: true,
      });
    }
    const hospitalAdmin = await User.findOne({ email: "admin@citygeneral.com" });
    if (hospitalAdmin) {
      hospitalAdmin.passwordHash = hashedPassword;
      hospitalAdmin.assignedPasswordHint = password;
      hospitalAdmin.isActive = true;
      hospitalAdmin.status = "ACTIVE";
      await hospitalAdmin.save();
      console.log("  ? Hospital Admin password updated");
    } else {
      await User.create({
        hospitalId: cityHospital._id, branchId: cityBranch._id, name: "Dr. Robert Vance",
        email: "admin@citygeneral.com", passwordHash: hashedPassword, assignedPasswordHint: password,
        role: ROLES.HOSPITAL_ADMIN, phone: "+1 (555) 234-5678", status: "ACTIVE", isActive: true,
      });
      console.log("  ? Hospital Admin created");
    }

    console.log("\n====================================================");
    console.log(" Production Fix Complete!");
    console.log("====================================================");
    console.log(" SuperAdmin:       superadmin@gmail.com  / 0000");
    console.log(" Hospital Admin:   admin@citygeneral.com / 0000");
    console.log("====================================================\n");
    process.exit(0);
  } catch (error) {
    console.error("[ProductionFix] Error:", error.message);
    process.exit(1);
  }
}
fixProductionCredentials();
