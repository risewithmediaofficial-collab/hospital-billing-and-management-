import { Patient } from '../../models/Patient.js';
import { Hospital } from '../../models/Hospital.js';
import { Branch } from '../../models/Branch.js';
import { GlobalPatient } from '../../models/GlobalPatient.js';
import { ApiError } from '../../utils/apiError.js';

const pad = (n, len = 5) => String(n).padStart(len, '0');

export class PatientsService {

  /**
   * Check if a patient already exists in this hospital before registering.
   * Returns matches by phone, email, nationalId, or name+dob combo.
   */
  static async checkDuplicate(data, hospitalId) {
    const phone = String(data.phone || '').trim();
    const phoneDigits = phone.replace(/\D/g, '').slice(-10);
    const email = String(data.email || '').trim().toLowerCase();
    const nationalId = String(data.nationalId || '').trim();

    const orConditions = [];

    if (phoneDigits.length >= 8) {
      orConditions.push({ phone: { $regex: phoneDigits, $options: 'i' } });
    }
    if (email) orConditions.push({ email });
    if (nationalId) orConditions.push({ nationalId });

    // Name + DOB combo
    if (data.firstName && data.dob) {
      orConditions.push({
        firstName: { $regex: data.firstName.trim(), $options: 'i' },
        dob: {
          $gte: new Date(new Date(data.dob).setHours(0, 0, 0, 0)),
          $lte: new Date(new Date(data.dob).setHours(23, 59, 59, 999))
        }
      });
    }

    if (orConditions.length === 0) return [];

    const matches = await Patient.find({
      hospitalId,
      $or: orConditions,
    }).populate('activeAdmissionId', 'status admittedAt wardType bedNumber').sort({ createdAt: -1 }).limit(5);

    return matches;
  }

  /**
   * Search for a global patient by phone / email / globalPatientId (across all hospitals).
   * Used when a new hospital wants to register an existing global patient.
   */
  static async searchGlobalPatient(query) {
    if (!query || !query.trim()) {
      throw new ApiError(400, 'Search query is required', null, 'VALIDATION_ERROR');
    }
    const digits = query.trim().replace(/\D/g, '').slice(-10);
    const orConditions = [
      { primaryPhone: { $regex: digits, $options: 'i' } },
      { email: { $regex: query.trim(), $options: 'i' } },
      { globalPatientId: { $regex: query.trim(), $options: 'i' } },
    ];

    const globalPatients = await GlobalPatient.find({ $or: orConditions, isActive: true })
      .select('globalPatientId firstName lastName dob gender primaryPhone email bloodGroup hospitalMemberships')
      .limit(5);

    // Redact internal hospital patient IDs — only return membership count and hospital names
    return globalPatients.map(gp => ({
      _id: gp._id,
      globalPatientId: gp.globalPatientId,
      firstName: gp.firstName,
      lastName: gp.lastName,
      dob: gp.dob,
      gender: gp.gender,
      primaryPhone: gp.primaryPhone,
      email: gp.email,
      bloodGroup: gp.bloodGroup,
      hospitalCount: gp.hospitalMemberships.length,
      hospitals: gp.hospitalMemberships.map(m => ({
        hospitalName: m.hospitalName,
        localUhid: m.localUhid,
        joinedAt: m.joinedAt,
        hasActiveAdmission: m.hasActiveAdmission,
      })),
    }));
  }

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
    if (!patientPhone) {
      throw new ApiError(422, 'Patient mobile number is required.', null, 'VALIDATION_ERROR');
    }

