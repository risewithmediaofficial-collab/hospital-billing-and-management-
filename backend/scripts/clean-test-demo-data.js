/**
 * Production Complete Database Cleanup Tool
 * Purges ALL test/demo/generated hospitals, staff, patients, appointments, and associated records.
 * PRESERVES ONLY the Platform Master SuperAdmin (superadmin@gmail.com) and System Roles.
 *
 * Run: node scripts/clean-test-demo-data.js
 */
import mongoose from "mongoose";
import { connectDB } from "../src/config/database.js";
import { Hospital } from "../src/models/Hospital.js";
import { Branch } from "../src/models/Branch.js";
import { User } from "../src/models/User.js";
import { Patient } from "../src/models/Patient.js";
import { Appointment } from "../src/models/Appointment.js";
import { autoEnsureSystemCredentials } from "../src/config/autoSeed.js";

async function cleanAllTestData() {
  try {
    console.log("\n====================================================");
    console.log(" ?? Production Database Deep Cleanup Tool");
    console.log("====================================================\n");

    await connectDB();
    await autoEnsureSystemCredentials();

    const platformHospital = await Hospital.findOne({ code: "PLATFORM" });
    const superAdminUser = await User.findOne({ email: "superadmin@gmail.com" });

    if (!platformHospital || !superAdminUser) {
      console.error("? Failed to preserve Platform SuperAdmin! Aborting.");
      process.exit(1);
    }

    console.log(`???  Preserving Platform SuperAdmin:`);
    console.log(`   - Hospital: ${platformHospital.name} (${platformHospital._id})`);
    console.log(`   - User: ${superAdminUser.name} <${superAdminUser.email}> (${superAdminUser._id})`);

    // 1. Delete all non-Platform Hospitals
    const deletedHospitals = await Hospital.deleteMany({ _id: { $ne: platformHospital._id } });
    console.log(`\n???  Deleted Client Hospitals: ${deletedHospitals.deletedCount}`);

    // 2. Delete all non-SuperAdmin Users
    const deletedUsers = await User.deleteMany({ _id: { $ne: superAdminUser._id } });
    console.log(`???  Deleted Client Users / Staff: ${deletedUsers.deletedCount}`);

    // 3. Delete all Non-Platform Branches
    const mainBranch = await Branch.findOne({ hospitalId: platformHospital._id, isMainBranch: true });
    const deletedBranches = await Branch.deleteMany({
      _id: { $ne: mainBranch?._id }
    });
    console.log(`???  Deleted Branches: ${deletedBranches.deletedCount}`);

    // 4. Delete all Patients & Appointments
    const deletedPatients = await Patient.deleteMany({});
    const deletedAppointments = await Appointment.deleteMany({});
    console.log(`???  Deleted Patients: ${deletedPatients.deletedCount}`);
    console.log(`???  Deleted Appointments: ${deletedAppointments.deletedCount}`);

    // 5. Clean up other collections if they exist dynamically
    const collectionsToClear = [
      'admissions', 'emergencies', 'guardianlinks', 'globalpatients',
      'invoices', 'payments', 'prescriptions', 'pharmacytransactions',
      'labrequests', 'labresults', 'radiologyrequests', 'radiologyresults',
      'notifications', 'auditlogs', 'careteamassignments', 'medicalrecordshares'
    ];

    for (const collName of collectionsToClear) {
      try {
        if (mongoose.connection.collections[collName]) {
          const res = await mongoose.connection.collections[collName].deleteMany({});
          if (res.deletedCount > 0) {
            console.log(`???  Deleted ${collName}: ${res.deletedCount}`);
          }
        }
      } catch (e) {
        // collection might not exist
      }
    }

    console.log("\n====================================================");
    console.log(" ? DATABASE CLEANUP COMPLETE!");
    console.log(" Platform SuperAdmin is active and ready for fresh hospital registrations.");
    console.log(" Email: superadmin@gmail.com / Password: 0000");
    console.log("====================================================\n");

    process.exit(0);
  } catch (err) {
    console.error("? Cleanup error:", err);
    process.exit(1);
  }
}

cleanAllTestData();
