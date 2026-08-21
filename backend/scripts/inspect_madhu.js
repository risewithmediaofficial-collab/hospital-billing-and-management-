import mongoose from 'mongoose';

async function inspect() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');
  
  const patients = await mongoose.connection.db.collection('patients').find({ firstName: /madhu/i }).toArray();
  console.log('--- PATIENTS ---');
  console.log(patients.map(p => ({ _id: p._id, uhid: p.uhid, name: `${p.firstName} ${p.lastName}`, hospitalId: p.hospitalId })));

  const patientIds = patients.map(p => p._id);

  const appointments = await mongoose.connection.db.collection('appointments').find({ patientId: { $in: patientIds } }).toArray();
  console.log('--- APPOINTMENTS ---');
  console.log(appointments.map(a => ({ _id: a._id, status: a.status, tokenNumber: a.tokenNumber, hospitalId: a.hospitalId })));

  const prescriptions = await mongoose.connection.db.collection('prescriptions').find({ patientId: { $in: patientIds } }).toArray();
  console.log('--- PRESCRIPTIONS ---');
  console.log(prescriptions.map(pr => ({ _id: pr._id, prescriptionNo: pr.prescriptionNo, dispenseStatus: pr.dispenseStatus, chargeStatus: pr.chargeStatus })));

  const invoices = await mongoose.connection.db.collection('invoices').find({ patientId: { $in: patientIds } }).toArray();
  console.log('--- INVOICES ---');
  console.log(invoices.map(i => ({ _id: i._id, invoiceNo: i.invoiceNo, status: i.status, grandTotal: i.grandTotal, items: i.items })));

  const notifications = await mongoose.connection.db.collection('notifications').find({ isRead: false }).toArray();
  console.log('--- UNREAD NOTIFICATIONS ---');
  console.log(notifications.map(n => ({ _id: n._id, title: n.title, targetModule: n.targetModule, targetRoute: n.targetRoute, recipientRole: n.recipientRole, isRead: n.isRead })));

  await mongoose.disconnect();
}

inspect().catch(console.error);
