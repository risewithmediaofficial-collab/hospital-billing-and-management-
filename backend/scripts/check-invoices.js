import { connectDB } from '../src/config/database.js';
await connectDB();
const { Invoice } = await import('./src/models/Invoice.js');
const invoices = await Invoice.find({}).populate('patientId').lean();
console.log('Total invoices:', invoices.length);
invoices.forEach(inv => {
  const p = inv.patientId;
  console.log(' -', inv.invoiceNo, '|', (p && p.firstName) || 'N/A', '|', inv.status, '|', inv.grandTotal);
  inv.items.forEach(item => console.log('    *', item.description, '-', item.totalPrice));
});
process.exit(0);