    // --- DUPLICATE CHECK (unless allowForce is set) ---
    if (!data.allowForce) {
      const duplicates = await PatientsService.checkDuplicate({ ...data, phone: patientPhone }, hospitalId);
      if (duplicates.length > 0) {
        const err = new ApiError(
          409,
          'Possible duplicate patient found in this hospital. Review existing records or confirm this is a different person.',
          duplicates.map(p => ({
            _id: p._id,
            uhid: p.uhid,
            firstName: p.firstName,
            lastName: p.lastName,
            phone: p.phone,
            dob: p.dob,
            admissionStatus: p.admissionStatus,
            activeAdmissionId: p.activeAdmissionId,
            createdAt: p.createdAt,
          })),
          'POSSIBLE_DUPLICATE'
        );
        err.possibleDuplicate = true;
        throw err;
      }
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
        bloodGroup: (() => {
          const bg = String(data.bloodGroup || 'O+').toUpperCase().replace(/_/g, '').trim();
          if (bg === 'OPOSITIVE' || bg === 'O+') return 'O+';
          if (bg === 'ONEGATIVE' || bg === 'O-') return 'O-';
          if (bg === 'APOSITIVE' || bg === 'A+') return 'A+';
          if (bg === 'ANEGATIVE' || bg === 'A-') return 'A-';
          if (bg === 'BPOSITIVE' || bg === 'B+') return 'B+';
          if (bg === 'BNEGATIVE' || bg === 'B-') return 'B-';
          if (bg === 'ABPOSITIVE' || bg === 'AB+') return 'AB+';
          if (bg === 'ABNEGATIVE' || bg === 'AB-') return 'AB-';
          return 'O+';
        })(),
        phone: patientPhone,
        email: '',
        nationalId: data.nationalId || '',
        address: typeof data.address === 'object' && data.address !== null
          ? [data.address.street, data.address.city, data.address.state, data.address.postalCode].filter(Boolean).join(', ')
          : (data.address || 'General Registration'),
        city: data.city || 'Metropolis',
        allergies: data.allergies || [],
        emergencyContact: data.emergencyContact || { name: 'Family Contact', phone: data.phone, relation: 'Family' },
        category: (data.category || 'GENERAL').toUpperCase(),
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${uhid}`,
      });

      // --- GLOBAL IDENTITY LINKING ---
      let globalPatient = null;
      try {
        const hospital = await Hospital.findById(hospitalId).lean();
        const phoneDigits = patientPhone.replace(/\D/g, '').slice(-10);

        // Search for existing GlobalPatient
        globalPatient = await GlobalPatient.findOne({
          $or: [
            { primaryPhone: { $regex: phoneDigits, $options: 'i' } },
            ...(data.email ? [{ email: data.email.toLowerCase().trim() }] : []),
            ...(data.nationalId ? [{ nationalId: data.nationalId.trim() }] : []),
          ]
        });

        if (!globalPatient) {
          const gpCount = await GlobalPatient.countDocuments({});
          const gpYear = new Date().getFullYear();
          const globalPatientId = `GP-${gpYear}-${pad(gpCount + 1)}`;

          globalPatient = await GlobalPatient.create({
            globalPatientId,
            firstName: data.firstName,
            lastName: data.lastName,
            dob: parsedDob,
            gender: (data.gender || 'MALE').toUpperCase(),
            primaryPhone: patientPhone,
            email: data.email || '',
            nationalId: data.nationalId || '',
            bloodGroup: (() => {
              const bg = String(data.bloodGroup || 'O+').toUpperCase().replace(/_/g, '').trim();
              if (bg === 'OPOSITIVE' || bg === 'O+') return 'O+';
              if (bg === 'ONEGATIVE' || bg === 'O-') return 'O-';
              if (bg === 'APOSITIVE' || bg === 'A+') return 'A+';
              if (bg === 'ANEGATIVE' || bg === 'A-') return 'A-';
              if (bg === 'BPOSITIVE' || bg === 'B+') return 'B+';
              if (bg === 'BNEGATIVE' || bg === 'B-') return 'B-';
              if (bg === 'ABPOSITIVE' || bg === 'AB+') return 'AB+';
              if (bg === 'ABNEGATIVE' || bg === 'AB-') return 'AB-';
              return 'O+';
            })(),
            allergies: data.allergies || [],
            emergencyContact: data.emergencyContact || {},
            hospitalMemberships: [{
              hospitalId,
              hospitalName: hospital?.name || '',
              localPatientId: patient._id,
              localUhid: uhid,
              joinedAt: new Date(),
            }],
          });
        } else {
          // Existing global patient — add this hospital as new membership
          const alreadyMember = globalPatient.hospitalMemberships.some(
            m => String(m.hospitalId) === String(hospitalId)
          );
          if (!alreadyMember) {
            await GlobalPatient.updateOne({ _id: globalPatient._id }, {
              $push: {
                hospitalMemberships: {
                  hospitalId,
                  hospitalName: hospital?.name || '',
                  localPatientId: patient._id,
                  localUhid: uhid,
                  joinedAt: new Date(),
                }
              }
            });
          }
        }

        await Patient.updateOne({ _id: patient._id }, { $set: { globalPatientId: globalPatient._id } });
      } catch (gpErr) {
        console.error('[GlobalPatient Link Notice]', gpErr.message);
      }

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

          // Link patient user to GlobalPatient
          if (globalPatient && !globalPatient.patientUserId) {
            await GlobalPatient.updateOne({ _id: globalPatient._id }, { $set: { patientUserId: patientUserAccount._id } });
          }
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
              liveAccessActive: true,
              notes: 'Auto-linked & approved during patient registration',
            });
          }
        }
      } catch (userErr) {
        console.error('[Patient/Guardian User Auto-Provision Notice]', userErr.message);
      }

      const responseData = patient.toObject();
      responseData.globalPatientRef = globalPatient?.globalPatientId;
      responseData.patientCredentials = {
        username: patientPhone,
        password: patientPhone,
        loginUrl: '/login',
      };
      responseData.guardianCredentials = guardianUserAccount;
      return responseData;
    } catch (err) {
      if (err.possibleDuplicate) throw err;
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
