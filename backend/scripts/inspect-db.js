import { connectDB } from "../src/config/database.js";
import { User } from "../src/models/User.js";
import { Hospital } from "../src/models/Hospital.js";

async function inspect() {
  await connectDB();
  const users = await User.find({}).populate("hospitalId");
  console.log("\n====================================================");
  console.log(` ALL USERS IN DATABASE (${users.length}):`);
  console.log("====================================================");
  users.forEach(u => {
    console.log(` - [${u.role}] ${u.name} <${u.email}> | Status: ${u.status} | Hosp: ${u.hospitalId?.name || u.hospitalId}`);
  });

  const hospitals = await Hospital.find({});
  console.log("\n====================================================");
  console.log(` ALL HOSPITALS IN DATABASE (${hospitals.length}):`);
  console.log("====================================================");
  hospitals.forEach(h => {
    console.log(` - ${h.name} (${h.code}) | ID: ${h._id} | Status: ${h.status} | Active: ${h.isActive}`);
  });
  process.exit(0);
}
inspect().catch(console.error);
