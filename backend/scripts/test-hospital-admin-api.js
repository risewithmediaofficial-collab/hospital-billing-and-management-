import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import { Hospital } from '../src/models/Hospital.js';
import { User } from '../src/models/User.js';
import app from '../src/app.js';
import http from 'http';

async function testBackend() {
  console.log('--- STARTING BACKEND VERIFICATION FOR HOSPITAL ADMIN ENDPOINTS ---');
  await mongoose.connect(env.MONGO_URI || 'mongodb://localhost:27017/hpmbs_db');

  let hospital = await Hospital.findOne({ isDeleted: false });
  if (!hospital) {
    console.log('No hospital found. Querying all...');
    hospital = await Hospital.findOne({});
  }
  console.log('Testing with Hospital:', hospital?.name, '| Domain:', hospital?.domain, '| ID:', hospital?._id);

  let adminUser = await User.findOne({ role: 'HOSPITAL_ADMIN', hospitalId: hospital?._id });
  if (!adminUser) {
    adminUser = await User.findOne({ role: 'HOSPITAL_ADMIN' });
  }
  if (!adminUser) {
    adminUser = await User.findOne({ role: 'SUPER_ADMIN' });
  }
  console.log('Testing with User:', adminUser?.name, '| Email:', adminUser?.email, '| Role:', adminUser?.role);

  if (!adminUser || !hospital) {
    console.error('ERROR: Could not find user or hospital to test with.');
    process.exit(1);
  }

  // Generate a test JWT token
  const tokenPayload = {
    id: adminUser._id,
    role: adminUser.role,
    hospitalId: hospital._id,
    branchId: adminUser.branchId || null,
    domain: hospital.domain,
  };
  const token = jwt.sign(tokenPayload, env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });

  // Start temporary test server on port 5999
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5999, resolve));
  console.log('Test Server running on port 5999');

  const endpoints = [
    '/api/v1/hospital-admin/overview',
    '/api/v1/hospital-admin/audit-logs',
    '/api/v1/hospital-admin/plan-details',
    '/api/v1/hospital-admin/usage-limits',
    '/api/v1/hospital-admin/settings',
    '/api/v1/hospital-admin/reports',
  ];

  let passed = 0;
  let failed = 0;

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`http://localhost:5999${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': `accessToken=${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.status >= 200 && res.status < 300 && data.success !== false) {
        console.log(`✅ [${res.status}] ${endpoint} -> SUCCESS`);
        console.log(`   Preview:`, JSON.stringify(data).slice(0, 120) + '...');
        passed++;
      } else {
        console.error(`❌ [${res.status}] ${endpoint} -> FAILED:`, data);
        failed++;
      }
    } catch (err) {
      console.error(`❌ [ERROR] ${endpoint}:`, err.message);
      failed++;
    }
  }

  server.close();
  await mongoose.disconnect();

  console.log('\n--- VERIFICATION SUMMARY ---');
  console.log(`Total: ${endpoints.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL BACKEND ENDPOINTS ARE WORKING PERFECTLY!');
    process.exit(0);
  }
}

testBackend().catch((err) => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
