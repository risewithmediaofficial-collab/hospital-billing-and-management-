import mongoose from 'mongoose';
import { BillingService } from '../src/domains/billing/billing.service.js';
import { Invoice } from '../src/models/Invoice.js';
import { User } from '../src/models/User.js';

async function testReturn() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');

  const inv = await Invoice.findOne({ invoiceNo: 'INV-2026-00001' }).populate('patientId');
  console.log('Invoice found:', inv?._id, inv?.invoiceNo, inv?.status, inv?.hospitalId);

  const user = await User.findOne({ email: 'test@gmail.com' });
  console.log('User found:', user?._id, user?.email, user?.role);

  try {
    const res = await BillingService.returnInvoiceToDepartment(
      inv._id,
      {
        targetDepartment: 'PHARMACY',
        reason: 'Medicine unit price is ₹0 or missing',
        note: 'Medicine unit price is ₹0 or missing. Please verify selling price and re-dispense.',
      },
      user
    );
    console.log('Success return result:', res);
  } catch (err) {
    console.error('Error during returnInvoiceToDepartment:', err);
  }

  await mongoose.disconnect();
}

testReturn().catch(console.error);
