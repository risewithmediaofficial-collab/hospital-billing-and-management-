import mongoose from 'mongoose';
import { Invoice } from '../src/models/Invoice.js';
import { Patient } from '../src/models/Patient.js';

async function findMadhuInv() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');
  const patients = await Patient.find({ firstName: /Madhu/i }).lean();
  console.log('Patients matching Madhu:', patients.map(p => ({ _id: p._id, name: `${p.firstName} ${p.lastName}`, uhid: p.uhid, hospitalId: p.hospitalId })));

  const invoices = await Invoice.find({}).populate('patientId').lean();
  console.log('All Invoices:', invoices.map(i => ({
    _id: i._id,
    invoiceNo: i.invoiceNo,
    patientName: `${i.patientId?.firstName || ''} ${i.patientId?.lastName || ''}`,
    status: i.status,
    hospitalId: i.hospitalId,
    items: i.items
  })));

  await mongoose.disconnect();
}

findMadhuInv().catch(console.error);
