import bcrypt from 'bcryptjs';
import { Hospital } from '../../models/Hospital.js';
import { Branch } from '../../models/Branch.js';
import { User } from '../../models/User.js';
import { ROLES } from '../../config/constants.js';
import { ApiError } from '../../utils/apiError.js';

export class SaasService {
  static async registerHospital(data) {
    if (!data.contactEmail || !data.hospitalName) {
      throw new ApiError(400, 'Hospital name and contact email are required', null, 'VALIDATION_ERROR');
    }

    const cleanEmail = data.contactEmail.toLowerCase().trim();
    const existingEmail = await Hospital.findOne({ contactEmail: cleanEmail });
    if (existingEmail) {
      throw new ApiError(400, `A hospital application with email '${cleanEmail}' already exists`, null, 'DUPLICATE_EMAIL');
    }

    let rawSubdomain = data.subdomain || data.hospitalName;
    let subdomain = String(rawSubdomain).toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    if (!subdomain) {
      subdomain = `hosp${Date.now().toString(36)}`;
    }
    let code = subdomain.toUpperCase();

    const existingSubdomain = await Hospital.findOne({ subdomain });
    if (existingSubdomain) {
      subdomain = `${subdomain}${Math.floor(100 + Math.random() * 900)}`;
      code = subdomain.toUpperCase();
    }

    const hospital = await Hospital.create({
      name: data.hospitalName.trim(),
      code,
      subdomain,
      status: 'PENDING_APPROVAL',
      plan: data.plan || 'PROFESSIONAL',
      contactName: data.contactName || data.hospitalName || 'Hospital Administrator',
      contactEmail: cleanEmail,
      contactPhone: data.contactPhone || '+1 (555) 000-0000',
      licenseNumber: data.licenseNumber || `LIC-${Date.now()}`,
      address: {
        street: data.street || 'Main Medical St',
        city: data.city || 'Metropolis',
        state: data.state || 'NY',
        country: data.country || 'USA',
      },
      isActive: true,
    });

    return {
      hospital,
      adminInitialPassword: data.adminPassword || 'HospitalAdmin123!',
    };
  }

  static async getAllHospitals(user) {
    return await Hospital.find({ code: { $ne: 'PLATFORM-HQ' } }).sort({ createdAt: -1 });
  }

  static async approveHospital(hospitalId, user) {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      throw new ApiError(404, 'Hospital tenant record not found', null, 'NOT_FOUND');
    }

    hospital.status = 'APPROVED';
    await hospital.save();

    // Create Main Branch for this approved hospital
    let branch = await Branch.findOne({ hospitalId: hospital._id });
    if (!branch) {
      branch = await Branch.create({
        hospitalId: hospital._id,
        name: `${hospital.name} Main Branch`,
        branchCode: `${hospital.code}-MAIN`,
        phone: hospital.contactPhone || '+1 (555) 000-0000',
        email: hospital.contactEmail,
        address: hospital.address?.street || 'Main Medical St',
        city: hospital.address?.city || 'Metropolis',
        state: hospital.address?.state || 'NY',
        postalCode: '10001',
        isMainBranch: true,
      });
    }

    // Create initial Hospital Admin user account
    let adminUser = await User.findOne({ hospitalId: hospital._id, role: ROLES.HOSPITAL_ADMIN });
    if (!adminUser) {
      const defaultPassword = 'HospitalAdmin123!';
      const passwordHash = await bcrypt.hash(defaultPassword, 12);

      adminUser = await User.create({
        hospitalId: hospital._id,
        branchId: branch._id,
        name: hospital.contactName || 'Hospital Admin',
        email: hospital.contactEmail,
        passwordHash,
        assignedPasswordHint: defaultPassword,
        role: ROLES.HOSPITAL_ADMIN,
        phone: hospital.contactPhone || '+1 (555) 000-0000',
        status: 'ACTIVE',
      });
    }

    return {
      hospital,
      adminUser: {
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        tempPassword: 'HospitalAdmin123!',
      },
    };
  }

  static async updateHospitalStatus(hospitalId, status, user) {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      throw new ApiError(404, 'Hospital tenant record not found', null, 'NOT_FOUND');
    }

    hospital.status = status;
    await hospital.save();
    return hospital;
  }
}
