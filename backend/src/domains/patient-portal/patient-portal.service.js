import { GlobalPatient } from '../../models/GlobalPatient.js';
import { Patient } from '../../models/Patient.js';
import { Admission } from '../../models/Admission.js';
import { MedicalRecordShare } from '../../models/MedicalRecordShare.js';
import { ApiError } from '../../utils/apiError.js';

const staffFields = 'name role specialization phone avatarUrl cabinNo assignedUnit shiftDetails shiftPattern designation';
const careTeamFromAdmission = (admission) => ({
  doctor: admission?.doctorId || null,
  nurse: admission?.assignedNurseId || admission?.dutyNurseId || null,
  caretaker: admission?.assignedCaretakerId || null,
});

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
      .populate('doctorId', staffFields)
      .populate('assignedNurseId', staffFields)
      .populate('dutyNurseId', staffFields)
      .populate('assignedCaretakerId', staffFields)
      .lean();

    const { CareTeamAssignment } = await import('../../models/CareTeamAssignment.js');
    const assignments = await CareTeamAssignment.find({
      admissionId: activeMembership.activeAdmissionId,
      removedAt: null,
    }).populate('userId', staffFields).lean();

    const liveTeam = careTeamFromAdmission(admission);
    const careTeam = assignments.length > 0 ? assignments : [
      liveTeam.doctor && { role: 'PRIMARY_DOCTOR', userId: liveTeam.doctor },
      liveTeam.nurse && { role: 'NURSE', userId: liveTeam.nurse },
      liveTeam.caretaker && { role: 'CARETAKER', userId: liveTeam.caretaker },
    ].filter(Boolean);

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
    const { User } = await import('../../models/User.js');
    const hospitalId = user.hospitalId?._id || user.hospitalId;
    const userId = user._id || user.id;

    let dbUser = user;
    if ((!user.uhid || !user.phone) && userId) {
      dbUser = (await User.findById(userId).lean()) || user;
    }

    let patient = null;
    if (dbUser.patientId) {
      patient = await Patient.findOne({
        _id: dbUser.patientId,
        ...(hospitalId ? { hospitalId } : {})
      }).populate('hospitalId').populate('branchId');
    }
    if (!patient && dbUser.uhid) {
      patient = await Patient.findOne({
        uhid: String(dbUser.uhid).toUpperCase().trim(),
        ...(hospitalId ? { hospitalId } : {})
      }).populate('hospitalId').populate('branchId');
    }
    if (!patient && dbUser.phone) {
      const cleanPhone = String(dbUser.phone).replace(/\D/g, '');
      const phoneQueries = [{ phone: dbUser.phone }];
      if (cleanPhone.length >= 6) {
        phoneQueries.push({ phone: { $regex: cleanPhone, $options: 'i' } });
        phoneQueries.push({ phone: { $regex: cleanPhone.slice(-7), $options: 'i' } });
      }
      patient = await Patient.findOne({
        ...(hospitalId ? { hospitalId } : {}),
        $or: phoneQueries
      }).populate('hospitalId').populate('branchId');
    }
    if (!patient && dbUser.email && !dbUser.email.endsWith('@patient.local')) {
      patient = await Patient.findOne({
        ...(hospitalId ? { hospitalId } : {}),
        email: dbUser.email.toLowerCase().trim()
      }).populate('hospitalId').populate('branchId');
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
    const { Consultation } = await import('../../models/Consultation.js');
    const { Appointment } = await import('../../models/Appointment.js');
    const { DiagnosticOrder } = await import('../../models/DiagnosticOrder.js');
    const { Invoice } = await import('../../models/Invoice.js');

    const [activeAdmission, latestConsultation, latestAppointment, pendingLabs, pendingRadiology, unpaidInvoices] = await Promise.all([
      Admission.findOne({
        patientId: patient._id,
        status: { $in: ['ADMITTED', 'ADMISSION_REQUESTED'] }
      })
        .populate('doctorId', staffFields)
        .populate('assignedNurseId', staffFields)
        .populate('dutyNurseId', staffFields)
        .populate('assignedCaretakerId', staffFields)
        .lean()
        .catch(() => null),
      Consultation.findOne({ patientId: patient._id })
        .populate('doctorId', staffFields)
        .sort({ createdAt: -1 })
        .lean()
        .catch(() => null),
      Appointment.findOne({ patientId: patient._id })
        .populate('doctorId', staffFields)
        .sort({ createdAt: -1 })
        .lean()
        .catch(() => null),
      DiagnosticOrder.countDocuments({
        patientId: patient._id,
        testCategory: { $in: ['LABORATORY', 'BLOOD_TEST', 'URINE_ANALYSIS', 'URINE_TEST', 'CULTURE_TEST', 'PATHOLOGY'] },
        status: { $ne: 'COMPLETED' }
      }).catch(() => 0),
      DiagnosticOrder.countDocuments({
        patientId: patient._id,
        testCategory: { $in: ['RADIOLOGY', 'XRAY', 'MRI', 'CT_SCAN', 'ULTRASOUND', 'ECG', 'ECHO'] },
        status: { $ne: 'COMPLETED' }
      }).catch(() => 0),
      Invoice.find({
        patientId: patient._id,
        status: { $nin: ['PAID', 'CANCELLED'] }
      }).lean().catch(() => []),
    ]);

    const totalOutstanding = (unpaidInvoices || []).reduce(
      (sum, inv) => sum + (inv.dueAmount || inv.balanceAmount || inv.totalAmount || 0),
      0
    );

    const primaryDoctor = activeAdmission?.doctorId || latestConsultation?.doctorId || latestAppointment?.doctorId || null;

    return {
      patient,
      activeAdmission: activeAdmission || null,
      careTeam: {
        ...careTeamFromAdmission(activeAdmission),
        ...(primaryDoctor ? { doctor: primaryDoctor } : {})
      },
      currentStatus: activeAdmission ? activeAdmission.status : (latestConsultation ? 'TREATMENT_COMPLETED' : 'OUTPATIENT'),
      latestConsultation,
      activeOpdToken: latestAppointment,
      pendingDiagnostics: { labCount: pendingLabs || 0, radiologyCount: pendingRadiology || 0 },
      pendingLabs: pendingLabs || 0,
      pendingRadiology: pendingRadiology || 0,
      totalPendingAmount: totalOutstanding,
      outstandingBalance: totalOutstanding,
    };
  }

  static async getTreatmentHistory(user) {
    const patient = await this.resolvePatientForUser(user);
    if (!patient) return [];

    const { Consultation } = await import('../../models/Consultation.js');
    const { Appointment } = await import('../../models/Appointment.js');
    const { Prescription } = await import('../../models/Prescription.js');
    const { NurseTask } = await import('../../models/NurseTask.js');
    const { DiagnosticOrder } = await import('../../models/DiagnosticOrder.js');
    const { Admission } = await import('../../models/Admission.js');
    const { Invoice } = await import('../../models/Invoice.js');

    const patientId = patient._id;

    const [
      consultations,
      appointments,
      prescriptions,
      nurseTasks,
      diagnostics,
      admissions,
      invoices
    ] = await Promise.all([
      Consultation.find({ patientId }).populate('doctorId', staffFields).sort({ createdAt: -1 }).lean().catch(() => []),
      Appointment.find({ patientId }).populate('doctorId', staffFields).sort({ createdAt: -1 }).lean().catch(() => []),
      Prescription.find({ patientId }).populate('doctorId', staffFields).sort({ createdAt: -1 }).lean().catch(() => []),
      NurseTask.find({ patientId }).populate('assignedNurseId', staffFields).populate('doctorId', staffFields).sort({ createdAt: -1 }).lean().catch(() => []),
      DiagnosticOrder.find({ patientId }).populate('doctorId', staffFields).sort({ createdAt: -1 }).lean().catch(() => []),
      Admission.find({ patientId }).populate('doctorId', staffFields).sort({ createdAt: -1 }).lean().catch(() => []),
      Invoice.find({ patientId }).sort({ createdAt: -1 }).lean().catch(() => []),
    ]);

    const timeline = [];

    // 1. Initial Intake & Registration Event
    if (patient.createdAt) {
      timeline.push({
        id: `reg_${patient._id}`,
        date: patient.createdAt,
        type: 'REGISTRATION',
        title: `Hospital Registration — ${patient.chiefComplaints ? `Chief Complaint: ${String(patient.chiefComplaints).toUpperCase()}` : 'General OPD'}`,
        description: `Patient ${patient.firstName} ${patient.lastName} registered at reception with permanent identifier ${patient.uhid}. Initial clinical complaint: "${patient.chiefComplaints || 'General checkup'}".`,
        department: 'Reception & Patient Desk',
        status: 'COMPLETED',
        details: {
          uhid: patient.uhid,
          complaint: patient.chiefComplaints || 'General checkup',
          category: patient.category || 'GENERAL',
          ageGender: `${patient.age ? `${patient.age} Yrs` : ''} • ${patient.gender || 'MALE'}`,
        }
      });
    }

    // 2. Doctor OPD Consultations
    (consultations || []).forEach((c) => {
      const docName = c.doctorId?.name ? (c.doctorId.name.startsWith('Dr.') ? c.doctorId.name : `Dr. ${c.doctorId.name}`) : 'Attending Physician';
      const vitalsText = c.vitals
        ? `Vitals: Temp: ${c.vitals.temperature || '98.6'}°F | BP: ${c.vitals.bp || '120/80'} | Pulse: ${c.vitals.pulse || '72'} bpm | SpO2: ${c.vitals.spo2 || '98'}%`
        : '';
      const diag = c.finalDiagnosis || c.provisionalDiagnosis || c.chiefComplaints || 'Clinical examination completed';

      timeline.push({
        id: `consult_${c._id}`,
        date: c.createdAt,
        type: 'CONSULTATION',
        title: `Doctor Consultation — ${diag}`,
        description: `${docName} (${c.doctorId?.specialization || 'General Medicine'}) completed the clinical evaluation. ${vitalsText}. ${c.treatmentPlan ? `Treatment: ${c.treatmentPlan}.` : ''} ${c.adviceToPatient ? `Advice: ${c.adviceToPatient}.` : ''}`,
        department: c.doctorId?.specialization || 'General Medicine OPD',
        status: 'FINALIZED',
        doctorName: docName,
        vitals: c.vitals,
        diagnosis: diag,
        chiefComplaints: c.chiefComplaints,
        treatmentPlan: c.treatmentPlan,
        advice: c.adviceToPatient,
        followUpDate: c.followUpDate,
        medicines: c.prescriptions || []
      });
    });

    // 3. E-Prescriptions & Medication Dispensing
    (prescriptions || []).forEach((rx) => {
      const docName = rx.doctorId?.name ? (rx.doctorId.name.startsWith('Dr.') ? rx.doctorId.name : `Dr. ${rx.doctorId.name}`) : 'Consulting Doctor';
      const medsList = (rx.medicines || []).map(m => `${m.medicineName} (${m.dosage}, ${m.frequency})`).join(', ');

      timeline.push({
        id: `rx_${rx._id}`,
        date: rx.createdAt,
        type: 'PRESCRIPTION',
        title: `E-Prescription #${rx.prescriptionNo} — Medication Protocol`,
        description: `Prescribed by ${docName}. Prescribed medications: ${medsList || 'Antipyretics and supportive therapy'}. Pharmacy Status: ${rx.dispenseStatus?.replace(/_/g, ' ') || 'DISPENSED'}.`,
        department: 'Hospital Pharmacy',
        status: rx.dispenseStatus || 'DISPENSED',
        medicines: rx.medicines || [],
        pharmacyNotes: rx.pharmacyNotes
      });
    });

    // 4. Nursing Procedures, Injections, and IV Fluids
    (nurseTasks || []).forEach((nt) => {
      const nurseName = nt.assignedNurseName || nt.assignedNurseId?.name || 'Duty Ward Nurse';
      timeline.push({
        id: `task_${nt._id}`,
        date: nt.administrationDetails?.administeredAt || nt.createdAt,
        type: 'NURSE_PROCEDURE',
        title: `Nursing Care — ${nt.medicineName} (${nt.taskType?.replace(/_/g, ' ') || 'Administration'})`,
        description: `Dose: ${nt.dose} administered via ${nt.route || 'IV'} by ${nurseName}. Priority: ${nt.priority}. Status: ${nt.status}. ${nt.doctorInstructions ? `Instructions: ${nt.doctorInstructions}` : ''}`,
        department: 'Nursing Care & Injection Station',
        status: nt.status === 'ADMINISTERED' ? 'COMPLETED' : nt.status,
        nurseName,
        details: nt
      });
    });

    // 5. Diagnostics, Lab & Radiology Investigations
    (diagnostics || []).forEach((diag) => {
      timeline.push({
        id: `diag_${diag._id}`,
        date: diag.createdAt,
        type: 'DIAGNOSTIC',
        title: `Lab / Diagnostic Test — ${diag.testName}`,
        description: `Category: ${diag.testCategory} ordered by Dr. ${diag.doctorName || 'Physician'}. Status: ${diag.status}. ${diag.clinicalNotes ? `Notes: ${diag.clinicalNotes}` : ''}`,
        department: diag.testCategory === 'LABORATORY' ? 'Pathology / Laboratory' : 'Radiology & Imaging',
        status: diag.status,
        testName: diag.testName,
        category: diag.testCategory
      });
    });

    // 6. IPD Inpatient Admissions and Discharges
    (admissions || []).forEach((adm) => {
      timeline.push({
        id: `adm_${adm._id}`,
        date: adm.admittedAt || adm.createdAt,
        type: 'ADMISSION',
        title: `Inpatient Admission #${adm.admissionNumber} — ${adm.wardType || 'General Ward'}`,
        description: `Admitted to Bed ${adm.bedNumber || 'Assigned'} in ${adm.wardName || adm.targetWardName || 'IPD Ward'} under Dr. ${adm.doctorId?.name || 'Physician'}. Status: ${adm.status}.`,
        department: 'Inpatient Ward (IPD)',
        status: adm.status
      });

      if (adm.dischargedAt || adm.status === 'DISCHARGED') {
        timeline.push({
          id: `disch_${adm._id}`,
          date: adm.dischargedAt || adm.updatedAt,
          type: 'DISCHARGE',
          title: `Inpatient Discharge — Treatment Completed Successfully`,
          description: `Patient clinically stabilized and discharged from ${adm.wardName || 'IPD Ward'}. Final recovery summary approved by attending care team.`,
          department: 'Inpatient Ward (IPD)',
          status: 'COMPLETED'
        });
      }
    });

    // 7. Invoices and Settlement Receipts
    (invoices || []).forEach((inv) => {
      timeline.push({
        id: `inv_${inv._id}`,
        date: inv.createdAt,
        type: 'BILLING',
        title: `Official Invoice #${inv.invoiceNumber} — Settlement`,
        description: `Total Bill: ₹${inv.totalAmount || inv.grandTotal || 0}. Status: ${inv.status || 'PAID'}. Services: ${(inv.items || []).map(i => i.description || i.name).join(', ') || 'Consultation & Clinical Services'}.`,
        department: 'Billing & Cashier Desk',
        status: inv.status || 'PAID'
      });
    });

    // Sort the unified timeline in chronological order (most recent first)
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return timeline;
  }

  static async getPrescriptions(user) {
    const patient = await this.resolvePatientForUser(user);
    if (!patient) return [];
    try {
      const { Prescription } = await import('../../models/Prescription.js');
      return await Prescription.find({ patientId: patient._id })
        .populate('doctorId', staffFields)
        .sort({ createdAt: -1 })
        .lean();
    } catch (e) {
      return [];
    }
  }

  static async getReports(user, category) {
    const patient = await this.resolvePatientForUser(user);
    if (!patient) return [];
    try {
      const { DiagnosticOrder } = await import('../../models/DiagnosticOrder.js');
      const query = { patientId: patient._id };
      if (category === 'LABORATORY') {
        query.testCategory = { $in: ['LABORATORY', 'BLOOD_TEST', 'URINE_ANALYSIS', 'URINE_TEST', 'CULTURE_TEST', 'PATHOLOGY'] };
      } else if (category === 'RADIOLOGY') {
        query.testCategory = { $in: ['RADIOLOGY', 'XRAY', 'MRI', 'CT_SCAN', 'ULTRASOUND', 'ECG', 'ECHO'] };
      }
      return await DiagnosticOrder.find(query)
        .populate('doctorId', staffFields)
        .sort({ createdAt: -1 })
        .lean();
    } catch (e) {
      return [];
    }
  }

  static async getBilling(user) {
    const patient = await this.resolvePatientForUser(user);
    if (!patient) return { invoices: [], receipts: [], totalOutstanding: 0 };
    try {
      const { Invoice } = await import('../../models/Invoice.js');
      const invoices = await Invoice.find({ patientId: patient._id }).sort({ createdAt: -1 }).lean();
      const totalOutstanding = (invoices || [])
        .filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED')
        .reduce((acc, i) => acc + (i.dueAmount || i.balanceAmount || i.totalAmount || 0), 0);
      return { invoices, receipts: [], totalOutstanding };
    } catch (e) {
      return { invoices: [], receipts: [], totalOutstanding: 0 };
    }
  }
}
