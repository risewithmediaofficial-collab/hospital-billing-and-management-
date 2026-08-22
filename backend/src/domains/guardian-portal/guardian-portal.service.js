import { GuardianLink } from '../../models/GuardianLink.js';
import { Patient } from '../../models/Patient.js';
import { PatientPortalService } from '../patient-portal/patient-portal.service.js';
import { DoctorUpdate } from '../../models/DoctorUpdate.js';
import { ApiError } from '../../utils/apiError.js';
import { RequestsService } from '../requests/requests.service.js';
import { Admission } from '../../models/Admission.js';

const GUARDIAN_RELATIONSHIPS = new Set([
  'FATHER', 'MOTHER', 'SPOUSE', 'SIBLING', 'CHILD', 'LEGAL_GUARDIAN', 'CARETAKER', 'OTHER',
]);

const normalizeRelationship = (value) => {
  const normalized = String(value || 'OTHER').trim().toUpperCase().replace(/[ -]+/g, '_');
  if (!GUARDIAN_RELATIONSHIPS.has(normalized)) {
    throw new ApiError(400, 'Invalid guardian relationship.', null, 'INVALID_RELATIONSHIP');
  }
  return normalized;
};

export class GuardianPortalService {
  /**
   * Get all approved patients linked to the guardian user.
   */
  static async getLinkedPatients(user) {
    // Auto-discovery is allowed only when this authenticated guardian's phone
    // is registered as the patient's emergency contact in the same hospital.
    try {
      const { User } = await import('../../models/User.js');
      const guardianUserDoc = await User.findOne({ _id: user.id, hospitalId: user.hospitalId });
      if (guardianUserDoc) {
        const phones = [guardianUserDoc.phone, ...(guardianUserDoc.loginIds || [])].filter(Boolean);
        const matchedPatients = await Patient.find({
          hospitalId: user.hospitalId,
          ...(phones.length ? { 'emergencyContact.phone': { $in: phones } } : { _id: null }),
        });

        for (const p of matchedPatients) {
          const exist = await GuardianLink.findOne({ hospitalId: user.hospitalId, guardianUserId: user.id, patientId: p._id });
          if (!exist) {
            await GuardianLink.create({
              hospitalId: p.hospitalId,
              branchId: p.branchId,
              patientId: p._id,
              guardianUserId: user.id,
              relationship: 'OTHER',
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
      hospitalId: user.hospitalId,
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
        hospitalId: user.hospitalId,
        guardianUserId: user.id,
        patientId: targetPatientId,
        accessStatus: 'APPROVED',
      }).populate('patientId');
    } else {
      link = await GuardianLink.findOne({
        hospitalId: user.hospitalId,
        guardianUserId: user.id,
        accessStatus: 'APPROVED',
      }).populate('patientId');
    }

    if (!link || !link.patientId) {
      // Auto-fetch any linked patient for this guardian
      const links = await this.getLinkedPatients(user);
      if (links.length > 0 && links[0].patient) {
        link = await GuardianLink.findOne({ _id: links[0].linkId, hospitalId: user.hospitalId }).populate('patientId');
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
      patientId: patient._id,
      hospitalId: user.hospitalId || patient.hospitalId,
      email: patient.email,
      phone: patient.phone,
      name: patient.uhid,
    });

    // 3. Fetch Doctor Updates published for Guardian
    const doctorUpdates = permissions.doctorUpdates
      ? await DoctorUpdate.find({
          hospitalId: user.hospitalId,
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

  /** Request a patient link. Manual UHID requests always remain pending. */
  static async requestLink(user, data) {
    const { patientUhid, relationship, notes } = data;
    const cleanUhid = String(patientUhid || '').trim().toUpperCase();
    
    const patient = await Patient.findOne({ hospitalId: user.hospitalId, uhid: cleanUhid });
    if (!patient) {
      throw new ApiError(404, `No patient found with UHID: ${cleanUhid}`, null, 'PATIENT_NOT_FOUND');
    }

    let link = await GuardianLink.findOne({ hospitalId: user.hospitalId, guardianUserId: user.id, patientId: patient._id });
    if (link) {
      if (link.accessStatus === 'APPROVED') return link;
      link.relationship = normalizeRelationship(relationship || link.relationship);
      link.notes = notes || link.notes || 'Guardian access requested; awaiting hospital approval';
      link.accessStatus = 'PENDING';
      link.approvedBy = null;
      link.approvedAt = null;
      await link.save();
    } else {
      link = await GuardianLink.create({
        hospitalId: user.hospitalId || patient.hospitalId,
        branchId: user.branchId || patient.branchId,
        patientId: patient._id,
        guardianUserId: user.id,
        relationship: normalizeRelationship(relationship),
        accessStatus: 'PENDING',
        approvedAt: null,
        notes: notes || 'Guardian access requested; awaiting hospital approval',
      });
    }

    return link;
  }

  static async submitDoctorMessage(user, data) {
    const patientId = String(data.patientId || '').trim();
    const messageType = String(data.messageType || '').trim().toUpperCase();
    if (!patientId || !['HISTORY', 'REMINDER'].includes(messageType)) {
      throw new ApiError(400, 'Patient and message type are required.', null, 'INVALID_GUARDIAN_MESSAGE');
    }

    const link = await GuardianLink.findOne({
      hospitalId: user.hospitalId,
      guardianUserId: user.id,
      patientId,
      accessStatus: 'APPROVED',
      liveAccessActive: { $ne: false },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    });
    if (!link) {
      throw new ApiError(403, 'An active approved guardian link is required.', null, 'GUARDIAN_ACCESS_REQUIRED');
    }
    if (link.permissions?.patientRequests === false) {
      throw new ApiError(403, 'Patient request permission is disabled for this guardian link.', null, 'GUARDIAN_PERMISSION_DENIED');
    }

    const activeAdmission = await Admission.findOne({
      ...(link.admissionId ? { _id: link.admissionId } : {}),
      hospitalId: link.hospitalId,
      branchId: link.branchId || user.branchId,
      patientId,
      status: 'ADMITTED',
      doctorId: { $ne: null },
    }).select('_id doctorId');
    if (!activeAdmission?.doctorId) {
      throw new ApiError(409, 'No attending doctor is assigned to an active admission.', null, 'ATTENDING_DOCTOR_REQUIRED');
    }

    const clip = (value, max = 1000) => String(value || '').trim().slice(0, max);
    const notes = messageType === 'HISTORY'
      ? `[Guardian Medical History] History: ${clip(data.historyNotes) || 'N/A'} | Previous medications: ${clip(data.previousMedications) || 'N/A'} | Allergies: ${clip(data.allergies, 500) || 'None reported'} | Urgent notes: ${clip(data.urgentNotes) || 'None'}`
      : `[Guardian Treatment Reminder] ${clip(data.notes) || 'Please review the patient treatment progress.'}`;

    return RequestsService.createRequest({
      patientId,
      requestType: 'DOCTOR',
      priority: messageType === 'REMINDER' ? 'HIGH' : 'MEDIUM',
      notes,
      guardianMessageType: messageType,
    }, {
      ...user,
      role: 'GUARDIAN',
      hospitalId: link.hospitalId,
      branchId: link.branchId || user.branchId,
    });
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
    const normalizedStatus = String(status || '').toUpperCase();
    if (!['APPROVED', 'REJECTED', 'SUSPENDED', 'REVOKED'].includes(normalizedStatus)) {
      throw new ApiError(400, 'Invalid guardian access status.', null, 'INVALID_STATUS');
    }
    const link = await GuardianLink.findOne({ _id: linkId, hospitalId: user.hospitalId });
    if (!link) {
      throw new ApiError(404, 'Guardian link not found', null, 'NOT_FOUND');
    }

    link.accessStatus = normalizedStatus;
    if (normalizedStatus === 'APPROVED') {
      link.approvedBy = user.id;
      link.approvedAt = new Date();
      link.liveAccessActive = true;
    } else {
      link.liveAccessActive = false;
      link.liveAccessDisabledAt = new Date();
    }
    if (permissions) {
      link.permissions = { ...link.permissions, ...permissions };
    }

    await link.save();
    return link;
  }
}
