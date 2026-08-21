import mongoose from 'mongoose';

async function main() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');
  const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  const users = await User.find({}).select('_id name email role additionalRoles').lean();
  for (const u of users) {
    const notifs = await Notification.find({
      $or: [
        { recipientUserId: u._id },
        { recipientRole: { $in: [u.role, 'ALL'] } }
      ],
      isCleared: { $ne: true }
    }).lean();
    if (notifs.length > 0) {
      console.log(`User: ${u.name} (${u.email}) [Role: ${u.role}] -> ${notifs.length} notifs:`);
      for (const n of notifs) {
        console.log(`   - Title: "${n.title}" | RecipientRole: ${n.recipientRole} | TargetModule: ${n.targetModule} | RecipientUserId: ${n.recipientUserId}`);
      }
    }
  }
  process.exit(0);
}
main();
