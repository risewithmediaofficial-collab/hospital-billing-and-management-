import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { encryptField, encryptionEnabled, isEncrypted } from '../src/utils/fieldEncryption.js';
import { Patient } from '../src/models/Patient.js';
import { Admission } from '../src/models/Admission.js';
import { Appointment } from '../src/models/Appointment.js';
import { Consultation } from '../src/models/Consultation.js';
import { DiagnosticOrder } from '../src/models/DiagnosticOrder.js';
import { DoctorUpdate } from '../src/models/DoctorUpdate.js';
import { PatientRequest } from '../src/models/PatientRequest.js';
import { GuardianLink } from '../src/models/GuardianLink.js';

const dryRun = process.argv.includes('--dry-run');
const migrations = [
  { model: Patient, fields: ['chiefComplaints', 'nationalId', 'address', 'emergencyContact.name', 'emergencyContact.phone'] },
  { model: Admission, fields: ['admissionReason'] },
  { model: Appointment, fields: ['chiefComplaints'] },
  { model: Consultation, fields: ['chiefComplaints', 'historyOfPresentIllness', 'clinicalExamination', 'provisionalDiagnosis', 'finalDiagnosis', 'treatmentPlan', 'doctorsNotes', 'adviceToPatient'] },
  { model: DiagnosticOrder, fields: ['clinicalNotes', 'cancellationReason', 'correctionNote', 'reportSummary'] },
  { model: DoctorUpdate, fields: ['content'] },
  { model: PatientRequest, fields: ['notes', 'rejectedReason'] },
  { model: GuardianLink, fields: ['notes'] },
];

const getPath = (object, path) => path.split('.').reduce((value, part) => value?.[part], object);

const run = async () => {
  if (!encryptionEnabled()) throw new Error('A valid FIELD_ENCRYPTION_KEY is required for migration');
  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  let scanned = 0;
  let changedDocuments = 0;
  let changedFields = 0;

  for (const { model, fields } of migrations) {
    const operations = [];
    const cursor = model.collection.find({});
    let collectionChanged = 0;
    for await (const document of cursor) {
      scanned += 1;
      const set = {};
      for (const field of fields) {
        const value = getPath(document, field);
        if (typeof value !== 'string' || value === '' || isEncrypted(value)) continue;
        set[field] = encryptField(value);
        changedFields += 1;
      }
      if (Object.keys(set).length === 0) continue;
      changedDocuments += 1;
      collectionChanged += 1;
      if (!dryRun) operations.push({ updateOne: { filter: { _id: document._id }, update: { $set: set } } });
      if (operations.length === 250) {
        await model.collection.bulkWrite(operations, { ordered: false });
        operations.length = 0;
      }
    }
    if (!dryRun && operations.length) await model.collection.bulkWrite(operations, { ordered: false });
    console.log(`${model.collection.collectionName}: ${collectionChanged} document(s) ${dryRun ? 'would be encrypted' : 'encrypted'}`);
  }
  console.log(`Migration ${dryRun ? 'dry run' : 'completed'}: ${scanned} scanned, ${changedDocuments} document(s), ${changedFields} field(s).`);
};

run()
  .catch((error) => {
    console.error(`Encryption migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
