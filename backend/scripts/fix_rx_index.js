import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');
  const collection = mongoose.connection.db.collection('prescriptions');
  const indexes = await collection.indexes();
  console.log('Prescriptions indexes before:', indexes);

  for (const idx of indexes) {
    if (idx.name === 'prescriptionNo_1') {
      await collection.dropIndex('prescriptionNo_1');
      console.log('Dropped global unique index prescriptionNo_1');
    }
  }

  const indexesAfter = await collection.indexes();
  console.log('Prescriptions indexes after:', indexesAfter);
  await mongoose.disconnect();
}

run().catch(console.error);
