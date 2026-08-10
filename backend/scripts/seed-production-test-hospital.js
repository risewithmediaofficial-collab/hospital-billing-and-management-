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

  // 4. Patient Record (Mobile: 6380140927, DOB: 10-11-2004)
  let patient = await Patient.findOne({ hospitalId: hospital._id, uhid: "TH-P-1001" });
  if (!patient) {
    patient = await Patient.findOne({ $or: [{ phone: "6380140927" }, { phone: "638040927" }] });
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
      phone: "6380140927",
      email: "",
      address: "123 Medical Way",
      city: "Test City",
      emergencyContact: {
        name: "Test Guardian",
        phone: "6380140928",
        relation: "Guardian"
      },
      isActive: true,
    });
    console.log("  [Seed] Created Patient: Test Patient (UHID: TH-P-1001, Phone: 6380140927, DOB: 2004-11-10)");
  } else {
    patient.hospitalId = hospital._id;
    patient.branchId = branch._id;
    patient.firstName = "Test";
    patient.lastName = "Patient";
    patient.phone = "6380140927";
    patient.dob = patientDob;
    patient.emergencyContact = { name: "Test Guardian", phone: "6380140928", relation: "Guardian" };
    await patient.save();
    console.log("  [Seed] Updated Patient: Test Patient (UHID: TH-P-1001, Phone: 6380140927)");
  }

  // 5. Patient Account (No mandatory email requirement)
  let patientUser = await User.findOne({ uhid: "TH-P-1001", role: "PATIENT" });
  if (!patientUser) {
    patientUser = await User.findOne({ phone: "6380140927", role: "PATIENT" });
  }
  if (!patientUser) {
    await User.create({
      hospitalId: hospital._id,
      branchId: branch._id,
      name: "Test Patient",
      email: "6380140927_thp1001@noemail.local",
      phone: "6380140927",
      loginIds: ["6380140927", "638040927"],
      uhid: "TH-P-1001",
      passwordHash: defaultHash,
      assignedPasswordHint: defaultPassword,
      role: "PATIENT",
      status: "ACTIVE",
      isActive: true,
    });
    console.log("  [Seed] Created Patient User Account (Phone: 6380140927 / DOB: 10-11-2004)");
  } else {
    patientUser.hospitalId = hospital._id;
    patientUser.branchId = branch._id;
    patientUser.passwordHash = defaultHash;
    patientUser.assignedPasswordHint = defaultPassword;
    patientUser.phone = "6380140927";
    patientUser.loginIds = ["6380140927", "638040927"];
    patientUser.uhid = "TH-P-1001";
    patientUser.status = "ACTIVE";
    patientUser.isActive = true;
    await patientUser.save();
    console.log("  [Seed] Updated Patient User Account (Phone: 6380140927 / DOB: 10-11-2004)");
  }

  // 6. Guardian Account (Mobile: 6380140928)
  let guardianUser = await User.findOne({ phone: "6380140928", role: "GUARDIAN" });
  if (!guardianUser) {
    guardianUser = await User.findOne({ loginIds: "6380140928", role: "GUARDIAN" });
  }
  if (!guardianUser) {
    guardianUser = await User.create({
      hospitalId: hospital._id,
      branchId: branch._id,
      name: "Test Guardian",
      email: "6380140928_thp1001@noemail.local",
      phone: "6380140928",
      loginIds: ["6380140928", "638040928"],
      uhid: "TH-P-1001",
      passwordHash: defaultHash,
      assignedPasswordHint: defaultPassword,
      role: "GUARDIAN",
      status: "ACTIVE",
      isActive: true,
    });
    console.log("  [Seed] Created Guardian User Account (Phone: 6380140928)");
  } else {
    guardianUser.hospitalId = hospital._id;
    guardianUser.branchId = branch._id;
    guardianUser.passwordHash = defaultHash;
    guardianUser.assignedPasswordHint = defaultPassword;
    guardianUser.phone = "6380140928";
    guardianUser.loginIds = ["6380140928", "638040928"];
    guardianUser.uhid = "TH-P-1001";
    guardianUser.status = "ACTIVE";
    guardianUser.isActive = true;
    await guardianUser.save();
    console.log("  [Seed] Updated Guardian User Account (Phone: 6380140928)");
  }

  // 7. Dynamic Clinical, IPD Admission & Treatment Seeding for Patient 6380140927
  const doctorUser = await User.findOne({ hospitalId: hospital._id, role: "DOCTOR" });
  const nurseUser = await User.findOne({ hospitalId: hospital._id, role: "NURSE" });

  // A. Create/Update Bed (ICU-B01)
  const { Bed } = await import("../src/models/Bed.js");
  let bed = await Bed.findOne({ hospitalId: hospital._id, bedNumber: "ICU-B01" });
  if (!bed) {
    bed = await Bed.create({
      hospitalId: hospital._id,
      branchId: branch._id,
      wardName: "ICU Ward 3B",
      wardType: "ICU",
      bedNumber: "ICU-B01",
      dailyTariff: 2500,
      status: "OCCUPIED",
      occupiedByPatientId: patient._id,
      assignedAt: new Date(),
    });
  } else {
    bed.status = "OCCUPIED";
    bed.occupiedByPatientId = patient._id;
    await bed.save();
  }

  // B. Create/Update Active IPD Admission
  const { Admission } = await import("../src/models/Admission.js");
  let admission = await Admission.findOne({ hospitalId: hospital._id, patientId: patient._id, status: "ADMITTED" });
  if (!admission) {
    admission = await Admission.create({
      hospitalId: hospital._id,
      branchId: branch._id,
      patientId: patient._id,
      uhid: "TH-P-1001",
      patientName: "Test Patient",
      admissionNumber: 1,
      admissionReference: "ADM-TH-2026-00001",
      doctorId: doctorUser?._id,
      doctorName: doctorUser?.name || "Dr. Test Doctor",
      assignedNurseId: nurseUser?._id,
      careTeamAssigned: true,
      wardType: "ICU",
      targetWardName: "ICU Ward 3B",
      bedId: bed._id,
      bedNumber: "ICU-B01",
      admissionReason: "Acute Respiratory Assessment & Multi-Department Inpatient Observation",
      dailyTariff: 2500,
      status: "ADMITTED",
      admittedAt: new Date(),
      assignedAt: new Date(),
    });
    console.log("  [Seed] Created Active IPD Admission: Bed ICU-B01 (Doctor: Dr. Test Doctor, Nurse: Nurse Test)");
  } else {
    admission.doctorId = doctorUser?._id || admission.doctorId;
    admission.assignedNurseId = nurseUser?._id || admission.assignedNurseId;
    admission.bedId = bed._id;
    admission.bedNumber = "ICU-B01";
    admission.status = "ADMITTED";
    await admission.save();
    console.log("  [Seed] Updated Active IPD Admission: Bed ICU-B01");
  }

  // Update Patient admission status
  patient.admissionStatus = "ACTIVE_ADMISSION";
  patient.activeAdmissionId = admission._id;
  await patient.save();

  // C. GlobalPatient Link with Active Admission
  const { GlobalPatient } = await import("../src/models/GlobalPatient.js");
  let globalPatient = await GlobalPatient.findOne({ primaryPhone: "6380140927" });
  if (!globalPatient) {
    globalPatient = await GlobalPatient.create({
      globalPatientId: "GP-TH-2026-00001",
      firstName: "Test",
      lastName: "Patient",
      dob: patient.dob,
      gender: "MALE",
      primaryPhone: "6380140927",
      patientUserId: patientUser._id,
      hospitalMemberships: [
        {
          hospitalId: hospital._id,
          hospitalName: "Test Hospital",
          localPatientId: patient._id,
          localUhid: "TH-P-1001",
          joinedAt: new Date(),
          hasActiveAdmission: true,
          activeAdmissionId: admission._id,
        }
      ],
      isActive: true,
    });
  } else {
    globalPatient.patientUserId = patientUser._id;
    globalPatient.hospitalMemberships = [
      {
        hospitalId: hospital._id,
        hospitalName: "Test Hospital",
        localPatientId: patient._id,
        localUhid: "TH-P-1001",
        joinedAt: new Date(),
        hasActiveAdmission: true,
        activeAdmissionId: admission._id,
      }
    ];
    await globalPatient.save();
  }

  // D. Multi-Department Diagnostic Orders (MRI, Blood Check, Chest X-Ray)
  const { DiagnosticOrder } = await import("../src/models/DiagnosticOrder.js");
  const existingOrders = await DiagnosticOrder.find({ patientId: patient._id });
  if (existingOrders.length === 0) {
    await DiagnosticOrder.create([
      {
        hospitalId: hospital._id,
        branchId: branch._id,
        patientId: patient._id,
        uhid: "TH-P-1001",
        patientName: "Test Patient",
        doctorId: doctorUser._id,
        doctorName: doctorUser.name,
        testCategory: "PATHOLOGY",
        testName: "Complete Blood Count (CBC) & Serum Electrolytes",
        clinicalNotes: "Inpatient Admission Workup",
        priority: "NORMAL",
        price: 800,
        status: "COMPLETED",
        sampleCollectedAt: new Date(),
        resultSummary: "Hemoglobin 13.5 g/dL (Normal), WBC 7,200 /mcL (Normal)",
      },
      {
        hospitalId: hospital._id,
        branchId: branch._id,
        patientId: patient._id,
        uhid: "TH-P-1001",
        patientName: "Test Patient",
        doctorId: doctorUser._id,
        doctorName: doctorUser.name,
        testCategory: "MRI",
        testName: "Brain MRI Scan (Non-Contrast)",
        clinicalNotes: "Evaluate for acute intracranial etiology",
        priority: "URGENT",
        price: 4500,
        status: "REQUESTED",
      },
      {
        hospitalId: hospital._id,
        branchId: branch._id,
        patientId: patient._id,
        uhid: "TH-P-1001",
        patientName: "Test Patient",
        doctorId: doctorUser._id,
        doctorName: doctorUser.name,
        testCategory: "XRAY",
        testName: "Chest X-Ray (PA & Lateral View)",
        clinicalNotes: "Cardiopulmonary Assessment",
        priority: "NORMAL",
        price: 750,
        status: "COMPLETED",
        resultSummary: "Clear lung fields, normal cardiac silhouette.",
      }
    ]);
    console.log("  [Seed] Created Diagnostic Orders: Pathology Blood Check, Brain MRI, Chest X-Ray");
  }

  // E. Prescriptions
  const { Prescription } = await import("../src/models/Prescription.js");
  const existingPrescription = await Prescription.findOne({ patientId: patient._id });
  if (!existingPrescription) {
    await Prescription.create({
      hospitalId: hospital._id,
      branchId: branch._id,
      consultationId: admission._id,
      patientId: patient._id,
      doctorId: doctorUser._id,
      prescriptionNo: "RX-TH-2026-00001",
      medicines: [
        {
          medicineName: "Paracetamol 500mg",
          dosageForm: "TABLET",
          dosage: "1 Tablet",
          frequency: "1-0-1",
          durationDays: 5,
          timing: "AFTER_FOOD",
          instructions: "Take with water after meals",
          itemStatus: "PENDING",
        },
        {
          medicineName: "Amoxicillin 250mg",
          dosageForm: "CAPSULE",
          dosage: "1 Capsule",
          frequency: "1-1-1",
          durationDays: 7,
          timing: "AFTER_FOOD",
          instructions: "Complete 7-day antibiotic course",
          itemStatus: "PENDING",
        }
      ],
      dispenseStatus: "PENDING_DISPENSE",
    });
    console.log("  [Seed] Created E-Prescription: Paracetamol 500mg & Amoxicillin 250mg");
  }

  // F. Care Requests
  const { PatientRequest } = await import("../src/models/PatientRequest.js");
  const existingReq = await PatientRequest.findOne({ patientId: patient._id });
  if (!existingReq) {
    await PatientRequest.create([
      {
        hospitalId: hospital._id,
        branchId: branch._id,
        patientId: patient._id,
        bedId: bed._id,
        requestType: "WATER",
        category: "CARETAKER",
        status: "SUBMITTED",
        notes: "Requested fresh warm drinking water",
      },
      {
        hospitalId: hospital._id,
        branchId: branch._id,
        patientId: patient._id,
        bedId: bed._id,
        requestType: "FOOD",
        category: "CARETAKER",
        status: "SUBMITTED",
        notes: "Dietary request: Soft inpatient meal",
      }
    ]);
    console.log("  [Seed] Created Care Requests: Water & Food");
  }

  // G. Inpatient Invoice & Payment Billing
  const { Invoice } = await import("../src/models/Invoice.js");
  let invoice = await Invoice.findOne({ hospitalId: hospital._id, patientId: patient._id });
  if (!invoice) {
    invoice = await Invoice.create({
      hospitalId: hospital._id,
      branchId: branch._id,
      patientId: patient._id,
      doctorId: doctorUser._id,
      doctorName: doctorUser.name,
      invoiceNo: "INV-TH-2026-00001",
      items: [
        { description: "ICU Ward Room Charge (2 Days @ ₹2,500/day)", category: "BED_TARIFF", qty: 2, unitPrice: 2500, totalPrice: 5000 },
        { description: "Specialist Inpatient Consultation Fee (Dr. Test Doctor)", category: "CONSULTATION", qty: 1, unitPrice: 1000, totalPrice: 1000 },
        { description: "Brain MRI Scan (Non-Contrast)", category: "RADIOLOGY", qty: 1, unitPrice: 4500, totalPrice: 4500 },
        { description: "Pathology Complete Blood Count (CBC) & Electrolytes", category: "LAB", qty: 1, unitPrice: 800, totalPrice: 800 },
        { description: "Inpatient Pharmacy Medications", category: "PHARMACY", qty: 1, unitPrice: 700, totalPrice: 700 },
      ],
      subtotal: 12000,
      discountAmount: 0,
      grandTotal: 12000,
      paidAmount: 4000,
      balanceAmount: 8000,
      status: "PARTIALLY_PAID",
    });
    console.log("  [Seed] Created Inpatient Bill: Total ₹12,000 | Paid ₹4,000 | Balance Due ₹8,000");
  }

  // H. OPD Queue Tokens & Appointments for Doctor Workstation
  const { Appointment } = await import("../src/models/Appointment.js");
  const todayStr = new Date().toISOString().split('T')[0];

  // Ensure Walkin Patients exist
  let patient2 = await Patient.findOne({ hospitalId: hospital._id, uhid: "TH-P-1002" });
  if (!patient2) {
    patient2 = await Patient.create({
      hospitalId: hospital._id,
      branchId: branch._id,
      uhid: "TH-P-1002",
      firstName: "John",
      lastName: "Walkin",
      gender: "MALE",
      dob: new Date("1990-05-15"),
      age: 35,
      phone: "9876543210",
      address: "45 OPD Lane",
      city: "Test City",
      isActive: true,
    });
  }

  let patient3 = await Patient.findOne({ hospitalId: hospital._id, uhid: "TH-P-1003" });
  if (!patient3) {
    patient3 = await Patient.create({
      hospitalId: hospital._id,
      branchId: branch._id,
      uhid: "TH-P-1003",
      firstName: "Sarah",
      lastName: "Miller",
      gender: "FEMALE",
      dob: new Date("1998-08-20"),
      age: 27,
      phone: "9876543211",
      address: "88 Consultation Way",
      city: "Test City",
      isActive: true,
    });
  }

  const existingApt = await Appointment.findOne({ hospitalId: hospital._id, doctorId: doctorUser._id, appointmentDate: todayStr });
  if (!existingApt) {
    await Appointment.create([
      {
        hospitalId: hospital._id,
        branchId: branch._id,
        patientId: patient._id,
        doctorId: doctorUser._id,
        appointmentNo: `APT-${todayStr.replace(/-/g, '')}-001`,
        tokenNumber: 1,
        appointmentDate: todayStr,
        status: "WAITING",
        chiefComplaints: "High Fever, Persistent Cough & Body Aches",
        cabinNo: doctorUser.cabinNo || "Cabin 101",
      },
      {
        hospitalId: hospital._id,
        branchId: branch._id,
        patientId: patient2._id,
        doctorId: doctorUser._id,
        appointmentNo: `APT-${todayStr.replace(/-/g, '')}-002`,
        tokenNumber: 2,
        appointmentDate: todayStr,
        status: "WAITING",
        chiefComplaints: "Routine Blood Pressure & Blood Sugar Follow-up",
        cabinNo: doctorUser.cabinNo || "Cabin 101",
      },
      {
        hospitalId: hospital._id,
        branchId: branch._id,
        patientId: patient3._id,
        doctorId: doctorUser._id,
        appointmentNo: `APT-${todayStr.replace(/-/g, '')}-003`,
        tokenNumber: 3,
        appointmentDate: todayStr,
        status: "IN_CONSULTATION",
        chiefComplaints: "Acute Chest Discomfort & Mild Dizziness",
        cabinNo: doctorUser.cabinNo || "Cabin 101",
      }
    ]);
    console.log("  [Seed] Created Live OPD Queue Tokens #1, #2, #3 for Dr. Test Doctor (Cabin 101)");
  } else {
    // Update existing tokens status to WAITING / IN_CONSULTATION so queue is active
    await Appointment.updateMany(
      { hospitalId: hospital._id, doctorId: doctorUser._id },
      { $set: { status: "WAITING", appointmentDate: todayStr } }
    );
    console.log("  [Seed] Updated Live OPD Queue Tokens for Dr. Test Doctor (Cabin 101)");
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
