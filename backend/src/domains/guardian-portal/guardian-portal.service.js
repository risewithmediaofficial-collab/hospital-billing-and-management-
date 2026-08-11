import { GuardianLink } from '../../models/GuardianLink.js';
import { Patient } from '../../models/Patient.js';
import { PatientPortalService } from '../patient-portal/patient-portal.service.js';
import { DoctorUpdate } from '../../models/DoctorUpdate.js';
import { ApiError } from '../../utils/apiError.js';

export class GuardianPortalService {
  /**
   * Get all approved patients linked to the guardian user.
   */
  /**
   * Get all approved patients linked to the guardian user.
   */
  static async getLinkedPatients(user) {
    // 1. Auto-approve any existing pending links for this user
    await GuardianLink.updateMany(
      { guardianUserId: user.id, accessStatus: 'PENDING' },
      { $set: { accessStatus: 'APPROVED', approvedAt: new Date() } }
    );

    // 2. Auto-discover patient matches if guardian phone or UHID match
    try {
      const { User } = await import('../../models/User.js');
      const guardianUserDoc = await User.findById(user.id);
      if (guardianUserDoc) {
        const phones = [guardianUserDoc.phone, ...(guardianUserDoc.loginIds || [])].filter(Boolean);
        const uhid = guardianUserDoc.uhid;
        
        const matchedPatients = await Patient.find({
          $or: [
            ...(phones.length ? [{ 'emergencyContact.phone': { $in: phones } }, { phone: { $in: phones } }] : []),
            ...(uhid ? [{ uhid }] : [])
          ]
        });

        for (const p of matchedPatients) {
          const exist = await GuardianLink.findOne({ guardianUserId: user.id, patientId: p._id });
          if (!exist) {
            await GuardianLink.create({
              hospitalId: p.hospitalId,
              branchId: p.branchId,
              patientId: p._id,
              guardianUserId: user.id,
              relationship: 'GUARDIAN',
              accessStatus: 'APPROVED',
              approvedAt: new Date(),
            });
          }
        }
      }
    } catch (err) {
      console.error('[GuardianPortal] Patient auto-discovery note:', err.message);
    }

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
    // Auto-approve any pending links
    await GuardianLink.updateMany(
      { guardianUserId: user.id, accessStatus: 'PENDING' },
      { $set: { accessStatus: 'APPROVED', approvedAt: new Date() } }
    );

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
      // Auto-fetch any linked patient for this guardian
      const links = await this.getLinkedPatients(user);
      if (links.length > 0 && links[0].patient) {
        link = await GuardianLink.findById(links[0].linkId).populate('patientId');
      }
    }

    if (!link || !link.patientId) {
      return {
        hasLinkedPatient: false,
        pendingLinks: [],
        message: 'No active patient link found for this guardian account.',
      };
    }

    const patient = link.patientId;
    const permissions = link.permissions || {};

    // 2. Fetch Base Patient Summary
    const patientSummary = await PatientPortalService.getDashboard({
      id: user.id,
      role: 'PATIENT',
      hospitalId: user.hospitalId || patient.hospitalId,
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
   * Request linking a patient to a guardian account (Auto-Approved immediately).
   */
  static async requestLink(user, data) {
    const { patientUhid, relationship, notes } = data;
    const cleanUhid = String(patientUhid || '').trim().toUpperCase();
    
    // Find patient by UHID across hospital or global
    let patient = await Patient.findOne({ uhid: cleanUhid });
    if (!patient) {
      throw new ApiError(404, `No patient found with UHID: ${cleanUhid}`, null, 'PATIENT_NOT_FOUND');
    }

    let link = await GuardianLink.findOne({ guardianUserId: user.id, patientId: patient._id });
    if (link) {
      link.accessStatus = 'APPROVED';
      link.approvedAt = new Date();
      link.relationship = relationship || link.relationship || 'GUARDIAN';
      await link.save();
    } else {
      link = await GuardianLink.create({
        hospitalId: user.hospitalId || patient.hospitalId,
        branchId: user.branchId || patient.branchId,
        patientId: patient._id,
        guardianUserId: user.id,
        relationship: relationship || 'GUARDIAN',
        accessStatus: 'APPROVED',
        approvedAt: new Date(),
        notes: notes || 'Auto-approved on request',
      });
    }

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
