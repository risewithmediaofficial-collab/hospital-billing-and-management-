import http from "http";

function request(method, path, body, headers = {}) {
  return new Promise((res, rej) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "localhost", port: 5001,
      path: `/api/v1${path}`, method,
      headers: {
        "Content-Type": "application/json",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        ...headers
      }
    };
    const req = http.request(options, r => {
      let d = "";
      r.on("data", c => d += c);
      r.on("end", () => {
        try { res({ status: r.statusCode, body: JSON.parse(d) }); }
        catch(e) { res({ status: r.statusCode, body: d }); }
      });
    });
    req.on("error", rej);
    if (data) req.write(data);
    req.end();
  });
}

console.log("Login as Hospital Admin...");
const login = await request("POST", "/auth/login", { email: "admin@citygeneral.com", password: "0000" });
if (login.status !== 200) { console.error("Login FAILED:", login.status, JSON.stringify(login.body)); process.exit(1); }
const token = login.body.token;
console.log("Login OK - Role:", login.body.user?.role);

const u1 = "+91 91234" + Math.floor(Math.random()*90000+10000);
const g1 = "+91 99876" + Math.floor(Math.random()*90000+10000);
console.log("Testing OBJECT address (Postman format)...");
const p1 = await request("POST", "/patients", {
  firstName: "Ravi", lastName: "Kumar", gender: "MALE", age: 30, dob: "1994-06-01", bloodGroup: "O_POSITIVE",
  phone: u1, guardianPhone: g1,
  address: { street: "123 Main St", city: "Metropolis", state: "NY", postalCode: "10001" },
  chiefComplaints: "Fever"
}, { Authorization: "Bearer " + token });
console.log("Status:", p1.status);
if (p1.status === 201) { console.log("PASS - UHID:", p1.body.data.uhid, "| Address:", p1.body.data.address); }
else if (p1.status === 409) { console.log("PASS (duplicate detection OK)"); }
else { console.error("FAIL:", p1.status, JSON.stringify(p1.body)); process.exit(1); }

const u2 = "+91 81234" + Math.floor(Math.random()*90000+10000);
const g2 = "+91 88876" + Math.floor(Math.random()*90000+10000);
console.log("Testing STRING address (backward compatible)...");
const p2 = await request("POST", "/patients", {
  firstName: "Priya", lastName: "Sharma", gender: "FEMALE", age: 25, dob: "1999-03-15", bloodGroup: "A+",
  phone: u2, guardianPhone: g2, address: "456 Oak Avenue, Delhi", chiefComplaints: "Checkup"
}, { Authorization: "Bearer " + token });
console.log("Status:", p2.status);
if (p2.status === 201) { console.log("PASS - UHID:", p2.body.data.uhid, "| Address:", p2.body.data.address); }
else if (p2.status === 409) { console.log("PASS (duplicate detection OK)"); }
else { console.error("FAIL:", p2.status, JSON.stringify(p2.body)); process.exit(1); }

console.log("ALL PATIENT ADDRESS TESTS PASSED!");
