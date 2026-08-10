/**
 * Production Fix Script
 * Ensures GUNAM Hospital & narayanamadhu93@gmail.com exist with password 1234
 * and SuperAdmin superadmin@gmail.com exists with password 0000.
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

    const superPassword = "0000";
    const superHash = await bcrypt.hash(superPassword, 12);

    const gunamPassword = "1234";
    const gunamHash = await bcrypt.hash(gunamPassword, 12);

    // 1. System Roles
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

    // 2. SuperAdmin
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
    let superAdmin = await User.findOne({ email: "superadmin@gmail.com" });
    if (!superAdmin) {
      await User.create({
        hospitalId: platformHospital._id, branchId: mainBranch._id, name: "Platform Master Owner",
        email: "superadmin@gmail.com", passwordHash: superHash, assignedPasswordHint: superPassword,
        role: ROLES.SUPER_ADMIN, phone: "+1 (800) 555-SAAS", status: "ACTIVE", isActive: true,
      });
      console.log("  ? SuperAdmin created (superadmin@gmail.com / 0000)");
    } else {
      superAdmin.passwordHash = superHash;
      superAdmin.assignedPasswordHint = superPassword;
      superAdmin.status = "ACTIVE";
      superAdmin.isActive = true;
      await superAdmin.save();
      console.log("  ? SuperAdmin password updated (0000)");
    }

    // 3. GUNAM Hospital & Admin
    let gunamHospital = await Hospital.findOne({
      $or: [
        { code: "GUNAMCOM" },
        { contactEmail: "narayanamadhu93@gmail.com" },
        { name: /gunam/i }
      ]
    });
    if (!gunamHospital) {
      gunamHospital = await Hospital.create({
        name: "GUNAM", code: "GUNAMCOM", subdomain: "gunam", status: "APPROVED",
        plan: "ENTERPRISE", contactName: "Madhu Narayan", contactEmail: "narayanamadhu93@gmail.com",
        contactPhone: "+91 9876543210", licenseNumber: "HOSP-GUNAM-001", isActive: true,
        address: { street: "Main Rd", city: "Chennai", state: "TN", country: "India" }
      });
      console.log("  ? GUNAM Hospital created (GUNAMCOM)");
    }
    let gunamBranch = await Branch.findOne({ hospitalId: gunamHospital._id, isMainBranch: true });
    if (!gunamBranch) {
      gunamBranch = await Branch.create({
        hospitalId: gunamHospital._id, name: "Gunam Main Campus", branchCode: "GUNAM-MAIN",
        phone: "+91 9876543210", email: "narayanamadhu93@gmail.com", address: "Main Rd",
        city: "Chennai", state: "TN", postalCode: "600001", isMainBranch: true,
      });
    }

    let gunamAdmin = await User.findOne({ email: "narayanamadhu93@gmail.com" });
    if (!gunamAdmin) {
      await User.create({
        hospitalId: gunamHospital._id, branchId: gunamBranch._id, name: "Madhu Narayan",
        email: "narayanamadhu93@gmail.com", passwordHash: gunamHash, assignedPasswordHint: gunamPassword,
        role: ROLES.HOSPITAL_ADMIN, phone: "+91 9876543210", status: "ACTIVE", isActive: true,
      });
      console.log("  ? Gunam Admin created (narayanamadhu93@gmail.com / 1234)");
    } else {
      gunamAdmin.hospitalId = gunamHospital._id;
      gunamAdmin.branchId = gunamBranch._id;
      gunamAdmin.passwordHash = gunamHash;
      gunamAdmin.assignedPasswordHint = gunamPassword;
      gunamAdmin.status = "ACTIVE";
      gunamAdmin.isActive = true;
      await gunamAdmin.save();
      console.log("  ? Gunam Admin password updated (narayanamadhu93@gmail.com / 1234)");
    }

    console.log("\n====================================================");
    console.log(" Production Fix & Gunam Provisioning Complete!");
    console.log(" SuperAdmin:   superadmin@gmail.com  / 0000");
    console.log(" Gunam Admin:  narayanamadhu93@gmail.com / 1234");
    console.log("====================================================\n");
    process.exit(0);
  } catch (error) {
    console.error("[ProductionFix] Error:", error.message);
    process.exit(1);
  }
}
fixProductionCredentials();
