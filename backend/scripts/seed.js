import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../src/config/database.js';
import { Hospital } from '../src/models/Hospital.js';
import { Branch } from '../src/models/Branch.js';
import { Role } from '../src/models/Role.js';
import { User } from '../src/models/User.js';
import { Patient } from '../src/models/Patient.js';
import { Appointment } from '../src/models/Appointment.js';
import { ROLES } from '../src/config/constants.js';

async function seedDatabase() {
  try {
    console.log('[Seed] Connecting to MongoDB Database...');
    await connectDB();

    console.log('[Seed] Resetting Database Collections for Fresh SaaS Platform Setup...');
    await Promise.all([
      Hospital.deleteMany({}),
      Branch.deleteMany({}),
      Role.deleteMany({}),
      User.deleteMany({}),
      Patient.deleteMany({}),
      Appointment.deleteMany({}),
    ]);

    console.log('[Seed] Creating Master Platform Owner Tenant...');
    const platformHospital = await Hospital.create({
      name: 'HPMBS SaaS Platform Owner',
      code: 'PLATFORM',
      subdomain: 'platform',
      status: 'APPROVED',
      plan: 'ENTERPRISE',
      contactName: 'Platform Master Owner',
      contactEmail: 'superadmin@gmail.com',
      contactPhone: '+1 (800) 555-SAAS',
      licenseNumber: 'PLATFORM-MASTER-001',
      isActive: true,
    });

    const mainBranch = await Branch.create({
      hospitalId: platformHospital._id,
      name: 'Global Platform Head Office',
      branchCode: 'HQ-MAIN',
      phone: '+1 (800) 555-SAAS',
      email: 'hq@platform.com',
      address: '100 SaaS Global Blvd',
      city: 'Metropolis',
      state: 'NY',
      postalCode: '10001',
      isMainBranch: true,
    });

    console.log('[Seed] Creating System Roles...');
    const rolesToCreate = Object.values(ROLES).map((roleCode) => {
      let defaultRoute = '/admin/dashboard';
      if (roleCode === ROLES.HOSPITAL_ADMIN) defaultRoute = '/hospital-admin/dashboard';
      else if (roleCode === ROLES.DOCTOR) defaultRoute = '/doctor/dashboard';
      else if (roleCode === ROLES.NURSE) defaultRoute = '/nursing/dashboard';
      else if (roleCode === ROLES.NURSE_INCHARGE) defaultRoute = '/nurse-incharge/dashboard';
      else if (roleCode === ROLES.RECEPTIONIST) defaultRoute = '/reception/dashboard';
      else if (roleCode === ROLES.PHARMACIST) defaultRoute = '/pharmacy/dashboard';
      else if (roleCode === ROLES.LAB_TECH) defaultRoute = '/laboratory/dashboard';
      else if (roleCode === ROLES.RADIOLOGIST) defaultRoute = '/radiology/dashboard';
      else if (roleCode === ROLES.CASHIER) defaultRoute = '/billing/dashboard';
      else if (roleCode === ROLES.INVENTORY_MANAGER) defaultRoute = '/inventory/dashboard';
      else if (roleCode === ROLES.HR_MANAGER) defaultRoute = '/hr/dashboard';
      else if (roleCode === ROLES.PATIENT) defaultRoute = '/patient-portal/dashboard';
      else if (roleCode === ROLES.GUARDIAN) defaultRoute = '/guardian-portal/dashboard';

      return {
        code: roleCode,
        name: roleCode.replace(/_/g, ' '),
        description: `${roleCode} Role Privileges`,
        permissions: ['ALL'],
        defaultRoute,
      };
    });
    await Role.insertMany(rolesToCreate);

    console.log('[Seed] Creating Master Platform Super Admin Account...');
    const superAdminPassword = '0000';

    const superAdminUser = await User.create({
      hospitalId: platformHospital._id,
      branchId: mainBranch._id,
      name: 'Platform Master Owner',
      email: 'superadmin@gmail.com',
      passwordHash: superAdminPassword,
      assignedPasswordHint: superAdminPassword,
      role: ROLES.SUPER_ADMIN,
      phone: '+1 (800) 555-SAAS',
      status: 'ACTIVE',
    });

    console.log('[Seed] Creating Sample Registered Client Hospitals...');
    const cityGeneralHospital = await Hospital.create({
      name: 'City General Hospital',
      code: 'CITYGEN',
      subdomain: 'citygen',
      status: 'APPROVED',
      plan: 'ENTERPRISE',
      contactName: 'Dr. Robert Vance',
      contactEmail: 'admin@citygeneral.com',
      contactPhone: '+1 (555) 234-5678',
      licenseNumber: 'HOSP-NY-88402',
      address: { street: '500 Health Way', city: 'New York', state: 'NY', country: 'USA' },
      isActive: true,
    });

    const cityGenBranch = await Branch.create({
      hospitalId: cityGeneralHospital._id,
      name: 'City General Main Campus',
      branchCode: 'CG-MAIN',
      phone: '+1 (555) 234-5678',
      email: 'main@citygeneral.com',
      address: '500 Health Way',
      city: 'New York',
      state: 'NY',
      postalCode: '10002',
      isMainBranch: true,
    });

    await User.create({
      hospitalId: cityGeneralHospital._id,
      branchId: cityGenBranch._id,
      name: 'Dr. Robert Vance',
      email: 'admin@citygeneral.com',
      passwordHash: 'HospitalAdmin123!',
      assignedPasswordHint: 'HospitalAdmin123!',
      role: ROLES.HOSPITAL_ADMIN,
      phone: '+1 (555) 234-5678',
      status: 'ACTIVE',
    });

    await User.create({
      hospitalId: cityGeneralHospital._id,
      branchId: cityGenBranch._id,
      name: 'Dr. Madhu Narayan',
      email: 'madhu@gmail.com',
      passwordHash: '1234',
      assignedPasswordHint: '1234',
      role: ROLES.DOCTOR,
      specialization: 'Cardiology',
      phone: '+91 9876543210',
      status: 'ACTIVE',
    });

    await User.create({
      hospitalId: cityGeneralHospital._id,
      branchId: cityGenBranch._id,
      name: 'Satish Kumar',
      email: 'satish@gmail.com',
      passwordHash: '1234',
      assignedPasswordHint: '1234',
      role: ROLES.RECEPTIONIST,
      phone: '+91 9876543211',
      status: 'ACTIVE',
    });

    await User.create({
      hospitalId: cityGeneralHospital._id,
      branchId: cityGenBranch._id,
      name: 'Hari Diagnostic Tech',
      email: 'hari@gmail.com',
      passwordHash: '1234',
      assignedPasswordHint: '1234',
      role: ROLES.RADIOLOGIST,
      specialization: 'X-Ray & Radiology Imaging',
      phone: '+91 9876543212',
      status: 'ACTIVE',
    });

    await Hospital.create({
      name: 'St. Jude Specialty Care Center',
      code: 'STJUDE',
      subdomain: 'stjude',
      status: 'PENDING_APPROVAL',
      plan: 'PROFESSIONAL',
      contactName: 'Dr. Clara Oswald',
      contactEmail: 'admin@stjude.com',
      contactPhone: '+1 (555) 987-6543',
      licenseNumber: 'HOSP-CA-99301',
      address: { street: '77 Hope Blvd', city: 'Los Angeles', state: 'CA', country: 'USA' },
      isActive: true,
    });

    console.log('====================================================');
    console.log(' Master SaaS Platform Initialized Successfully!');
    console.log('====================================================');
    console.log(' Platform Master Super Admin Credentials:');
    console.log(` Email:    ${superAdminUser.email}`);
    console.log(` Password: ${superAdminPassword}`);
    console.log('====================================================');
    console.log(' Sample Registered Client Hospitals Created:');
    console.log(' 1. City General Hospital (Approved - admin@citygeneral.com)');
    console.log(' 2. St. Jude Specialty Care Center (Pending Approval - admin@stjude.com)');
    console.log('====================================================');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error] Failed to seed database:', error);
    process.exit(1);
  }
}

seedDatabase();
