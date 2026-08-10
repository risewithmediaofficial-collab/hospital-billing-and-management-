import bcrypt from "bcryptjs";
import { Hospital } from "../models/Hospital.js";
import { Branch } from "../models/Branch.js";
import { Role } from "../models/Role.js";
import { User } from "../models/User.js";
import { ROLES } from "./constants.js";

export async function autoEnsureSystemCredentials() {
  try {
    const defaultPassword = "0000";
    const defaultHash = await bcrypt.hash(defaultPassword, 12);

    // 1. Ensure System Roles exist
    const rolesToCreate = Object.values(ROLES).map((roleCode) => {
      let defaultRoute = "/admin/dashboard";
      if (roleCode === ROLES.HOSPITAL_ADMIN) defaultRoute = "/hospital-admin/dashboard";
      else if (roleCode === ROLES.DOCTOR) defaultRoute = "/doctor/dashboard";
      else if (roleCode === ROLES.NURSE) defaultRoute = "/nursing/dashboard";
      else if (roleCode === ROLES.RECEPTIONIST) defaultRoute = "/reception/dashboard";
      else if (roleCode === ROLES.PATIENT) defaultRoute = "/patient-portal/dashboard";
      else if (roleCode === ROLES.GUARDIAN) defaultRoute = "/guardian-portal/dashboard";

      return {
        code: roleCode,
        name: roleCode.replace(/_/g, " "),
        description: `${roleCode} Role Privileges`,
        permissions: ["ALL"],
        defaultRoute,
      };
    });

    for (const roleData of rolesToCreate) {
      await Role.updateOne({ code: roleData.code }, { $setOnInsert: roleData }, { upsert: true });
    }

    // 2. Ensure Platform Owner Hospital & SuperAdmin
    let platformHospital = await Hospital.findOne({ code: "PLATFORM" });
    if (!platformHospital) {
      platformHospital = await Hospital.create({
        name: "HPMBS SaaS Platform Owner",
        code: "PLATFORM",
        domain: "platform",
        subdomain: "platform",
        status: "APPROVED",
        plan: "ENTERPRISE",
        contactName: "Platform Master Owner",
        contactEmail: "superadmin@gmail.com",
        contactPhone: "+1 (800) 555-SAAS",
        licenseNumber: "PLATFORM-MASTER-001",
        isActive: true,
      });
    } else if (!platformHospital.domain) {
      platformHospital.domain = "platform";
      await platformHospital.save();
    }

    let mainBranch = await Branch.findOne({ hospitalId: platformHospital._id, isMainBranch: true });
    if (!mainBranch) {
      mainBranch = await Branch.create({
        hospitalId: platformHospital._id,
        name: "Global Platform Head Office",
        branchCode: "HQ-MAIN",
        phone: "+1 (800) 555-SAAS",
        email: "hq@platform.com",
        address: "100 SaaS Global Blvd",
        city: "Metropolis",
        state: "NY",
        postalCode: "10001",
        isMainBranch: true,
      });
    }

    let superAdminUser = await User.findOne({ email: "superadmin@gmail.com" });
    if (!superAdminUser) {
      await User.create({
        hospitalId: platformHospital._id,
        branchId: mainBranch._id,
        name: "Platform Master Owner",
        email: "superadmin@gmail.com",
        passwordHash: defaultHash,
        assignedPasswordHint: defaultPassword,
        role: ROLES.SUPER_ADMIN,
        phone: "+1 (800) 555-SAAS",
        status: "ACTIVE",
        isActive: true,
      });
      console.log("[AutoSeed] ? Ensured SuperAdmin (superadmin@gmail.com / 0000)");
    } else if (!/^\$2[abxy]\$\d+\$/.test(superAdminUser.passwordHash)) {
      superAdminUser.passwordHash = defaultHash;
      superAdminUser.assignedPasswordHint = defaultPassword;
      await superAdminUser.save();
      console.log("[AutoSeed] ? Updated SuperAdmin password hash");
    }

    console.log("[AutoSeed] System roles & SuperAdmin check completed successfully");
  } catch (err) {
    console.error("[AutoSeed Warning] Failed system credentials check:", err.message);
  }
}
