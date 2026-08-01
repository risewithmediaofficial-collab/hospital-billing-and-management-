import { GuardianLink } from '../../models/GuardianLink.js';
import { Patient } from '../../models/Patient.js';
import { PatientPortalService } from '../patient-portal/patient-portal.service.js';
import { DoctorUpdate } from '../../models/DoctorUpdate.js';
import { ApiError } from '../../utils/apiError.js';

export class GuardianPortalService {
  /**
   * Get all approved patients linked to the guardian user.
   */
  static async getLinkedPatients(user) {
    const links = await GuardianLink.find({
      guardianUserId: user.id,
      accessStatus: 'APPROVED',
    }).populate('patientId');

    return links.map((link) => ({
      linkId: link._id,
      relationship: link.relationship,
      permissions: link.permissions,
      patient: link.patientId,
    }));
  }

  /**
   * Get Guardian dashboard summary for a specific patient.
   */
  static async getDashboard(user, targetPatientId = null) {
    // 1. Find guardian link
    let link = null;
    if (targetPatientId) {
      link = await GuardianLink.findOne({
        guardianUserId: user.id,
        patientId: targetPatientId,
        accessStatus: 'APPROVED',
      }).populate('patientId');
    } else {
      link = await GuardianLink.findOne({
        guardianUserId: user.id,
        accessStatus: 'APPROVED',
      }).populate('patientId');
    }

    if (!link || !link.patientId) {
      // If no approved link exists, create or fetch pending status info
      const pendingLinks = await GuardianLink.find({ guardianUserId: user.id }).populate('patientId');
      return {
        hasLinkedPatient: false,
        pendingLinks,
        message: 'No active approved patient link found for this guardian account.',
      };
    }

    const patient = link.patientId;
    const permissions = link.permissions || {};

    // 2. Fetch Base Patient Summary
    const patientSummary = await PatientPortalService.getDashboard({
      id: user.id,
      role: 'PATIENT',
      hospitalId: user.hospitalId,
      email: patient.email,
      phone: patient.phone,
      name: patient.uhid,
    });

    // 3. Fetch Doctor Updates published for Guardian
    const doctorUpdates = permissions.doctorUpdates
      ? await DoctorUpdate.find({
          patientId: patient._id,
          visibility: { $in: ['GUARDIAN_ONLY', 'BOTH'] },
        })
          .sort({ createdAt: -1 })
          .populate('doctorId', 'name specialization')
      : [];

    return {
      hasLinkedPatient: true,
      relationship: link.relationship,
      permissions: link.permissions,
      patientSummary: permissions.patientOverview ? patientSummary : { patientName: patient.firstName, status: patientSummary.currentStatus },
      doctorUpdates,
    };
  }

  /**
   * Request linking a patient to a guardian account.
   */
  static async requestLink(user, data) {
    const { patientUhid, relationship, notes } = data;
    const patient = await Patient.findOne({ hospitalId: user.hospitalId, uhid: patientUhid.toUpperCase() });
    if (!patient) {
      throw new ApiError(404, `No patient found with UHID: ${patientUhid}`, null, 'PATIENT_NOT_FOUND');
    }

    const existing = await GuardianLink.findOne({ guardianUserId: user.id, patientId: patient._id });
    if (existing) {
      throw new ApiError(400, `Guardian link already requested (Status: ${existing.accessStatus})`, null, 'ALREADY_EXISTS');
    }

    const link = await GuardianLink.create({
      hospitalId: user.hospitalId,
      branchId: user.branchId,
      patientId: patient._id,
      guardianUserId: user.id,
      relationship: relationship || 'OTHER',
      accessStatus: 'PENDING',
      notes: notes || '',
    });

    return link;
  }

  /**
   * Admin / Staff: List all guardian links for management.
   */
  static async listAllLinks(user) {
    return await GuardianLink.find({ hospitalId: user.hospitalId })
      .populate('patientId')
      .populate('guardianUserId', 'name email phone')
      .sort({ createdAt: -1 });
  }

  /**
   * Admin / Staff: Update status & permissions of a guardian link.
   */
  static async updateLinkStatus(user, linkId, status, permissions = null) {
    const link = await GuardianLink.findById(linkId);
    if (!link) {
      throw new ApiError(404, 'Guardian link not found', null, 'NOT_FOUND');
    }

    link.accessStatus = status;
    if (status === 'APPROVED') {
      link.approvedBy = user.id;
      link.approvedAt = new Date();
    }
    if (permissions) {
      link.permissions = { ...link.permissions, ...permissions };
    }

    await link.save();
    return link;
  }
}
