import { Hospital } from '../../models/Hospital.js';
import { Branch } from '../../models/Branch.js';
import { Department } from '../../models/Department.js';
import { User } from '../../models/User.js';
import { Role } from '../../models/Role.js';
import { ROLES } from '../../config/constants.js';
import { ApiError } from '../../utils/apiError.js';

export class SetupService {
  static async checkSetupStatus() {
    const hospitalCount = await Hospital.countDocuments();
    return {
      isInitialized: hospitalCount > 0,
      hospitalCount,
    };
  }

  static async registerHospitalTenant(data) {
    const existingHospital = await Hospital.findOne({ code: data.hospitalCode.toUpperCase() });
    if (existingHospital) {
      throw new ApiError(400, `Hospital with code '${data.hospitalCode}' already exists`, null, 'DUPLICATE_CODE');
    }

    const hospital = await Hospital.create({
      name: data.hospitalName,
      code: data.hospitalCode.toUpperCase(),
      email: data.email,
      phone: data.phone,
      address: data.address,
    });

    const branch = await Branch.create({
      hospitalId: hospital._id,
      name: data.branchName,
      branchCode: data.branchCode.toUpperCase(),
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      isMainBranch: true,
    });

    // Create default departments
    const defaultDepts = [
      { name: 'General Medicine / OPD', code: 'OPD', type: 'CLINICAL' },
      { name: 'Cardiology', code: 'CARD', type: 'CLINICAL' },
      { name: 'Emergency & Triage', code: 'EMG', type: 'CLINICAL' },
      { name: 'Inpatient Wards (IPD)', code: 'IPD', type: 'CLINICAL' },
      { name: 'Diagnostic Laboratory', code: 'LAB', type: 'DIAGNOSTIC' },
      { name: 'Radiology & PACS', code: 'RAD', type: 'DIAGNOSTIC' },
      { name: 'Central Pharmacy', code: 'PHM', type: 'PHARMACY' },
      { name: 'Administration & Billing', code: 'ADM', type: 'ADMINISTRATIVE' },
    ];

    const departments = await Department.insertMany(
      defaultDepts.map((d) => ({
        hospitalId: hospital._id,
        branchId: branch._id,
        ...d,
      }))
    );

    // Create Admin User
    const adminUser = await User.create({
      hospitalId: hospital._id,
      branchId: branch._id,
      departmentId: departments.find((d) => d.code === 'ADM')?._id,
      name: data.adminName,
      email: data.adminEmail.toLowerCase(),
      phone: data.phone,
      passwordHash: data.adminPassword,
      role: ROLES.HOSPITAL_ADMIN,
    });

    return {
      hospital,
      branch,
      adminUser: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      },
    };
  }
}
