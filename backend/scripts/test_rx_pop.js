import mongoose from 'mongoose';
import { Prescription } from '../src/models/Prescription.js';

async function testRx() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');
  try {
    const rx = await Prescription.find({ dispenseStatus: { $in: ['PENDING_DISPENSE', 'PARTIALLY_DISPENSED'] } }).populate('patientId').lean();
    console.log('Rx found:', rx.length);
    for (const r of rx) {
      console.log('r._id:', r._id, 'r.prescriptionNo:', r.prescriptionNo, 'r.patientId:', r.patientId);
    }
  } catch (err) {
    console.error('Error finding rx:', err);
  }
  await mongoose.disconnect();
}

testRx().catch(console.error);
