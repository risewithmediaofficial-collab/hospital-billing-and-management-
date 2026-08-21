import mongoose from 'mongoose';

async function cleanNotifications() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');
  const res = await mongoose.connection.db.collection('notifications').updateMany(
    { isRead: false },
    { $set: { isRead: true, isCleared: true, readAt: new Date() } }
  );
  console.log(`Cleaned ${res.modifiedCount} stale unread notifications.`);
  await mongoose.disconnect();
}

cleanNotifications().catch(console.error);
