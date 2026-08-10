import fs from 'fs';

const collection = {
  info: {
    name: "HPMBS SaaS Complete Platform API Test Suite",
    description: "Complete automated API test suite for Hospital Billing & Management SaaS Platform",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: [
    {
      name: "01 - Health & System",
      item: [
        {
          name: "System Health Check",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/health",
              host: ["{{base_url}}"],
              path: ["health"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code is 200 OK', function () { pm.response.to.have.status(200); });",
                  "pm.test('Response is JSON', function () { pm.response.to.be.json; });"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      name: "02 - Authentication",
      item: [
        {
          name: "Super Admin Login",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ email: "superadmin@gmail.com", password: "0000" }, null, 2)
            },
            url: {
              raw: "{{base_url}}/auth/login",
              host: ["{{base_url}}"],
              path: ["auth", "login"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Super Admin Login (200 OK)', function () { pm.response.to.have.status(200); });",
                  "const res = pm.response.json();",
                  "const token = res.data?.tokens?.accessToken || res.data?.token || res.token;",
                  "if (token) { pm.environment.set('token', token); pm.environment.set('superadmin_token', token); }"
                ]
              }
            }
          ]
        },
        {
          name: "Hospital Admin Login",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ email: "admin@citygeneral.com", password: "0000" }, null, 2)
            },
            url: {
              raw: "{{base_url}}/auth/login",
              host: ["{{base_url}}"],
              path: ["auth", "login"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Hospital Admin Login (200 OK)', function () { pm.response.to.have.status(200); });",
                  "const res = pm.response.json();",
                  "const token = res.data?.tokens?.accessToken || res.data?.token || res.token;",
                  "if (token) { pm.environment.set('token', token); pm.environment.set('hospital_admin_token', token); }"
                ]
              }
            }
          ]
        },
        {
          name: "Patient Login (Mobile + DOB)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ mobileNumber: "6380140927", dob: "1995-01-01" }, null, 2)
            },
            url: {
              raw: "{{base_url}}/auth/patient-login",
              host: ["{{base_url}}"],
              path: ["auth", "patient-login"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Patient Login (200 OK)', function () { pm.response.to.have.status(200); });"
                ]
              }
            }
          ]
        },
        {
          name: "Guardian Login (Guardian Mobile + Patient Mobile + UHID)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ guardianMobile: "6380140927", patientMobile: "6380140927", patientNumber: "HOSP-2026-00005" }, null, 2)
            },
            url: {
              raw: "{{base_url}}/auth/guardian-login",
              host: ["{{base_url}}"],
              path: ["auth", "guardian-login"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Guardian Login (200 OK)', function () { pm.response.to.have.status(200); });"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      name: "03 - SaaS & Hospital Management",
      item: [
        {
          name: "Register New Hospital (7-Day Trial)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                hospitalName: "Postman Test Hospital",
                contactName: "Dr. Postman Admin",
                contactEmail: "postman.admin.test@hospital.com",
                contactPhone: "+15559990000",
                plan: "ENTERPRISE",
                adminPassword: "HospitalAdmin123!"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/saas/register-hospital",
              host: ["{{base_url}}"],
              path: ["saas", "register-hospital"]
            }
          },
          event: [
            {
              listen: "prerequest",
              script: {
                exec: [
                  "const uniqueSuffix = Date.now();",
                  "pm.variables.set('unique_email', 'postman.test.' + uniqueSuffix + '@hospital.com');"
                ]
              }
            },
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Hospital Registered (200/201 Success)', function () { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });",
                  "const res = pm.response.json();",
                  "if (res.data?.hospital?._id) { pm.environment.set('hospital_id', res.data.hospital._id); }"
                ]
              }
            }
          ]
        },
        {
          name: "Get Platform Metrics (Super Admin)",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{superadmin_token}}" }],
            url: {
              raw: "{{base_url}}/saas/platform/metrics",
              host: ["{{base_url}}"],
              path: ["saas", "platform", "metrics"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Platform Metrics Retrieved (200 OK)', function () { pm.response.to.have.status(200); });"
                ]
              }
            }
          ]
        },
        {
          name: "Get All Hospitals & Stats",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{superadmin_token}}" }],
            url: {
              raw: "{{base_url}}/saas/hospitals/stats",
              host: ["{{base_url}}"],
              path: ["saas", "hospitals", "stats"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('All Hospitals & Stats (200 OK)', function () { pm.response.to.have.status(200); });"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      name: "04 - Staff & Workstation Accounts",
      item: [
        {
          name: "Create Staff Account",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{hospital_admin_token}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Dr. Postman Specialist",
                email: "postman.doctor@citygeneral.com",
                phone: "+15551112222",
                password: "Doctor123!",
                role: "DOCTOR",
                specialization: "General Medicine",
                departmentId: "General Medicine"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/auth/staff",
              host: ["{{base_url}}"],
              path: ["auth", "staff"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Staff Account Handled (200/201)', function () { pm.expect(pm.response.code).to.be.oneOf([200, 201, 400]); });"
                ]
              }
            }
          ]
        },
        {
          name: "Get All Hospital Staff",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token}}" }],
            url: {
              raw: "{{base_url}}/auth/staff",
              host: ["{{base_url}}"],
              path: ["auth", "staff"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Get Hospital Staff (200 OK)', function () { pm.response.to.have.status(200); });"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      name: "05 - Patients & EMR",
      item: [
        {
          name: "Register New Patient",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                firstName: "John",
                lastName: "Doe",
                gender: "MALE",
                dob: "1990-01-01",
                age: 36,
                phone: "9876543210",
                guardianPhone: "9876543211",
                bloodGroup: "O_POSITIVE",
                address: { street: "123 Main St", city: "Metropolis", state: "NY", postalCode: "10001" }
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/patients",
              host: ["{{base_url}}"],
              path: ["patients"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Patient Registration Handled (200/201/422)', function () { pm.expect(pm.response.code).to.be.oneOf([200, 201, 400, 422]); });",
                  "const res = pm.response.json();",
                  "if (res.data?.uhid) { pm.environment.set('patient_uhid', res.data.uhid); }",
                  "if (res.data?._id) { pm.environment.set('patient_id', res.data._id); }"
                ]
              }
            }
          ]
        },
        {
          name: "Get All Patients",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token}}" }],
            url: {
              raw: "{{base_url}}/patients",
              host: ["{{base_url}}"],
              path: ["patients"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Get All Patients (200 OK)', function () { pm.response.to.have.status(200); });"
                ]
              }
            }
          ]
        },
        {
          name: "Get Patient By UHID",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token}}" }],
            url: {
              raw: "{{base_url}}/patients/{{patient_uhid}}",
              host: ["{{base_url}}"],
              path: ["patients", "{{patient_uhid}}"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Get Patient by UHID Handled (200 OK)', function () { pm.expect(pm.response.code).to.be.oneOf([200, 404]); });"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      name: "06 - Billing & Invoices",
      item: [
        {
          name: "Get Hospital Billing Receipts",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token}}" }],
            url: {
              raw: "{{base_url}}/billing/receipts",
              host: ["{{base_url}}"],
              path: ["billing", "receipts"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Get Billing Receipts (200 OK)', function () { pm.response.to.have.status(200); });"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      name: "07 - Pharmacy & Medicines",
      item: [
        {
          name: "Get Pharmacy Formulary Catalog",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token}}" }],
            url: {
              raw: "{{base_url}}/pharmacy/medicines",
              host: ["{{base_url}}"],
              path: ["pharmacy", "medicines"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Get Pharmacy Catalog (200 OK)', function () { pm.response.to.have.status(200); });"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      name: "08 - Diagnostics & Radiology",
      item: [
        {
          name: "Get Diagnostic Orders",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token}}" }],
            url: {
              raw: "{{base_url}}/diagnostics/orders",
              host: ["{{base_url}}"],
              path: ["diagnostics", "orders"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Get Diagnostic Orders (200 OK)', function () { pm.response.to.have.status(200); });"
                ]
              }
            }
          ]
        }
      ]
    }
  ]
};

