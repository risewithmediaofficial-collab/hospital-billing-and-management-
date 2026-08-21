import mongoose from 'mongoose';
import { AuthService } from '../src/domains/auth/auth.service.js';
import { WorkflowService } from '../src/domains/workflow/workflow.service.js';
import { Notification } from '../src/models/Notification.js';
import { User } from '../src/models/User.js';

async function testStaff() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');

  const madhu = await User.findOne({ email: 'test@gmail.com' }).lean();
  console.log('Madhu user from DB:', { _id: madhu._id, email: madhu.email, role: madhu.role, hospitalId: madhu.hospitalId });

  const staff = await AuthService.getHospitalStaff(madhu);
  console.log('Staff returned for Madhu:', staff.map(s => ({ name: s.name, email: s.email, hospitalId: s.hospitalId })));

  const pendingWork = await WorkflowService.getPendingWork(madhu);
  console.log('Pending work returned for Madhu:', { total: pendingWork.total, byPath: pendingWork.byPath, tasksCount: pendingWork.tasks?.length });

  const notifs = await Notification.find({ hospitalId: madhu.hospitalId, isRead: false });
  console.log('Unread notifications for Madhu hospitalId:', notifs.length);

  const allUnreadNotifs = await Notification.find({ isRead: false });
  console.log('Total unread notifications in DB across all hospitals:', allUnreadNotifs.length);

  await mongoose.disconnect();
}

testStaff().catch(console.error);
