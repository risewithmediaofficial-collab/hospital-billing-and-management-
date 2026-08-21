import mongoose from 'mongoose';
import { WorkflowService } from '../src/domains/workflow/workflow.service.js';

async function test() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');
  const res = await WorkflowService.getPendingWork({ role: 'SUPER_ADMIN' });
  console.log('Pending work for SUPER_ADMIN:', {
    total: res.total,
    byPath: res.byPath,
    tasksCount: res.tasks.length,
    tasks: res.tasks.map(t => ({ type: t.type, linkedPath: t.linkedPath, title: t.title }))
  });
  await mongoose.disconnect();
}

test().catch(console.error);
