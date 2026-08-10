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

    const gunamPassword = "1234";
    const gunamHash = await bcrypt.hash(gunamPassword, 12);

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
        subdomain: "platform",
        status: "APPROVED",
        plan: "ENTERPRISE",
        contactName: "Platform Master Owner",
        contactEmail: "superadmin@gmail.com",
        contactPhone: "+1 (800) 555-SAAS",
        licenseNumber: "PLATFORM-MASTER-001",
        isActive: true,
      });
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
      console.log("[AutoSeed] ? Created SuperAdmin (superadmin@gmail.com / 0000)");
    } else if (!/^\$2[abxy]\$\d+\$/.test(superAdminUser.passwordHash)) {
      superAdminUser.passwordHash = defaultHash;
      superAdminUser.assignedPasswordHint = defaultPassword;
      await superAdminUser.save();
      console.log("[AutoSeed] ? Updated SuperAdmin password hash");
    }

    // 3. Ensure GUNAM Hospital & Gunam Primary Admin (narayanamadhu93@gmail.com / 1234)
    let gunamHospital = await Hospital.findOne({
      $or: [
        { code: "GUNAMCOM" },
        { contactEmail: "narayanamadhu93@gmail.com" },
        { name: /gunam/i }
      ]
    });

    if (!gunamHospital) {
      gunamHospital = await Hospital.create({
        name: "GUNAM",
        code: "GUNAMCOM",
        subdomain: "gunam",
        status: "APPROVED",
        plan: "ENTERPRISE",
        contactName: "Madhu Narayan",
        contactEmail: "narayanamadhu93@gmail.com",
        contactPhone: "+91 9876543210",
        licenseNumber: "HOSP-GUNAM-001",
        address: { street: "Main Rd", city: "Chennai", state: "TN", country: "India" },
        isActive: true,
      });
      console.log("[AutoSeed] ? Created GUNAM Hospital (GUNAMCOM)");
    }

    let gunamBranch = await Branch.findOne({ hospitalId: gunamHospital._id, isMainBranch: true });
    if (!gunamBranch) {
      gunamBranch = await Branch.create({
        hospitalId: gunamHospital._id,
        name: "Gunam Main Campus",
        branchCode: "GUNAM-MAIN",
        phone: "+91 9876543210",
        email: "narayanamadhu93@gmail.com",
        address: "Main Rd",
        city: "Chennai",
        state: "TN",
        postalCode: "600001",
        isMainBranch: true,
      });
    }

    let gunamAdmin = await User.findOne({ email: "narayanamadhu93@gmail.com" });
    if (!gunamAdmin) {
      await User.create({
        hospitalId: gunamHospital._id,
        branchId: gunamBranch._id,
        name: "Madhu Narayan",
        email: "narayanamadhu93@gmail.com",
        passwordHash: gunamHash,
        assignedPasswordHint: gunamPassword,
        role: ROLES.HOSPITAL_ADMIN,
        phone: "+91 9876543210",
        status: "ACTIVE",
        isActive: true,
      });
      console.log("[AutoSeed] ? Created Gunam Admin (narayanamadhu93@gmail.com / 1234)");
    } else {
      gunamAdmin.hospitalId = gunamHospital._id;
      gunamAdmin.branchId = gunamBranch._id;
      gunamAdmin.passwordHash = gunamHash;
      gunamAdmin.assignedPasswordHint = gunamPassword;
      gunamAdmin.status = "ACTIVE";
      gunamAdmin.isActive = true;
      await gunamAdmin.save();
      console.log("[AutoSeed] ? Ensured Gunam Admin credentials (narayanamadhu93@gmail.com / 1234)");
    }

    console.log("[AutoSeed] System credentials check completed successfully");
  } catch (err) {
    console.error("[AutoSeed Warning] Failed system credentials check:", err.message);
  }
}
