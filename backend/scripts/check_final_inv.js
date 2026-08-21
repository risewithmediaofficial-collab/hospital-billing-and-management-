import mongoose from 'mongoose';
import { Patient } from '../src/models/Patient.js';
import { Invoice } from '../src/models/Invoice.js';

async function checkFinalInv() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');
  const inv = await Invoice.findById('6a87f7441f0ece22193df17f').populate('patientId').lean();
  console.log('Final Madhu Invoice:', {
    invoiceNo: inv.invoiceNo,
    patientName: `${inv.patientId?.firstName} ${inv.patientId?.lastName}`,
    items: inv.items,
    subtotal: inv.subtotal,
    grandTotal: inv.grandTotal,
    balanceAmount: inv.balanceAmount,
    status: inv.status
  });
  await mongoose.disconnect();
}

checkFinalInv().catch(console.error);