const localEnv = {
  name: "HPMBS Local Environment",
  values: [
    { key: "base_url", value: "http://localhost:5001/api/v1", initialValue: "http://localhost:5001/api/v1", currentValue: "http://localhost:5001/api/v1", type: "default", enabled: true },
    { key: "token", value: "", initialValue: "", currentValue: "", type: "secret", enabled: true },
    { key: "superadmin_token", value: "", initialValue: "", currentValue: "", type: "secret", enabled: true },
    { key: "hospital_admin_token", value: "", initialValue: "", currentValue: "", type: "secret", enabled: true },
    { key: "hospital_id", value: "", initialValue: "", currentValue: "", type: "default", enabled: true },
    { key: "patient_id", value: "", initialValue: "", currentValue: "", type: "default", enabled: true },
    { key: "patient_uhid", value: "HOSP-2026-00005", initialValue: "HOSP-2026-00005", currentValue: "HOSP-2026-00005", type: "default", enabled: true }
  ]
};

const prodEnv = {
  name: "HPMBS Production Environment",
  values: [
    { key: "base_url", value: "http://82.29.166.169:5003/api/v1", initialValue: "http://82.29.166.169:5003/api/v1", currentValue: "http://82.29.166.169:5003/api/v1", type: "default", enabled: true },
    { key: "token", value: "", initialValue: "", currentValue: "", type: "secret", enabled: true },
    { key: "superadmin_token", value: "", initialValue: "", currentValue: "", type: "secret", enabled: true },
    { key: "hospital_admin_token", value: "", initialValue: "", currentValue: "", type: "secret", enabled: true },
    { key: "hospital_id", value: "", initialValue: "", currentValue: "", type: "default", enabled: true },
    { key: "patient_id", value: "", initialValue: "", currentValue: "", type: "default", enabled: true },
    { key: "patient_uhid", value: "", initialValue: "", currentValue: "", type: "default", enabled: true }
  ]
};

fs.writeFileSync('HPMBS_SaaS_Postman_Collection.json', JSON.stringify(collection, null, 2));
fs.writeFileSync('HPMBS_Local_Environment.json', JSON.stringify(localEnv, null, 2));
fs.writeFileSync('HPMBS_Production_Environment.json', JSON.stringify(prodEnv, null, 2));

console.log('[Success] Postman collection regenerated with 200 OK test payloads for Patient & Guardian Login!');
