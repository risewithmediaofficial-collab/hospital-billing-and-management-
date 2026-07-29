import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../src/config/database.js';
import { Hospital } from '../src/models/Hospital.js';
import { Branch } from '../src/models/Branch.js';
import { Role } from '../src/models/Role.js';
import { User } from '../src/models/User.js';
import { ROLES } from '../src/config/constants.js';

async function seedSuperAdmin() {
  try {
    console.log('[Seed SuperAdmin] Connecting to MongoDB Database...');
    await connectDB();

    console.log('[Seed SuperAdmin] Ensuring System Roles exist...');
    const rolesToCreate = Object.values(ROLES).map((roleCode) => ({
      code: roleCode,
      name: roleCode.replace(/_/g, ' '),
      description: `${roleCode} Role Privileges`,
      permissions: ['ALL'],
      defaultRoute: roleCode === ROLES.SUPER_ADMIN ? '/admin/dashboard' : '/dashboard',
    }));

    for (const roleData of rolesToCreate) {
      await Role.updateOne({ code: roleData.code }, { $setOnInsert: roleData }, { upsert: true });
    }

    console.log('[Seed SuperAdmin] Ensuring Platform Hospital exists...');
    let platformHospital = await Hospital.findOne({ code: 'PLATFORM' });
    if (!platformHospital) {
      platformHospital = await Hospital.create({
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
    }

    console.log('[Seed SuperAdmin] Ensuring Main Branch exists...');
    let mainBranch = await Branch.findOne({ hospitalId: platformHospital._id, isMainBranch: true });
    if (!mainBranch) {
      mainBranch = await Branch.create({
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
    }

    const superAdminEmail = 'superadmin@gmail.com';
    const superAdminPassword = '0000';

    let superAdminUser = await User.findOne({ email: superAdminEmail });

    if (superAdminUser) {
      console.log(`[Seed SuperAdmin] User '${superAdminEmail}' exists. Updating password to '0000'...`);
      superAdminUser.passwordHash = superAdminPassword;
      superAdminUser.assignedPasswordHint = superAdminPassword;
      superAdminUser.role = ROLES.SUPER_ADMIN;
      superAdminUser.status = 'ACTIVE';
      superAdminUser.isActive = true;
      await superAdminUser.save();
    } else {
      console.log(`[Seed SuperAdmin] Creating Super Admin account '${superAdminEmail}'...`);
      superAdminUser = await User.create({
        hospitalId: platformHospital._id,
        branchId: mainBranch._id,
        name: 'Platform Master Owner',
        email: superAdminEmail,
        passwordHash: superAdminPassword,
        assignedPasswordHint: superAdminPassword,
        role: ROLES.SUPER_ADMIN,
        phone: '+1 (800) 555-SAAS',
        status: 'ACTIVE',
      });
    }

    console.log('====================================================');
    console.log(' Super Admin Seeded Successfully!');
    console.log('====================================================');
    console.log(` Email:    ${superAdminUser.email}`);
    console.log(` Password: ${superAdminPassword}`);
    console.log('====================================================');

    process.exit(0);
  } catch (error) {
    console.error('[Seed SuperAdmin Error] Failed to seed Super Admin:', error);
    process.exit(1);
  }
}

seedSuperAdmin();
