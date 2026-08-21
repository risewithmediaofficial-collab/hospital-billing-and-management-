import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect('mongodb://localhost:27017/hpmbs_db');

const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }));

const docUsers = await User.find({ role: 'DOCTOR' }).select('_id').lean();
const docIds = docUsers.map((u) => u._id);
console.log('Doctor User IDs:', docIds);

const res = await Notification.deleteMany({
  recipientUserId: { $in: docIds },
  title: {
    $in: [
      'Medicines Dispensed',
      'Work queued — staff unavailable',
      'New Bill Pending',
      'Pharmacy Dispensed & Billed',
      'Pharmacy Clearance',
      'Pharmacy Clearance (External Purchase)',
      'Invoice Generated',
      'Payment Collected',
      'Payment Received',
      'Bill Ready (Post-Injection)',
      'Bill Ready',
      'Bill Generation Requested',
      'New Injection / Procedure Task (Token #1)',
      'New Treatment Request: Inj. Diclofenac (75mg IM Stat)',
    ],
  },
});

console.log('Deleted rogue doctor notifications:', res.deletedCount);
process.exit(0);
