import mongoose from 'mongoose';
import { BillingService } from '../src/domains/billing/billing.service.js';
import { User } from '../src/models/User.js';

async function testDocReturn() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');

  const user = await User.findOne({ email: 'test@gmail.com' });

  try {
    const res = await BillingService.returnInvoiceToDepartment(
      '6a87f7441f0ece22193df17f',
      {
        targetDepartment: 'DOCTOR',
        reason: 'Doctor prescription review requested for patient complaint.',
        note: 'Doctor prescription review requested for patient complaint.',
      },
      user
    );
    console.log('Doc Return Success:', res);
  } catch (err) {
    console.error('Doc Return Error:', err);
  }

  await mongoose.disconnect();
}

testDocReturn().catch(console.error);
