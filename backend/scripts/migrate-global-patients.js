/**
 * Migration Script: Backfill GlobalPatient records for all existing Patient documents.
 * Run once: node scripts/migrate-global-patients.js
 */
import mongoose from 'mongoose';
import { connectDB } from '../src/config/database.js';
import { Patient } from '../src/models/Patient.js';
import { GlobalPatient } from '../src/models/GlobalPatient.js';
import { Hospital } from '../src/models/Hospital.js';
import { User } from '../src/models/User.js';

const pad = (n, len = 5) => String(n).padStart(len, '0');
const year = new Date().getFullYear();

async function migrate() {
  await connectDB();
  console.log('[Migration] Connected to MongoDB');

  const patients = await Patient.find({ globalPatientId: null }).lean();
  console.log(`[Migration] Found ${patients.length} patients without globalPatientId`);

  let created = 0;
  let linked = 0;
  let errors = 0;

  for (const patient of patients) {
    try {
      const phone = String(patient.phone || '').trim();
      const email = String(patient.email || '').trim().toLowerCase();

      // Check if GlobalPatient already exists for this phone/email
      let globalPatient = null;
      if (phone && phone !== '+1 (555) 000-0000') {
        const phoneDigits = phone.replace(/\D/g, '').slice(-10);
        globalPatient = await GlobalPatient.findOne({
          $or: [
            { primaryPhone: { $regex: phoneDigits, $options: 'i' } },
            ...(email ? [{ email }] : []),
          ]
        });
      }

      const hospital = await Hospital.findById(patient.hospitalId).lean();

      if (!globalPatient) {
        // Generate sequential globalPatientId
        const count = await GlobalPatient.countDocuments({});
        const globalPatientId = `GP-${year}-${pad(count + 1)}`;

        // Find patient User for login link
        const patientUser = await User.findOne({ uhid: patient.uhid, role: 'PATIENT' }).lean();

        globalPatient = await GlobalPatient.create({
          globalPatientId,
          firstName: patient.firstName || 'Unknown',
          lastName: patient.lastName || '',
          dob: patient.dob,
          gender: patient.gender || 'MALE',
          primaryPhone: phone || '+1 (555) 000-0000',
          email: email || '',
          bloodGroup: patient.bloodGroup || 'O+',
          allergies: patient.allergies || [],
          emergencyContact: patient.emergencyContact || {},
          patientUserId: patientUser?._id || null,
          hospitalMemberships: [
            {
              hospitalId: patient.hospitalId,
              hospitalName: hospital?.name || '',
              localPatientId: patient._id,
              localUhid: patient.uhid,
              joinedAt: patient.createdAt || new Date(),
            }
          ],
        });
        created++;
        console.log(`  ✅ Created GlobalPatient ${globalPatient.globalPatientId} for ${patient.firstName} ${patient.lastName} (UHID: ${patient.uhid})`);
      } else {
        // Add hospital membership if not already there
        const alreadyMember = globalPatient.hospitalMemberships.some(
          (m) => String(m.localPatientId) === String(patient._id)
        );
        if (!alreadyMember) {
          await GlobalPatient.updateOne(
            { _id: globalPatient._id },
            {
              $push: {
                hospitalMemberships: {
                  hospitalId: patient.hospitalId,
                  hospitalName: hospital?.name || '',
                  localPatientId: patient._id,
                  localUhid: patient.uhid,
                  joinedAt: patient.createdAt || new Date(),
                }
              }
            }
          );
          linked++;
          console.log(`  🔗 Linked ${patient.uhid} to existing GlobalPatient ${globalPatient.globalPatientId}`);
        }
      }

      // Update Patient with globalPatientId reference
      await Patient.updateOne({ _id: patient._id }, { $set: { globalPatientId: globalPatient._id } });

    } catch (err) {
      console.error(`  ❌ Error on patient ${patient.uhid}: ${err.message}`);
      errors++;
    }
  }

  console.log('\n======================================================');
  console.log(`✨ Migration Complete!`);
  console.log(`   Created: ${created} new GlobalPatient records`);
  console.log(`   Linked:  ${linked} existing patients to GlobalPatient`);
  console.log(`   Errors:  ${errors}`);
  console.log('======================================================');
  await mongoose.disconnect();
}

migrate();
