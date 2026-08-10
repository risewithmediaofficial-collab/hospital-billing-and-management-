import mongoose from 'mongoose';
import { Patient } from '../src/models/Patient.js';

const listPatients = async () => {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');
  const pats = await Patient.find({}).select('uhid firstName lastName phone dob emergencyContact');
  console.log('PATIENTS IN DB:');
  pats.forEach(p => console.log(`UHID: ${p.uhid} | Name: ${p.firstName} ${p.lastName} | Phone: ${p.phone} | DOB: ${p.dob} | GuardianPhone: ${p.emergencyContact?.phone}`));
  await mongoose.disconnect();
};

listPatients();
