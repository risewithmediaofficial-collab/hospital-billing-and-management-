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
        phone: data.phone,
        email: data.email || '',
        nationalId: data.nationalId || '',
        address: data.address,
        city: data.city || 'Metropolis',
        allergies: data.allergies || [],
        emergencyContact: data.emergencyContact || { name: 'Family Contact', phone: data.phone, relation: 'Family' },
        category: (data.category || 'GENERAL').toUpperCase(),
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${uhid}`,
      });

      // Auto-provision User login account for Patient Portal
      try {
        const userEmail = data.email && data.email.trim() ? data.email.toLowerCase().trim() : `${uhid.toLowerCase()}@hospital.local`;
        const userPassword = data.portalPassword || data.phone || 'Patient123!';
        const bcrypt = (await import('bcryptjs')).default;
        const passwordHash = await bcrypt.hash(userPassword, 12);
        const { User } = await import('../../models/User.js');

        const existingUser = await User.findOne({
          $or: [
            { email: userEmail },
            { phone: data.phone },
            { uhid },
          ],
        });

        if (!existingUser) {
          await User.create({
            hospitalId,
            branchId,
            name: `${data.firstName} ${data.lastName}`,
            email: userEmail,
            phone: data.phone,
            uhid,
            passwordHash,
            assignedPasswordHint: userPassword,
            role: 'PATIENT',
            status: 'ACTIVE',
            isActive: true,
          });
        }
      } catch (userErr) {
        console.error('[Patient User Auto-Provision Notice]', userErr.message);
      }

      return patient;
    } catch (err) {
      console.error('[Patient Registration Error]', err);
      if (err.name === 'ValidationError') {
        const issues = Object.values(err.errors).map((e) => e.message);
        throw new ApiError(422, `Patient validation failed: ${issues.join(', ')}`, issues, 'VALIDATION_ERROR');
      }
      throw new ApiError(500, err.message || 'Failed to register patient in database', null, 'REGISTRATION_FAILED');
    }
  }

  static async getPatients(user, query = '') {
    let hospitalId = user?.hospitalId;
    if (!hospitalId) {
      const defaultHospital = await Hospital.findOne({});
      hospitalId = defaultHospital?._id;
    }

    const filter = hospitalId ? { hospitalId } : {};
    if (query) {
      filter.$or = [
        { uhid: { $regex: query, $options: 'i' } },
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
      ];
    }
    return await Patient.find(filter).sort({ createdAt: -1 }).limit(50);
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
