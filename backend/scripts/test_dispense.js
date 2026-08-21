import mongoose from 'mongoose';
import { PharmacyService } from '../src/domains/pharmacy/pharmacy.service.js';
import { Prescription } from '../src/models/Prescription.js';
import { User } from '../src/models/User.js';

async function testDispense() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');

  const user = await User.findOne({ email: 'test@gmail.com' });
  const rx = await Prescription.findById('6a87f7441f0ece22193df16d');
  console.log('Rx before dispense:', rx.dispenseStatus, rx.medicines);

  try {
    const res = await PharmacyService.dispense(
      '6a87f7441f0ece22193df16d',
      {
        items: [
          {
            medicineName: 'xyz',
            dosageForm: 'TABLET',
            qty: 10,
            unitPrice: 10,
            totalPrice: 100,
          },
        ],
        totalMedicineCharge: 100,
        pharmacyNotes: 'Dispensed with 10 rs per tab',
      },
      user
    );
    console.log('Dispense result:', res);
  } catch (err) {
    console.error('Dispense error:', err);
  }

  const { Invoice } = await import('../src/models/Invoice.js');
  const inv = await Invoice.findById('6a87f7441f0ece22193df17f').lean();
  console.log('Invoice after dispense:', inv);

  await mongoose.disconnect();
}

testDispense().catch(console.error);
