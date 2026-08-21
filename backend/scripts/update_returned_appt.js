import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');
  const res = await mongoose.connection.db.collection('appointments').updateOne(
    { _id: new mongoose.Types.ObjectId('6a87e5851f0ece22193dbc89') },
    { $set: { status: 'WAITING_DEPARTMENT' } }
  );
  console.log('Appointment updated to WAITING_DEPARTMENT:', res);
  await mongoose.disconnect();
}

run().catch(console.error);
