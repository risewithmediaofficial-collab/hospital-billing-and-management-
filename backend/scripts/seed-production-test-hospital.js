import bcrypt from "bcryptjs";
import { connectDB } from "../src/config/database.js";
import { Hospital } from "../src/models/Hospital.js";
import { Branch } from "../src/models/Branch.js";
import { User } from "../src/models/User.js";
import { Patient } from "../src/models/Patient.js";
import { ROLES } from "../src/config/constants.js";

export async function ensureTestHospitalCredentials() {
  const defaultPassword = "0000";
  const defaultHash = await bcrypt.hash(defaultPassword, 12);

  // 1. Create or Update Test Hospital
  let hospital = await Hospital.findOne({
    $or: [{ domain: "testhospital" }, { code: "TESTHOSPITAL" }, { contactEmail: "testhospital@gmail.com" }]
  });

  if (!hospital) {
    hospital = await Hospital.create({
      name: "Test Hospital",
      code: "TESTHOSPITAL",
      domain: "testhospital",
      subdomain: "testhospital",
      status: "APPROVED",
      plan: "UNLIMITED",
      contactName: "Test Hospital Admin",
      contactEmail: "testhospital@gmail.com",
      contactPhone: "638040927",
      licenseNumber: "LIC-TEST-001",
      isActive: true,
      address: {
        street: "123 Medical Center Way",
        city: "Test City",
        state: "TS",
        country: "India"
      }
    });
    console.log("  [Seed] Created Test Hospital (domain: testhospital)");
  } else {
    hospital.domain = "testhospital";
    hospital.subdomain = "testhospital";
    hospital.status = "APPROVED";
    hospital.isActive = true;
    await hospital.save();
    console.log("  [Seed] Updated Test Hospital (domain: testhospital)");
  }

  // 2. Create or Update Main Branch
  let branch = await Branch.findOne({ hospitalId: hospital._id, isMainBranch: true });
  if (!branch) {
    branch = await Branch.create({
      hospitalId: hospital._id,
      name: "Test Hospital Main Campus",
      branchCode: "TEST-MAIN",
      phone: "638040927",
      email: "testhospital@gmail.com",
      address: "123 Medical Center Way",
      city: "Test City",
      state: "TS",
      postalCode: "600001",
      isMainBranch: true,
    });
  }

  // 3. Staff Accounts (Password: 0000)
  const staffList = [
    { email: "testhospital@gmail.com", name: "Test Hospital Admin", role: ROLES.HOSPITAL_ADMIN },
    { email: "testadmin@gmail.com", name: "Test Admin", role: ROLES.HOSPITAL_ADMIN },
    { email: "testdoctor@gmail.com", name: "Dr. Test Doctor", role: ROLES.DOCTOR },
    { email: "testnurse@gmail.com", name: "Test Nurse", role: ROLES.NURSE },
    { email: "testnurseic@gmail.com", name: "Test Nurse Incharge", role: ROLES.NURSE_INCHARGE },
    { email: "testreception@gmail.com", name: "Test Receptionist", role: ROLES.RECEPTIONIST },
    { email: "testpharmacy@gmail.com", name: "Test Pharmacist", role: ROLES.PHARMACIST },
    { email: "testlab@gmail.com", name: "Test Lab Tech", role: ROLES.LAB_TECH },
    { email: "testradiology@gmail.com", name: "Test Radiologist", role: ROLES.RADIOLOGIST },
    { email: "testbilling@gmail.com", name: "Test Cashier", role: ROLES.CASHIER },
  ];

  for (const staff of staffList) {
    let user = await User.findOne({ email: staff.email });
    if (!user) {
      await User.create({
        hospitalId: hospital._id,
        branchId: branch._id,
        name: staff.name,
        email: staff.email,
        passwordHash: defaultHash,
        assignedPasswordHint: defaultPassword,
        role: staff.role,
        phone: "638040927",
        status: "ACTIVE",
        isActive: true,
      });
      console.log(`  [Seed] Created User: ${staff.email} (${staff.role})`);
    } else {
      user.hospitalId = hospital._id;
      user.branchId = branch._id;
      user.passwordHash = defaultHash;
      user.assignedPasswordHint = defaultPassword;
      user.role = staff.role;
      user.status = "ACTIVE";
      user.isActive = true;
      await user.save();
      console.log(`  [Seed] Updated User: ${staff.email} (${staff.role})`);
    }
  }

  // 4. Patient Record (Mobile: 638040927, DOB: 10-11-2004)
  let patient = await Patient.findOne({ hospitalId: hospital._id, uhid: "TH-P-1001" });
  if (!patient) {
    patient = await Patient.findOne({ phone: "638040927" });
  }

  const patientDob = new Date("2004-11-10");

  if (!patient) {
    patient = await Patient.create({
      hospitalId: hospital._id,
      branchId: branch._id,
      uhid: "TH-P-1001",
      firstName: "Test",
      lastName: "Patient",
      gender: "MALE",
      dob: patientDob,
      age: 21,
      phone: "638040927",
      email: "testpatient@gmail.com",
      address: "123 Medical Way",
      city: "Test City",
      emergencyContact: {
        name: "Test Guardian",
        phone: "638040928",
        relation: "Guardian"
      },
      isActive: true,
    });
    console.log("  [Seed] Created Patient: Test Patient (UHID: TH-P-1001, Phone: 638040927, DOB: 2004-11-10)");
  } else {
    patient.hospitalId = hospital._id;
    patient.branchId = branch._id;
    patient.firstName = "Test";
    patient.lastName = "Patient";
    patient.phone = "638040927";
    patient.dob = patientDob;
    patient.emergencyContact = { name: "Test Guardian", phone: "638040928", relation: "Guardian" };
    await patient.save();
    console.log("  [Seed] Updated Patient: Test Patient (UHID: TH-P-1001)");
  }

  // 5. Patient Account (Password: 0000)
  let patientUser = await User.findOne({ uhid: "TH-P-1001", role: "PATIENT" });
  if (!patientUser) {
    patientUser = await User.findOne({ email: "testpatient@gmail.com" });
  }
  if (!patientUser) {
    await User.create({
      hospitalId: hospital._id,
      branchId: branch._id,
      name: "Test Patient",
      email: "testpatient@gmail.com",
      phone: "638040927",
      uhid: "TH-P-1001",
      passwordHash: defaultHash,
      assignedPasswordHint: defaultPassword,
      role: "PATIENT",
      status: "ACTIVE",
      isActive: true,
    });
    console.log("  [Seed] Created Patient User Account (testpatient@gmail.com / 0000)");
  } else {
    patientUser.hospitalId = hospital._id;
    patientUser.branchId = branch._id;
    patientUser.passwordHash = defaultHash;
    patientUser.assignedPasswordHint = defaultPassword;
    patientUser.phone = "638040927";
    patientUser.uhid = "TH-P-1001";
    patientUser.status = "ACTIVE";
    patientUser.isActive = true;
    await patientUser.save();
    console.log("  [Seed] Updated Patient User Account (testpatient@gmail.com / 0000)");
  }

  // 6. Guardian Account (Mobile: 638040928, Password: 0000)
  let guardianUser = await User.findOne({ phone: "638040928", role: "GUARDIAN" });
  if (!guardianUser) {
    guardianUser = await User.findOne({ email: "testguardian@gmail.com" });
  }
  if (!guardianUser) {
    await User.create({
      hospitalId: hospital._id,
      branchId: branch._id,
      name: "Test Guardian",
      email: "testguardian@gmail.com",
      phone: "638040928",
      uhid: "TH-P-1001",
      passwordHash: defaultHash,
      assignedPasswordHint: defaultPassword,
      role: "GUARDIAN",
      status: "ACTIVE",
      isActive: true,
    });
    console.log("  [Seed] Created Guardian User Account (638040928 / 0000)");
  } else {
    guardianUser.hospitalId = hospital._id;
    guardianUser.branchId = branch._id;
    guardianUser.passwordHash = defaultHash;
    guardianUser.assignedPasswordHint = defaultPassword;
    guardianUser.phone = "638040928";
    guardianUser.uhid = "TH-P-1001";
    guardianUser.status = "ACTIVE";
    guardianUser.isActive = true;
    await guardianUser.save();
    console.log("  [Seed] Updated Guardian User Account (638040928 / 0000)");
  }

  return { hospital, patient };
}

async function runStandalone() {
  try {
    console.log("==================================================");
    console.log("?? Seeding Test Hospital & User Accounts...");
    console.log("==================================================");
    await connectDB();
    await ensureTestHospitalCredentials();
    console.log("==================================================");
    console.log("? Test Hospital Seed Complete!");
    console.log("   Domain: testhospital (http://82.29.166.169:86/testhospital/login)");
    console.log("   Admin Email: testhospital@gmail.com / Password: 0000");
    console.log("   Patient Mobile: 638040927 / DOB: 10-11-2004");
    console.log("   Guardian Mobile: 638040928 / Linked Patient Mobile: 638040927");
    console.log("==================================================");
    process.exit(0);
  } catch (err) {
    console.error("? Seed Error:", err);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith("seed-production-test-hospital.js")) {
  runStandalone();
}
