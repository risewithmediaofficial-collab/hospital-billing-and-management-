import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { Patient } from '../src/models/Patient.js';
import { Hospital } from '../src/models/Hospital.js';
import { env } from '../src/config/env.js';

const cleanTestData = async () => {
  try {
    const mongoUri = env.MONGO_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/hpmbs_db';
    console.log('[Cleanup] Connecting to MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);

    console.log('\n--- 1. IDENTIFYING DUMMY / TEST USERS ---');
    const dummyUserFilter = {
      $or: [
        { name: { $regex: /test/i } },
        { email: { $regex: /test/i } },
        { email: { $regex: /nurse2/i } },
        { name: { $regex: /Patient superadmin/i } },
        { email: { $regex: /superadmin@patient/i } },
        { email: { $regex: /superadmin@hpmbs/i } },
        { email: { $regex: /superadmin@gmail\.\./i } },
        { role: 'PATIENT', email: { $regex: /superadmin/i } },
        { role: 'GUARDIAN', email: { $regex: /superadmin/i } },
      ]
    };

    const dummyUsers = await User.find(dummyUserFilter);
    console.log(`Found ${dummyUsers.length} dummy/test user accounts to remove:`);
    dummyUsers.forEach((u) => {
      console.log(` - ID: ${u._id} | Name: ${u.name} | Email: ${u.email} | Role: ${u.role}`);
    });

    if (dummyUsers.length > 0) {
      const deleteUserRes = await User.deleteMany(dummyUserFilter);
      console.log(`[Success] Deleted ${deleteUserRes.deletedCount} dummy user accounts.`);
    } else {
      console.log('[Info] No dummy user accounts found.');
    }

    console.log('\n--- 2. IDENTIFYING DUMMY / TEST PATIENTS ---');
    const dummyPatientFilter = {
      $or: [
        { firstName: { $regex: /test/i } },
        { lastName: { $regex: /test/i } },
        { firstName: { $regex: /superadmin/i } },
        { lastName: { $regex: /superadmin/i } },
      ]
    };

    const dummyPatients = await Patient.find(dummyPatientFilter);
    console.log(`Found ${dummyPatients.length} dummy/test patient records to remove:`);
    dummyPatients.forEach((p) => {
      console.log(` - UHID: ${p.uhid} | Name: ${p.firstName} ${p.lastName} | Phone: ${p.phone}`);
    });

    if (dummyPatients.length > 0) {
      const deletePatRes = await Patient.deleteMany(dummyPatientFilter);
      console.log(`[Success] Deleted ${deletePatRes.deletedCount} dummy patient records.`);
    } else {
      console.log('[Info] No dummy patient records found.');
    }

    console.log('\n--- 3. CLEAN DATABASE SUMMARY ---');
    const totalUsers = await User.countDocuments({});
    const totalStaff = await User.countDocuments({ role: { $nin: ['SUPER_ADMIN', 'PATIENT', 'GUARDIAN'] } });
    const totalPatients = await Patient.countDocuments({});
    const totalHospitals = await Hospital.countDocuments({ code: { $nin: ['PLATFORM', 'PLATFORM-HQ'] }, subdomain: { $ne: 'platform' } });

    console.log(`Remaining Valid System State:`);
    console.log(` - Total Users: ${totalUsers}`);
    console.log(` - Total Staff Members: ${totalStaff}`);
    console.log(` - Total Patients: ${totalPatients}`);
    console.log(` - Total Registered Hospitals: ${totalHospitals}`);

    await mongoose.disconnect();
    console.log('\n[Cleanup Complete] MongoDB connection closed cleanly.');
  } catch (err) {
    console.error('[Cleanup Error]', err);
    process.exit(1);
  }
};

cleanTestData();
