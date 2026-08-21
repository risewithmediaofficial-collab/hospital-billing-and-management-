import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');
  const res = await mongoose.connection.db.collection('notifications').updateMany(
    { hospitalId: new mongoose.Types.ObjectId('6a87d3985db7c5c789e3ff15'), isRead: false },
    { $set: { isRead: true } }
  );
  console.log('Cleared notifications:', res);
  await mongoose.disconnect();
}

run().catch(console.error);
