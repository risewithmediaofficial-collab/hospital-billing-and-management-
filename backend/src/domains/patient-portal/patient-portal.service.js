import { GlobalPatient } from '../../models/GlobalPatient.js';
import { Patient } from '../../models/Patient.js';
import { Admission } from '../../models/Admission.js';
import { MedicalRecordShare } from '../../models/MedicalRecordShare.js';
import { ApiError } from '../../utils/apiError.js';

export class PatientPortalService {

  /**
   * Get all hospitals a patient has registered at (via GlobalPatient).
   * Includes admission status per hospital.
   */
  static async getPatientHospitals(userId) {
    const globalPatient = await GlobalPatient.findOne({ patientUserId: userId })
      .populate('hospitalMemberships.hospitalId', 'name address contactPhone');

    if (!globalPatient) {
      return { hospitals: [], globalPatientId: null };
    }

    const hospitalsData = await Promise.all(
      globalPatient.hospitalMemberships.map(async (membership) => {
        const hospital = membership.hospitalId;

        const admissions = await Admission.find({ patientId: membership.localPatientId })
          .sort({ admissionNumber: 1 })
          .select('admissionNumber admissionReference status admittedAt dischargedAt wardType bedNumber targetWardName careTeamAssigned')
          .lean();

        const activeAdmission = admissions.find(a => a.status === 'ADMITTED' || a.status === 'ADMISSION_REQUESTED');

        return {
          hospitalId: hospital?._id,
          hospitalName: hospital?.name || 'Unknown Hospital',
          hospitalPhone: hospital?.contactPhone,
          localPatientId: membership.localPatientId,
          localUhid: membership.localUhid,
          joinedAt: membership.joinedAt,
          lastVisitAt: membership.lastVisitAt,
          hasActiveAdmission: !!activeAdmission,
          activeAdmission: activeAdmission || null,
          totalAdmissions: admissions.length,
          admissions,
        };
      })
    );

    hospitalsData.sort((a, b) => (b.hasActiveAdmission ? 1 : 0) - (a.hasActiveAdmission ? 1 : 0));

    return {
      globalPatientId: globalPatient.globalPatientId,
      firstName: globalPatient.firstName,
      lastName: globalPatient.lastName,
      hospitals: hospitalsData,
    };
  }

  static async getActiveAdmissionContext(userId) {
    const globalPatient = await GlobalPatient.findOne({ patientUserId: userId });
    if (!globalPatient) return null;

    const activeMembership = globalPatient.hospitalMemberships.find(m => m.hasActiveAdmission && m.activeAdmissionId);
    if (!activeMembership) return null;

    const admission = await Admission.findById(activeMembership.activeAdmissionId)
      .populate('doctorId', 'name specialization phone avatarUrl cabinNo')
      .populate('assignedNurseId', 'name role phone')
      .populate('assignedCaretakerId', 'name role phone')
      .lean();

    const { CareTeamAssignment } = await import('../../models/CareTeamAssignment.js');
    const careTeam = await CareTeamAssignment.find({
      admissionId: activeMembership.activeAdmissionId,
      removedAt: null,
    }).populate('userId', 'name role specialization phone').lean();

    return {
      hospitalId: activeMembership.hospitalId,
      localPatientId: activeMembership.localPatientId,
      localUhid: activeMembership.localUhid,
      admission,
      careTeam,
    };
  }

  static async shareRecord(userId, shareData) {
    const { fromHospitalId, toHospitalId, toDoctorId, recordType, recordId, recordDescription, shareType, expiresAt } = shareData;

    const globalPatient = await GlobalPatient.findOne({ patientUserId: userId });
    if (!globalPatient) {
      throw new ApiError(404, 'Global patient identity not found', null, 'NOT_FOUND');
    }

    const fromMembership = globalPatient.hospitalMemberships.find(
      m => String(m.hospitalId) === String(fromHospitalId)
    );
    if (!fromMembership) {
      throw new ApiError(403, 'You do not have a patient record at the source hospital.', null, 'FORBIDDEN');
    }

    const { Hospital } = await import('../../models/Hospital.js');
    const { User } = await import('../../models/User.js');
    const [fromHospital, toHospital, toDoctor] = await Promise.all([
      Hospital.findById(fromHospitalId).select('name').lean(),
      Hospital.findById(toHospitalId).select('name').lean(),
      User.findById(toDoctorId).select('name').lean(),
    ]);

    const share = await MedicalRecordShare.create({
      globalPatientId: globalPatient._id,
      patientUserId: userId,
      fromHospitalId,
      fromHospitalName: fromHospital?.name || '',
      toHospitalId,
      toHospitalName: toHospital?.name || '',
      toDoctorId,
      toDoctorName: toDoctor?.name || '',
      recordType,
      recordId,
      recordDescription: recordDescription || '',
      shareType: shareType || 'ONCE',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      patientConsentAt: new Date(),
      status: 'ACTIVE',
    });

    try {
      const { socketManager } = await import('../../events/socketManager.js');
      socketManager.emitToUser(String(toDoctorId), 'patient:record_shared', {
        shareId: share._id,
        patientName: `${globalPatient.firstName} ${globalPatient.lastName}`,
        recordType,
        recordDescription,
        fromHospitalName: fromHospital?.name,
        sharedAt: new Date(),
      });
    } catch (e) {
      console.error('[ShareRecord/Socket]', e.message);
    }

    return share;
  }

