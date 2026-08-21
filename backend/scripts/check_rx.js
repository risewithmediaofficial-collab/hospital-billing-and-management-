import mongoose from 'mongoose';
import { Prescription } from '../src/models/Prescription.js';

async function checkRx() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');
  const rxList = await Prescription.find({}).lean();
  console.log('Total Prescriptions in DB:', rxList.length);
  console.log(rxList.map(r => ({
    _id: r._id,
    prescriptionNo: r.prescriptionNo,
    dispenseStatus: r.dispenseStatus,
    hospitalId: r.hospitalId,
    patientId: r.patientId
  })));
  await mongoose.disconnect();
}

checkRx().catch(console.error);
