import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');
  const res = await mongoose.connection.db.collection('branches').updateOne(
    { _id: new mongoose.Types.ObjectId('6a87d3985db7c5c789e3ff27') },
    { $set: { name: 'test hospital 2 Main Branch' } }
  );
  console.log('Branch update result:', res);
  await mongoose.disconnect();
}

run().catch(console.error);
