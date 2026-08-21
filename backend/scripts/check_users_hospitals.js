import mongoose from 'mongoose';

async function check() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');
  
  console.log('=== HOSPITALS ===');
  const hospitals = await mongoose.connection.db.collection('hospitals').find({}).toArray();
  console.log(hospitals.map(h => ({ _id: h._id, name: h.name, domain: h.domain, subdomain: h.subdomain })));

  console.log('=== USERS ===');
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  console.log(users.map(u => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    hospitalId: u.hospitalId,
    branchId: u.branchId,
  })));

  console.log('=== NOTIFICATIONS SUMMARY ===');
  const notifications = await mongoose.connection.db.collection('notifications').find({ isRead: false }).toArray();
  console.log('Total unread in DB:', notifications.length);
  const byHosp = {};
  for (const n of notifications) {
    const k = String(n.hospitalId || 'NO_HOSPITAL');
    byHosp[k] = (byHosp[k] || 0) + 1;
  }
  console.log('Unread notifications by hospitalId:', byHosp);

  await mongoose.disconnect();
}

check().catch(console.error);
