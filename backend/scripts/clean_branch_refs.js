import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { Patient } from '../src/models/Patient.js';
import { Invoice } from '../src/models/Invoice.js';

await mongoose.connect('mongodb://localhost:27017/hpmbs_db');
const targetId = new mongoose.Types.ObjectId('6a883442d1a70ba8764700ac');

const uRes = await User.updateMany(
  { branchId: targetId },
  { $unset: { branchId: 1, assignedBranchCode: 1 } }
);

const pRes = await Patient.updateMany(
  { branchId: targetId },
  { $unset: { branchId: 1, registrationBranchCode: 1 } }
);

const iRes = await Invoice.updateMany(
  { branchId: targetId },
  { $unset: { branchId: 1 } }
);

console.log(`Cleaned references - Users: ${uRes.modifiedCount}, Patients: ${pRes.modifiedCount}, Invoices: ${iRes.modifiedCount}`);
process.exit(0);
