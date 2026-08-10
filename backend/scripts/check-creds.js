import mongoose from 'mongoose';
import { User } from '../src/models/User.js';

const check = async () => {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');
  const users = await User.find({}).select('email role assignedPasswordHint name');
  console.log('USER CREDENTIALS IN DATABASE:');
  users.forEach(u => console.log(`Email: ${u.email} | Role: ${u.role} | PasswordHint: ${u.assignedPasswordHint}`));
  await mongoose.disconnect();
};

check();
