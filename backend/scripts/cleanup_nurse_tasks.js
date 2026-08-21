import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');
  
  // Find tasks where assignedNurseId is a Doctor
  const { User } = await import('../src/models/User.js');
  const { NurseTask } = await import('../src/models/NurseTask.js');
  
  const doctorUsers = await User.find({ role: 'DOCTOR' }).select('_id name');
  const doctorIds = doctorUsers.map(d => d._id);
  
  const updated = await NurseTask.updateMany(
    { assignedNurseId: { $in: doctorIds } },
    { $set: { assignedNurseId: null, assignedNurseName: 'Available Nursing Staff' } }
  );
  
  console.log('Cleaned up doctor-assigned nurse tasks:', updated);
  await mongoose.disconnect();
}

run().catch(console.error);