  static async revokeShare(shareId, userId) {
    const share = await MedicalRecordShare.findOne({ _id: shareId, patientUserId: userId });
    if (!share) {
      throw new ApiError(404, 'Shared record not found or you do not have permission to revoke it.', null, 'NOT_FOUND');
    }
    share.status = 'REVOKED';
    share.revokedAt = new Date();
    share.revokedByUserId = userId;
    await share.save();
    return share;
  }

  static async getSharedRecords(userId) {
    const globalPatient = await GlobalPatient.findOne({ patientUserId: userId });
    if (!globalPatient) return [];
    return await MedicalRecordShare.find({ globalPatientId: globalPatient._id })
      .sort({ createdAt: -1 })
      .populate('toDoctorId', 'name specialization')
      .lean();
  }

  static async logRecordView(shareId, viewerUser, ipAddress = '') {
    const share = await MedicalRecordShare.findById(shareId);
    if (!share || share.status !== 'ACTIVE') {
      throw new ApiError(403, 'This shared record is no longer accessible.', null, 'ACCESS_REVOKED');
    }
    if (share.shareType === 'UNTIL_DATE' && share.expiresAt && new Date() > share.expiresAt) {
      await MedicalRecordShare.updateOne({ _id: shareId }, { $set: { status: 'EXPIRED' } });
      throw new ApiError(403, 'Access to this shared record has expired.', null, 'ACCESS_EXPIRED');
    }
    await MedicalRecordShare.updateOne(
      { _id: shareId },
      {
        $push: {
          accessLog: {
            viewedByUserId: viewerUser._id || viewerUser.id,
            viewedByName: viewerUser.name || '',
            viewedAt: new Date(),
            ipAddress,
          }
        }
      }
    );
    return share;
  }

  static async resolvePatientForUser(user) {
    if (!user) return null;
    const { Patient } = await import('../../models/Patient.js');
    let patient = null;
    if (user.uhid) {
      patient = await Patient.findOne({ uhid: user.uhid }).populate('hospitalId').populate('branchId');
    }
    if (!patient && user.phone) {
      const cleanPhone = user.phone.replace(/\D/g, '');
      patient = await Patient.findOne({
        $or: [
          { phone: user.phone },
          { phone: { $regex: cleanPhone, $options: 'i' } },
          ...(cleanPhone.length >= 7 ? [{ phone: { $regex: cleanPhone.slice(-7), $options: 'i' } }] : [])
        ]
      }).populate('hospitalId').populate('branchId');
    }
    if (!patient && user.hospitalId) {
      patient = await Patient.findOne({ hospitalId: user.hospitalId }).populate('hospitalId').populate('branchId');
    }
    if (!patient) {
      patient = await Patient.findOne({}).populate('hospitalId').populate('branchId');
    }
    return patient;
  }

  static async getDashboard(user) {
    const patient = await this.resolvePatientForUser(user);
    if (!patient) {
      return {
        patient: null,
        activeAdmission: null,
        opdToken: null,
        pendingDiagnostics: { labCount: 0, radiologyCount: 0 },
        outstandingBalance: 0,
      };
    }

    const { Admission } = await import('../../models/Admission.js');
    const activeAdmission = await Admission.findOne({
      patientId: patient._id,
      status: { $in: ['ADMITTED', 'ADMISSION_REQUESTED'] }
    }).populate('doctorId', 'name specialization phone cabinNo').lean();

    return {
      patient,
      activeAdmission: activeAdmission || null,
      opdToken: null,
      pendingDiagnostics: { labCount: 0, radiologyCount: 0 },
      outstandingBalance: 0,
    };
  }

  static async getTreatmentHistory(user) {
    const patient = await this.resolvePatientForUser(user);
    if (!patient) return [];
    const { Admission } = await import('../../models/Admission.js');
    const admissions = await Admission.find({ patientId: patient._id }).sort({ createdAt: -1 }).lean();
    return admissions;
  }

  static async getPrescriptions(user) {
    const patient = await this.resolvePatientForUser(user);
    if (!patient) return [];
    try {
      const { Prescription } = await import('../../models/Prescription.js');
      return await Prescription.find({ patientId: patient._id }).sort({ createdAt: -1 }).lean();
    } catch (e) {
      return [];
    }
  }

  static async getReports(user, category) {
    const patient = await this.resolvePatientForUser(user);
    if (!patient) return [];
    try {
      const { LabRequest } = await import('../../models/LabRequest.js');
      const query = { patientId: patient._id };
      if (category) query.requestType = category;
      return await LabRequest.find(query).sort({ createdAt: -1 }).lean();
    } catch (e) {
      return [];
    }
  }

  static async getBilling(user) {
    const patient = await this.resolvePatientForUser(user);
    if (!patient) return { bills: [], totalOutstanding: 0 };
    try {
      const { Bill } = await import('../../models/Bill.js');
      const bills = await Bill.find({ patientId: patient._id }).sort({ createdAt: -1 }).lean();
      const totalOutstanding = bills.reduce((acc, b) => acc + (b.dueAmount || b.balanceAmount || 0), 0);
      return { bills, totalOutstanding };
    } catch (e) {
      return { bills: [], totalOutstanding: 0 };
    }
  }
}
