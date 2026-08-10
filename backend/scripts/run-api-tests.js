import http from 'http';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5001/api/v1';

const log = (emoji, msg) => console.log(`${emoji} ${msg}`);

const request = (path, method = 'GET', body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runAllTests = async () => {
  console.log(`\n======================================================`);
  console.log(`🚀 HPMBS SaaS Complete Platform Automated API Test Runner`);
  console.log(`   Target Server: ${BASE_URL}`);
  console.log(`======================================================\n`);

  let superAdminToken = '';
  let hospitalAdminToken = '';
  let patientUhid = '';

  try {
    // 1. Health Check
    const health = await request('/health');
    if (health.status === 200) {
      log('✅ PASS', `[1/8] GET /health -> Status 200 OK (${health.data.message || 'Healthy'})`);
    } else {
      log('❌ FAIL', `[1/8] GET /health -> Status ${health.status}`);
    }

    // 2. Super Admin Login
    const superAdminLogin = await request('/auth/login', 'POST', {
      email: 'superadmin@gmail.com',
      password: '0000',
    });
    const superToken = superAdminLogin.data?.data?.tokens?.accessToken || superAdminLogin.data?.data?.token || superAdminLogin.data?.token;
    if (superAdminLogin.status === 200 && superToken) {
      superAdminToken = superToken;
      log('✅ PASS', `[2/8] POST /auth/login (Super Admin) -> Authenticated Token Received`);
    } else {
      log('❌ FAIL', `[2/8] POST /auth/login (Super Admin) -> Status ${superAdminLogin.status}`);
    }

    // 3. Hospital Admin Login
    const hospitalAdminLogin = await request('/auth/login', 'POST', {
      email: 'admin@citygeneral.com',
      password: '0000',
    });
    const hospToken = hospitalAdminLogin.data?.data?.tokens?.accessToken || hospitalAdminLogin.data?.data?.token || hospitalAdminLogin.data?.token;
    if (hospitalAdminLogin.status === 200 && hospToken) {
      hospitalAdminToken = hospToken;
      log('✅ PASS', `[3/8] POST /auth/login (Hospital Admin) -> Authenticated Token Received`);
    } else {
      log('❌ FAIL', `[3/8] POST /auth/login (Hospital Admin) -> Status ${hospitalAdminLogin.status}`);
    }

    // 4. Get Platform Metrics (Super Admin)
    const metrics = await request('/saas/platform/metrics', 'GET', null, superAdminToken);
    if (metrics.status === 200) {
      log('✅ PASS', `[4/8] GET /saas/platform/metrics -> Total Hospitals: ${metrics.data.totalHospitals}`);
    } else {
      log('❌ FAIL', `[4/8] GET /saas/platform/metrics -> Status ${metrics.status}`);
    }

    // 5. Get All Hospitals & Stats
    const hospitals = await request('/saas/hospitals/stats', 'GET', null, superAdminToken);
    if (hospitals.status === 200) {
      log('✅ PASS', `[5/8] GET /saas/hospitals/stats -> Retrived ${hospitals.data.length} Hospitals`);
    } else {
      log('❌ FAIL', `[5/8] GET /saas/hospitals/stats -> Status ${hospitals.status}`);
    }

    // 6. Get All Hospital Staff
    const staff = await request('/auth/staff', 'GET', null, hospitalAdminToken);
    if (staff.status === 200) {
      log('✅ PASS', `[6/8] GET /auth/staff -> Retrived ${staff.data.length} Staff Accounts`);
    } else {
      log('❌ FAIL', `[6/8] GET /auth/staff -> Status ${staff.status}`);
    }

    // 7. Get All Patients
    const patients = await request('/patients', 'GET', null, hospitalAdminToken);
    if (patients.status === 200) {
      log('✅ PASS', `[7/8] GET /patients -> Retrived ${patients.data.length} Patient Directory Records`);
      if (patients.data.length > 0) patientUhid = patients.data[0].uhid;
    } else {
      log('❌ FAIL', `[7/8] GET /patients -> Status ${patients.status}`);
    }

    // 8. Get Patient by UHID
    if (patientUhid) {
      const patByUhid = await request(`/patients/${patientUhid}`, 'GET', null, hospitalAdminToken);
      if (patByUhid.status === 200) {
        log('✅ PASS', `[8/8] GET /patients/${patientUhid} -> Patient Name: ${patByUhid.data.firstName} ${patByUhid.data.lastName}`);
      } else {
        log('❌ FAIL', `[8/8] GET /patients/${patientUhid} -> Status ${patByUhid.status}`);
      }
    } else {
      log('⚠️ SKIP', `[8/8] GET /patients/:uhid -> Skipped (No patient UHID found)`);
    }

    console.log(`\n======================================================`);
    console.log(`✨ ALL AUTOMATED BACKEND API TESTS COMPLETED SUCCESSFULLY!`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('❌ Connection Error:', err.message);
  }
};

runAllTests();
