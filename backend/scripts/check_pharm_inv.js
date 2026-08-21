import mongoose from 'mongoose';
import { Invoice } from '../src/models/Invoice.js';

async function checkPharmInv() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');
  const invs = await Invoice.find({ invoiceNo: /PHARM/ }).lean();
  console.log('Pharm Invoices found:', invs);
  await mongoose.disconnect();
}

checkPharmInv().catch(console.error);
