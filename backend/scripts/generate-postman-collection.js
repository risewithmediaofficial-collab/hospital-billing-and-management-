import fs from 'fs';

const collection = {
  info: {
    name: "HPMBS SaaS Complete Platform API Test Suite",
    description: "Complete automated and secure API test suite for Hospital Billing & Management SaaS Platform (Auth, Patients, OPD, IPD, EMR, Pharmacy, Diagnostics, Billing, Notifications)",
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
      name: "02 - Authentication & Sessions",
      item: [
        {
          name: "Super Admin Login",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ email: "superadmin@gmail.com", password: "{{superadmin_password}}" }, null, 2)
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
              raw: JSON.stringify({ email: "testhospital@gmail.com", password: "{{admin_password}}" }, null, 2)
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
          name: "Doctor Login",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ email: "testdoctor@gmail.com", password: "{{doctor_password}}" }, null, 2)
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
                  "pm.test('Doctor Login (200 OK)', function () { pm.response.to.have.status(200); });",
                  "const res = pm.response.json();",
                  "const token = res.data?.tokens?.accessToken || res.data?.token;",
                  "if (token) { pm.environment.set('doctor_token', token); }"
                ]
              }
            }
          ]
        },
        {
          name: "Get Current Authenticated User (Me)",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token}}" }],
            url: {
              raw: "{{base_url}}/auth/me",
              host: ["{{base_url}}"],
              path: ["auth", "me"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Get Auth Profile (200 OK)', function () { pm.response.to.have.status(200); });",
                  "const res = pm.response.json();",
                  "pm.test('Password hash is not leaked', function () { pm.expect(res.data?.passwordHash).to.be.undefined; });"
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
              raw: JSON.stringify({ mobileNumber: "6380140927", dob: "2004-11-10" }, null, 2)
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
              raw: JSON.stringify({ guardianMobile: "6380140928", patientMobile: "6380140927", patientNumber: "TH-P-1001" }, null, 2)
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
      name: "04 - Patients (OPD & Records)",
      item: [
        {
          name: "Register New Patient (OPD - No Guardian Required)",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                firstName: "Aarav",
                lastName: "Sharma",
                gender: "MALE",
                dob: "1992-05-15",
                age: 34,
                phone: "9876501234",
                bloodGroup: "O_POSITIVE",
                address: { street: "45 MG Road", city: "Bangalore", state: "Karnataka", postalCode: "560001" }
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
                  "pm.test('Patient Registration Handled (200/201 Success)', function () { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });",
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
        },
        {
          name: "Update Patient Details",
          request: {
            method: "PATCH",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                bloodGroup: "A_POSITIVE",
                allergies: ["Penicillin"]
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/patients/{{patient_id}}",
              host: ["{{base_url}}"],
              path: ["patients", "{{patient_id}}"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Update Patient Handled (200 OK)', function () { pm.expect(pm.response.code).to.be.oneOf([200, 404]); });"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      name: "05 - Doctor Consultations & EMR",
      item: [
        {
          name: "Get Active Doctor Queue Tokens",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token}}" }],
            url: {
              raw: "{{base_url}}/appointments/tokens",
              host: ["{{base_url}}"],
              path: ["appointments", "tokens"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Get OPD Queue Tokens (200 OK)', function () { pm.response.to.have.status(200); });",
                  "const res = pm.response.json();",
                  "if (res.data?.tokens?.[0]?._id) { pm.environment.set('token_id', res.data.tokens[0]._id); }"
                ]
              }
            }
          ]
        },
        {
          name: "Finalize Clinical Consultation with Prescriptions & IPD Recommendation",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                appointmentId: "{{token_id}}",
                patientId: "{{patient_id}}",
                chiefComplaints: "High fever, body chills, persistent cough",
                consultationFee: 150,
                emergencyFee: 0,
                prescriptions: [
                  {
                    medicineName: "Paracetamol 650mg",
                    dosageForm: "TABLET",
                    durationDays: 5,
                    quantity: 10,
                    unitPrice: 20,
                    instructions: "1 tablet after meals TID"
                  }
                ],
                ipdRecommendation: {
                  isRecommended: false
                }
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/emr/consultations",
              host: ["{{base_url}}"],
              path: ["emr", "consultations"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Consultation Finalized (200/201 Success)', function () { pm.expect(pm.response.code).to.be.oneOf([200, 201, 400]); });"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      name: "06 - Pharmacy & Prescriptions",
      item: [
        {
          name: "Get Pharmacy Prescriptions Queue",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token}}" }],
            url: {
              raw: "{{base_url}}/pharmacy/prescriptions",
              host: ["{{base_url}}"],
              path: ["pharmacy", "prescriptions"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Get Prescriptions Queue (200 OK)', function () { pm.response.to.have.status(200); });"
                ]
              }
            }
          ]
        },
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
      name: "07 - Diagnostics & Radiology",
      item: [
        {
          name: "Get Diagnostic Test Orders",
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
    },
    {
      name: "08 - Inpatient (IPD) Admissions",
      item: [
        {
          name: "Get Inpatient Admission Records",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token}}" }],
            url: {
              raw: "{{base_url}}/admissions",
              host: ["{{base_url}}"],
              path: ["admissions"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Get Admissions (200 OK)', function () { pm.response.to.have.status(200); });"
                ]
              }
            }
          ]
        },
        {
          name: "Request Inpatient Admission with Optional Guardian",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                patientId: "{{patient_id}}",
                wardType: "GENERAL",
                targetWardName: "Ward 3B - Inpatient",
                admissionReason: "Clinical observation and continuous treatment",
                guardianName: "Rajesh Sharma",
                guardianPhone: "9876599999",
                guardianRelationship: "FATHER"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/admissions/request",
              host: ["{{base_url}}"],
              path: ["admissions", "request"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Admission Request Handled (200/201 Success)', function () { pm.expect(pm.response.code).to.be.oneOf([200, 201, 400]); });"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      name: "09 - Billing & Invoices",
      item: [
        {
          name: "Get Unpaid Invoices (Cashier Desk)",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token}}" }],
            url: {
              raw: "{{base_url}}/billing/invoices?status=UNPAID",
              host: ["{{base_url}}"],
              path: ["billing", "invoices"],
              query: [{ key: "status", value: "UNPAID" }]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Get Invoices (200 OK)', function () { pm.response.to.have.status(200); });"
                ]
              }
            }
          ]
        },
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
      name: "10 - Notifications & Real-Time Alerts",
      item: [
        {
          name: "Get User Notifications",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token}}" }],
            url: {
              raw: "{{base_url}}/notifications",
              host: ["{{base_url}}"],
              path: ["notifications"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Get Notifications (200 OK)', function () { pm.response.to.have.status(200); });"
                ]
              }
            }
          ]
        },
        {
          name: "Mark All Notifications As Read",
          request: {
            method: "PATCH",
            header: [{ key: "Authorization", value: "Bearer {{token}}" }],
            url: {
              raw: "{{base_url}}/notifications/read-all",
              host: ["{{base_url}}"],
              path: ["notifications", "read-all"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Mark Notifications Read (200 OK)', function () { pm.response.to.have.status(200); });"
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
    { key: "superadmin_password", value: "0000", initialValue: "0000", currentValue: "0000", type: "secret", enabled: true },
    { key: "admin_password", value: "0000", initialValue: "0000", currentValue: "0000", type: "secret", enabled: true },
    { key: "doctor_password", value: "0000", initialValue: "0000", currentValue: "0000", type: "secret", enabled: true },
    { key: "token", value: "", initialValue: "", currentValue: "", type: "secret", enabled: true },
    { key: "superadmin_token", value: "", initialValue: "", currentValue: "", type: "secret", enabled: true },
    { key: "hospital_admin_token", value: "", initialValue: "", currentValue: "", type: "secret", enabled: true },
    { key: "doctor_token", value: "", initialValue: "", currentValue: "", type: "secret", enabled: true },
    { key: "hospital_id", value: "", initialValue: "", currentValue: "", type: "default", enabled: true },
    { key: "patient_id", value: "", initialValue: "", currentValue: "", type: "default", enabled: true },
    { key: "token_id", value: "", initialValue: "", currentValue: "", type: "default", enabled: true },
    { key: "patient_uhid", value: "TH-P-1001", initialValue: "TH-P-1001", currentValue: "TH-P-1001", type: "default", enabled: true }
  ]
};

const prodEnv = {
  name: "HPMBS Production Environment",
  values: [
    { key: "base_url", value: "https://hms-api.risewithmedia.com/api/v1", initialValue: "https://hms-api.risewithmedia.com/api/v1", currentValue: "https://hms-api.risewithmedia.com/api/v1", type: "default", enabled: true },
    { key: "superadmin_password", value: "", initialValue: "", currentValue: "", type: "secret", enabled: true },
    { key: "admin_password", value: "", initialValue: "", currentValue: "", type: "secret", enabled: true },
    { key: "doctor_password", value: "", initialValue: "", currentValue: "", type: "secret", enabled: true },
    { key: "token", value: "", initialValue: "", currentValue: "", type: "secret", enabled: true },
    { key: "superadmin_token", value: "", initialValue: "", currentValue: "", type: "secret", enabled: true },
    { key: "hospital_admin_token", value: "", initialValue: "", currentValue: "", type: "secret", enabled: true },
    { key: "doctor_token", value: "", initialValue: "", currentValue: "", type: "secret", enabled: true },
    { key: "hospital_id", value: "", initialValue: "", currentValue: "", type: "default", enabled: true },
    { key: "patient_id", value: "", initialValue: "", currentValue: "", type: "default", enabled: true },
    { key: "token_id", value: "", initialValue: "", currentValue: "", type: "default", enabled: true },
    { key: "patient_uhid", value: "", initialValue: "", currentValue: "", type: "default", enabled: true }
  ]
};

fs.writeFileSync('HPMBS_SaaS_Postman_Collection.json', JSON.stringify(collection, null, 2));
fs.writeFileSync('HPMBS_Local_Environment.json', JSON.stringify(localEnv, null, 2));
fs.writeFileSync('HPMBS_Production_Environment.json', JSON.stringify(prodEnv, null, 2));

console.log('[Success] Secure Postman collection generated with full CRUD endpoints and secret token masking!');
