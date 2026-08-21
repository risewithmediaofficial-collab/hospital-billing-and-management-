import mongoose from 'mongoose';
import { BillingService } from '../src/domains/billing/billing.service.js';
import { Invoice } from '../src/models/Invoice.js';
import { User } from '../src/models/User.js';

async function testMadhuReturn() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');

  const inv = await Invoice.findById('6a87f7441f0ece22193df17f').populate('patientId');
  console.log('Madhu Invoice:', inv?._id, inv?.invoiceNo, inv?.patientId?.firstName, inv?.items);

  const user = await User.findOne({ email: 'test@gmail.com' });
  console.log('User:', user?._id, user?.email);

  try {
    const res = await BillingService.returnInvoiceToDepartment(
      '6a87f7441f0ece22193df17f',
      {
        targetDepartment: 'PHARMACY',
        reason: 'Medicine unit price is ₹0 or missing',
        note: 'Medicine unit price is ₹0 or missing. Please verify selling price and re-dispense.',
      },
      user
    );
    console.log('Return Result:', res);
  } catch (err) {
    console.error('Error during return:', err);
  }

  await mongoose.disconnect();
}

testMadhuReturn().catch(console.error);
