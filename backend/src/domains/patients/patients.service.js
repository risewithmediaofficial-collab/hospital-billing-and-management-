import { Patient } from '../../models/Patient.js';
import { Hospital } from '../../models/Hospital.js';
import { Branch } from '../../models/Branch.js';
import { ApiError } from '../../utils/apiError.js';

export class PatientsService {
  static async registerPatient(data, user) {
    // Auto-resolve hospitalId and branchId if missing from user context
    let hospitalId = user?.hospitalId;
    let branchId = user?.branchId;

    if (!hospitalId) {
      const defaultHospital = await Hospital.findOne({});
      hospitalId = defaultHospital?._id;
    }

    if (!branchId) {
      const defaultBranch = await Branch.findOne({ hospitalId });
      branchId = defaultBranch?._id;
    }

    if (!hospitalId || !branchId) {
      throw new ApiError(400, 'Hospital tenant or Branch context is not initialized. Please run system setup.', null, 'TENANT_NOT_INITIALIZED');
    }
    const patientPhone = String(data.phone || '').trim();
    const guardianPhone = String(data.guardianPhone || '').trim();
    if (!patientPhone || !guardianPhone) {
      throw new ApiError(422, 'Patient mobile number and guardian mobile number are required.', null, 'VALIDATION_ERROR');
    }
    if (patientPhone === guardianPhone) {
      throw new ApiError(422, 'Guardian mobile number must be different from the patient mobile number.', null, 'VALIDATION_ERROR');
    }

    // Generate unique, collision-free UHID auto-sequence (e.g. HOSP-2026-00001)
    const year = new Date().getFullYear();
    const totalCount = await Patient.countDocuments({});
    let seqNum = totalCount + 1;
    let uhid = `HOSP-${year}-${String(seqNum).padStart(5, '0')}`;

    // Guarantee uniqueness by checking database
    let existingPatient = await Patient.findOne({ uhid });
    while (existingPatient) {
      seqNum++;
      uhid = `HOSP-${year}-${String(seqNum).padStart(5, '0')}`;
      existingPatient = await Patient.findOne({ uhid });
    }

    // Format Date of Birth
    let parsedDob = new Date();
    if (data.dob) {
      parsedDob = new Date(data.dob);
    }

    // Calculate age if not provided
    let patientAge = data.age ? Number(data.age) : undefined;
    if (!patientAge && data.dob) {
      const birthYear = new Date(data.dob).getFullYear();
      patientAge = new Date().getFullYear() - birthYear;
    }

    try {
      const patient = await Patient.create({
        hospitalId,
        branchId,
        uhid,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: (data.gender || 'MALE').toUpperCase(),
        age: patientAge,
        dob: parsedDob,
        chiefComplaints: data.chiefComplaints || data.chiefComplaint || '',
        bloodGroup: data.bloodGroup || 'O+',
        phone: patientPhone,
        email: '',
        nationalId: data.nationalId || '',
        address: data.address,
        city: data.city || 'Metropolis',
        allergies: data.allergies || [],
        emergencyContact: data.emergencyContact || { name: 'Family Contact', phone: data.phone, relation: 'Family' },
        category: (data.category || 'GENERAL').toUpperCase(),
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${uhid}`,
      });

      // Auto-provision User login account for Patient Portal
      let patientUserAccount = null;
      let guardianUserAccount = null;

      try {
        const userEmail = `${uhid.toLowerCase()}@hospital.local`;
        const userPassword = patientPhone;
        const bcrypt = (await import('bcryptjs')).default;
        const passwordHash = await bcrypt.hash(userPassword, 12);
        const { User } = await import('../../models/User.js');
        const { GuardianLink } = await import('../../models/GuardianLink.js');

        const existingUser = await User.findOne({
          $or: [
            { email: userEmail },
            { role: 'PATIENT', loginIds: patientPhone },
            { uhid },
          ],
        });

        if (!existingUser) {
          patientUserAccount = await User.create({
            hospitalId,
            branchId,
            name: `${data.firstName} ${data.lastName}`,
            email: userEmail,
            phone: patientPhone,
            loginIds: [patientPhone],
            uhid,
            passwordHash,
            assignedPasswordHint: userPassword,
            role: 'PATIENT',
            status: 'ACTIVE',
            isActive: true,
          });
        }

        // Auto-provision Guardian User & APPROVED GuardianLink if guardian info provided
        const gPhone = guardianPhone;
        const gName = data.guardianName || data.emergencyContact?.name || `Guardian of ${data.firstName}`;
        const gRelation = (data.guardianRelationship || data.emergencyContact?.relation || 'FAMILY').toUpperCase();
        const validRelations = ['FATHER', 'MOTHER', 'SPOUSE', 'SIBLING', 'CHILD', 'LEGAL_GUARDIAN', 'CARETAKER', 'OTHER'];
        const relationship = validRelations.includes(gRelation) ? gRelation : 'OTHER';

        if (gPhone && gPhone.trim() && gPhone !== data.phone) {
          const cleanGPhone = gPhone.trim();
          const gEmail = data.guardianEmail && data.guardianEmail.trim()
            ? data.guardianEmail.toLowerCase().trim()
            : `guardian.${cleanGPhone.replace(/\D/g, '')}@hospital.local`;
          const gPassword = cleanGPhone;
          const gPasswordHash = await bcrypt.hash(gPassword, 12);

          let guardianUser = await User.findOne({
            $or: [{ phone: cleanGPhone }, { email: gEmail }],
            role: 'GUARDIAN',
          });

          if (!guardianUser) {
            guardianUser = await User.create({
              hospitalId,
              branchId,
              name: gName,
              email: gEmail,
              phone: cleanGPhone,
              loginIds: [patientPhone],
              passwordHash: gPasswordHash,
              assignedPasswordHint: gPassword,
              role: 'GUARDIAN',
              status: 'ACTIVE',
              isActive: true,
            });
          } else if (!guardianUser.loginIds?.includes(patientPhone)) {
            guardianUser.loginIds = [...(guardianUser.loginIds || []), patientPhone];
            await guardianUser.save();
          }

          guardianUserAccount = {
            id: guardianUser._id,
            name: guardianUser.name,
            phone: guardianUser.phone,
            username: patientPhone,
            password: gPassword,
            loginUrl: '/login',
          };

          // Auto-create pre-approved link
          const existingLink = await GuardianLink.findOne({
            guardianUserId: guardianUser._id,
            patientId: patient._id,
          });

          if (!existingLink) {
            await GuardianLink.create({
              hospitalId,
              branchId,
              patientId: patient._id,
              guardianUserId: guardianUser._id,
              relationship,
              accessStatus: 'APPROVED',
              approvedAt: new Date(),
              notes: 'Auto-linked & approved during patient registration',
            });
          }
        }
      } catch (userErr) {
        console.error('[Patient/Guardian User Auto-Provision Notice]', userErr.message);
      }

      const responseData = patient.toObject();
      responseData.patientCredentials = {
        username: patientPhone,
        password: patientPhone,
        loginUrl: '/login',
      };
      responseData.guardianCredentials = guardianUserAccount;
      return responseData;
    } catch (err) {
      console.error('[Patient Registration Error]', err);
      if (err.name === 'ValidationError') {
        const issues = Object.values(err.errors).map((e) => e.message);
        throw new ApiError(422, `Patient validation failed: ${issues.join(', ')}`, issues, 'VALIDATION_ERROR');
      }
      throw new ApiError(500, err.message || 'Failed to register patient in database', null, 'REGISTRATION_FAILED');
    }
  }

  static async getPatients(user, query = '', targetHospitalId = null) {
    let filter = {};
    if (targetHospitalId && targetHospitalId !== 'ALL') {
      filter.hospitalId = { $in: [targetHospitalId, String(targetHospitalId)] };
    } else if (user?.role !== 'SUPER_ADMIN' && user?.hospitalId) {
      const hId = typeof user.hospitalId === 'object' ? user.hospitalId._id : user.hospitalId;
      filter.hospitalId = { $in: [hId, String(hId)] };
    }

    if (query) {
      filter.$or = [
        { uhid: { $regex: query, $options: 'i' } },
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
      ];
    }
    return await Patient.find(filter).sort({ createdAt: -1 }).limit(200);
  }

  static async getPatientByUhid(uhid, user) {
    let hospitalId = user?.hospitalId;
    if (!hospitalId) {
      const defaultHospital = await Hospital.findOne({});
      hospitalId = defaultHospital?._id;
    }

    const filter = hospitalId ? { hospitalId, uhid: uhid.toUpperCase() } : { uhid: uhid.toUpperCase() };
    const patient = await Patient.findOne(filter);
    if (!patient) {
      throw new ApiError(404, `Patient with UHID ${uhid} not found`, null, 'NOT_FOUND');
    }
    return patient;
  }
}
