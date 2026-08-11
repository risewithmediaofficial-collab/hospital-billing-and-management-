import { connectDB } from "../src/config/database.js";
import { Hospital } from "../src/models/Hospital.js";
import { User } from "../src/models/User.js";
import { ensureTestHospitalCredentials } from "./seed-production-test-hospital.js";
import { autoEnsureSystemCredentials } from "../src/config/autoSeed.js";

export async function cleanupSeededData() {
  console.log("==================================================");
  console.log("🧹 Starting Seeded Data Cleanup...");
  console.log("==================================================");

  await connectDB();

  // Ensure system credentials & Test Hospital baseline exist first
  await autoEnsureSystemCredentials();

  // Find all hospitals
  const allHospitals = await Hospital.find({});
  console.log(`[Cleanup] Found ${allHospitals.length} total hospital record(s) in database.`);

  const keptHospitalIds = [];
  const deletedHospitals = [];

  for (const hosp of allHospitals) {
    const isTestHospital = hosp.code === 'TESTHOSPITAL' || hosp.domain === 'testhospital' || hosp.contactEmail === 'testhospital@gmail.com';
    const isPlatformHospital = hosp.code === 'PLATFORM' || hosp.domain === 'platform' || hosp.contactEmail === 'superadmin@gmail.com';

    if (isTestHospital || isPlatformHospital) {
      keptHospitalIds.push(hosp._id.toString());
      console.log(`  ✅ KEPT: ${hosp.name} (Code: ${hosp.code}, Domain: ${hosp.domain})`);
    } else {
      deletedHospitals.push(hosp);
    }
  }

  const collections = [
    'Branch',
    'Department',
    'User',
    'Patient',
    'Appointment',
    'Consultation',
    'Prescription',
    'Invoice',
    'Receipt',
    'DiagnosticOrder',
    'Bed',
    'Emergency',
    'NurseTask',
    'PatientRequest',
    'AuditLog',
    'Notification',
    'Medicine',
    'MedicineBatch',
    'GuardianLink',
    'DoctorUpdate',
    'Admission',
    'GlobalPatient',
  ];

  const mongoose = (await import('mongoose')).default;

  for (const targetHosp of deletedHospitals) {
    console.log(`  🗑️ DELETING: ${targetHosp.name} (Code: ${targetHosp.code}, ID: ${targetHosp._id})...`);
    const hospitalId = targetHosp._id;

    for (const colName of collections) {
      try {
        if (mongoose.models[colName]) {
          const res = await mongoose.models[colName].deleteMany({ hospitalId });
          if (res.deletedCount > 0) {
            console.log(`     -> Wiped ${res.deletedCount} record(s) from ${colName}`);
          }
        }
      } catch (err) {
        console.error(`     ⚠️ Error deleting from ${colName}:`, err.message);
      }
    }

    // Delete users associated with this hospital (except SuperAdmin)
    const userRes = await User.deleteMany({
      hospitalId,
      email: { $ne: 'superadmin@gmail.com' },
    });
    if (userRes.deletedCount > 0) {
      console.log(`     -> Wiped ${userRes.deletedCount} user(s) from User collection`);
    }

    // Finally delete the Hospital document itself
    await Hospital.findByIdAndDelete(hospitalId);
    console.log(`  ✅ Successfully deleted hospital '${targetHosp.name}'!`);
  }

  // Delete orphaned non-superadmin users not attached to any kept hospital
  const orphanedUsersRes = await User.deleteMany({
    hospitalId: { $nin: keptHospitalIds },
    email: { $ne: 'superadmin@gmail.com' },
  });
  if (orphanedUsersRes.deletedCount > 0) {
    console.log(`[Cleanup] Wiped ${orphanedUsersRes.deletedCount} orphaned user record(s).`);
  }

  // Re-run system credentials seed to ensure clean state
  await autoEnsureSystemCredentials();

  console.log("==================================================");
  console.log("🎉 Cleanup Complete!");
  console.log("   Only 'Test Hospital' & 'SuperAdmin' remain in system.");
  console.log("==================================================");
}

if (process.argv[1] && process.argv[1].endsWith("cleanup-seeded-data.js")) {
  cleanupSeededData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Cleanup error:", err);
      process.exit(1);
    });
}
