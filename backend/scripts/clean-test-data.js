/**
 * Production Cleanup Script
 * Cleans up sample/test seed data (City General, St. Jude, Postman test entries)
 * while PRESERVING Gunam Hospital (GUNAMCOM / narayanamadhu93@gmail.com) and SuperAdmin.
 *
 * Run: node scripts/clean-test-data.js
 */
import mongoose from "mongoose";
import { connectDB } from "../src/config/database.js";
import { Hospital } from "../src/models/Hospital.js";
import { Branch } from "../src/models/Branch.js";
import { User } from "../src/models/User.js";
import { Patient } from "../src/models/Patient.js";
import { Appointment } from "../src/models/Appointment.js";

async function cleanTestData() {
  try {
    console.log("\n====================================================");
    console.log(" ?? Production Database Cleanup Tool");
    console.log("====================================================\n");

    await connectDB();

    // 1. Identify Protected Hospitals
    const platformHospital = await Hospital.findOne({ code: "PLATFORM" });
    const gunamHospital = await Hospital.findOne({
      $or: [
        { _id: new mongoose.Types.ObjectId("6a7303307bf6527ae87cc7bd") },
        { code: "GUNAMCOM" },
        { contactEmail: "narayanamadhu93@gmail.com" },
        { name: /gunam/i }
      ]
    });

    const protectedHospitalIds = [
      platformHospital?._id,
      gunamHospital?._id
    ].filter(Boolean);

    console.log("???  Protected Hospitals:");
    if (platformHospital) console.log(`   - Platform Owner: ${platformHospital.name} (${platformHospital._id})`);
    if (gunamHospital) console.log(`   - Gunam Hospital: ${gunamHospital.name} [GUNAMCOM] (${gunamHospital._id})`);
    else console.log("   - Gunam Hospital not yet registered in this environment.");

    // 2. Identify Test Hospitals to Delete
    const testHospitals = await Hospital.find({
      _id: { $nin: protectedHospitalIds },
      $or: [
        { code: { $in: ["CITYGEN", "STJUDE"] } },
        { name: /postman|test|city general|st\. jude/i },
        { contactEmail: /postman|test|citygeneral|stjude/i }
      ]
    });

    const testHospitalIds = testHospitals.map(h => h._id);

    console.log(`\n???  Test Hospitals identified for removal (${testHospitals.length}):`);
    testHospitals.forEach(h => console.log(`   - ${h.name} (${h.code || h._id})`));

    // 3. Delete Test Data
    if (testHospitalIds.length > 0) {
      const deletedBranches = await Branch.deleteMany({ hospitalId: { $in: testHospitalIds } });
      const deletedPatients = await Patient.deleteMany({ hospitalId: { $in: testHospitalIds } });
      const deletedAppointments = await Appointment.deleteMany({ hospitalId: { $in: testHospitalIds } });
      const deletedTestHospitals = await Hospital.deleteMany({ _id: { $in: testHospitalIds } });

      console.log(`\n? Removed test hospital records:`);
      console.log(`   - Hospitals removed:    ${deletedTestHospitals.deletedCount}`);
      console.log(`   - Branches removed:     ${deletedBranches.deletedCount}`);
      console.log(`   - Patients removed:     ${deletedPatients.deletedCount}`);
      console.log(`   - Appointments removed: ${deletedAppointments.deletedCount}`);
    }

    // 4. Clean up Test Users
    const deletedTestUsers = await User.deleteMany({
      email: {
        $in: [
          "admin@citygeneral.com",
          "madhu@gmail.com",
          "satish@gmail.com",
          "hari@gmail.com",
          "admin@stjude.com"
        ]
      }
    });

    const deletedPostmanUsers = await User.deleteMany({
      email: /postman|test.*hospital\.com|guardian\.local/i,
      email: { $ne: "superadmin@gmail.com" }
    });

    console.log(`\n? Removed test user accounts:`);
    console.log(`   - Sample seed users removed: ${deletedTestUsers.deletedCount}`);
    console.log(`   - Postman test users removed: ${deletedPostmanUsers.deletedCount}`);

    // 5. Verify Active System Users
    const remainingUsers = await User.find({}).select("name email role hospitalId").lean();
    console.log(`\n====================================================`);
    console.log(` ? CLEANUP COMPLETED! Remaining Active Accounts (${remainingUsers.length}):`);
    console.log(`====================================================`);
    remainingUsers.forEach(u => {
      console.log(` - [${u.role}] ${u.name} <${u.email}>`);
    });
    console.log(`====================================================\n`);

    process.exit(0);
  } catch (err) {
    console.error("? Cleanup failed:", err);
    process.exit(1);
  }
}

cleanTestData();
