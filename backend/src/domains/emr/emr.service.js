import { Consultation } from '../../models/Consultation.js';
import { Prescription } from '../../models/Prescription.js';
import { Appointment } from '../../models/Appointment.js';
import { Patient } from '../../models/Patient.js';
import { Invoice } from '../../models/Invoice.js';
import { NurseTasksService } from '../pharmacy/nurse-tasks.service.js';
import { PAYMENT_STATUS } from '../../config/constants.js';
import { socketManager } from '../../events/socketManager.js';
import { WorkflowEventService, WORKFLOW_EVENTS } from '../../events/workflowEventService.js';
import { ApiError } from '../../utils/apiError.js';

export class EmrService {
  static async createConsultation(data, user) {
    const appointment = await Appointment.findById(data.appointmentId);
    if (!appointment) {
      throw new ApiError(404, 'Appointment not found for consultation', null, 'NOT_FOUND');
    }
    const apptDocId = appointment.doctorId?._id ? String(appointment.doctorId._id) : (appointment.doctorId ? String(appointment.doctorId) : '');
    const currentUserId = String(user.id || user._id || '');
    if (apptDocId && currentUserId && apptDocId !== currentUserId && user.role === 'DOCTOR') {
      throw new ApiError(403, 'This appointment is assigned to another doctor', null, 'FORBIDDEN');
    }

    // Check for any department requests for this patient/appointment
    const { DiagnosticOrder } = await import('../../models/DiagnosticOrder.js');
    const departmentOrders = await DiagnosticOrder.find({
      $or: [
        { appointmentId: appointment._id },
        { appointmentId: null, patientId: appointment.patientId },
      ],
      chargeStatus: { $ne: 'CANCELLED' },
    });

    const consultationFee = data.consultationFee !== undefined && data.consultationFee !== null && data.consultationFee !== ''
      ? Number(data.consultationFee)
      : 0;
    const emergencyFee = Number(data.emergencyFee) || 0;
    const doctorProcedureCharges = Array.isArray(data.doctorProcedureCharges)
      ? data.doctorProcedureCharges.filter(p => p && p.description && p.description.trim() !== '')
      : [];

    const sanitizedPrescriptions = (data.prescriptions || [])
      .filter(p => p && p.medicineName && p.medicineName.trim() !== '')
      .map(p => ({
        ...p,
        medicineName: p.medicineName.trim(),
        dosage: p.dosage || (p.dosageForm === 'INJECTION' ? '1 Ampoule IV Stat' : '1 Tablet'),
        frequency: p.frequency || (p.dosageForm === 'INJECTION' ? 'STAT_IMMEDIATE' : 'TWICE_DAILY'),
        durationDays: Number(p.durationDays) || 1,
        timing: ['BEFORE_FOOD', 'AFTER_FOOD', 'WITH_FOOD', 'STAT', 'AS_DIRECTED'].includes(p.timing) ? p.timing : 'AFTER_FOOD',
        treatmentType: p.treatmentType || (['INJECTION', 'IV_FLUID'].includes(p.dosageForm) ? 'NURSE_ADMINISTERED' : 'ORAL_TAKE_HOME'),
        unitPrice: Number(p.unitPrice) || 0,
        price: Number(p.unitPrice) || 0,
        quantity: Number(p.quantity) || 1,
        totalPrice: Number(p.totalPrice) || 0,
      }));

    const consultation = await Consultation.create({
      hospitalId: user.hospitalId || appointment.hospitalId,
      branchId: user.branchId || appointment.branchId,
      appointmentId: appointment._id,
      patientId: appointment.patientId,
      doctorId: user.id || user._id,
      vitals: data.vitals || { bp: '120/80', pulse: 72, spo2: 98, temperature: 98.6, weightKg: 70 },
      chiefComplaints: data.chiefComplaints || appointment.chiefComplaints || 'General Consultation',
      historyOfPresentIllness: data.historyOfPresentIllness || '',
      prescriptions: sanitizedPrescriptions,
      consultationFee,
      emergencyFee,
      doctorProcedureCharges,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
      adviceToPatient: data.adviceToPatient || '',
      status: 'FINALIZED',
    });

    // Mark appointment status as COMPLETED
    appointment.status = 'COMPLETED';
    await appointment.save();

    // Create prescription if medicines provided
    let prescription = null;
    let nurseTasks = [];
    if (sanitizedPrescriptions.length > 0) {
      const rxCount = await Prescription.countDocuments({ hospitalId: user.hospitalId || appointment.hospitalId });
      const rxNo = `RX-${new Date().getFullYear()}-${String(rxCount + 1).padStart(5, '0')}`;

      prescription = await Prescription.create({
        hospitalId: user.hospitalId || appointment.hospitalId,
        branchId: user.branchId || appointment.branchId,
        consultationId: consultation._id,
        patientId: appointment.patientId,
        doctorId: user.id || user._id,
        prescriptionNo: rxNo,
        medicines: sanitizedPrescriptions,
      });

      // Automatically extract nurse-administered treatments (injections, IV fluids, dressings) into Nurse Tasks
      nurseTasks = await NurseTasksService.createTasksFromPrescription(prescription, user);

      const patient = await Patient.findById(appointment.patientId).select('firstName lastName uhid');
      WorkflowEventService.emitSync(WORKFLOW_EVENTS.PRESCRIPTION_ISSUED, {
        prescriptionId: prescription._id,
        senderUserId: user.id || user._id,
        patientName: patient ? `${patient.firstName} ${patient.lastName}`.trim() : 'Patient',
        uhid: patient?.uhid || 'N/A',
        doctorName: user.name || 'Doctor',
        linkedPath: '/pharmacy/dispense-queue',
      }, appointment.branchId);
    }

    // IPD Recommendation handling & Requisition to Inpatient Ward
    if (data.ipdRecommendation?.isRecommended) {
      try {
        const { AdmissionsService } = await import('../admissions/admissions.service.js');
        const gInfo = data.ipdRecommendation.guardianInfo || {};

        // If optional guardian info was provided, update patient record
        if (gInfo.name || gInfo.phone) {
          const updateFields = {};
          if (gInfo.name) updateFields['emergencyContact.name'] = gInfo.name.trim();
          if (gInfo.phone) updateFields['emergencyContact.phone'] = gInfo.phone.trim();
          if (gInfo.relationship) updateFields['emergencyContact.relation'] = gInfo.relationship;
          if (gInfo.address) updateFields.address = gInfo.address.trim();
          await Patient.updateOne({ _id: appointment.patientId }, { $set: updateFields });
        }

        // Trigger official admission requisition
        await AdmissionsService.requestAdmission({
          patientId: appointment.patientId,
          wardType: data.ipdRecommendation.recommendedWard || 'GENERAL',
          targetWardName: data.ipdRecommendation.recommendedWard || 'Ward 3B - Inpatient',
          admissionReason: data.ipdRecommendation.admissionReason || data.chiefComplaints || 'Doctor Inpatient Admission Recommendation',
        }, user);

        const patientObj = await Patient.findById(appointment.patientId).select('firstName lastName uhid');
        WorkflowEventService.emitSync(WORKFLOW_EVENTS.IPD_ADMISSION_RECOMMENDED, {
          patientId: appointment.patientId,
          patientName: patientObj ? `${patientObj.firstName} ${patientObj.lastName}`.trim() : 'Patient',
          uhid: patientObj?.uhid || 'N/A',
          doctorName: user.name || 'Doctor',
          wardType: data.ipdRecommendation.recommendedWard || 'General Ward',
          priority: data.ipdRecommendation.priority || 'ROUTINE',
          reason: data.ipdRecommendation.admissionReason || data.chiefComplaints || 'Clinical Inpatient Stay',
          senderUserId: user.id || user._id,
          linkedPath: '/reception/dashboard',
        }, appointment.branchId);
      } catch (err) {
        console.error('Failed to trigger IPD admission requisition:', err);
      }
    }
    const hospId = user.hospitalId || appointment.hospitalId;
    const brId = user.branchId || appointment.branchId;
    const year = new Date().getFullYear();
    let seqNum = (await Invoice.countDocuments({ hospitalId: hospId })) + 1;
    let invoiceNo = `INV-${year}-${String(seqNum).padStart(5, '0')}`;
    let existing = await Invoice.findOne({ hospitalId: hospId, invoiceNo });
    while (existing) {
      seqNum++;
      invoiceNo = `INV-${year}-${String(seqNum).padStart(5, '0')}`;
      existing = await Invoice.findOne({ hospitalId: hospId, invoiceNo });
    }

    const items = [
      {
        description: `OPD Consultation — Dr. ${user.name || 'Doctor'} (${data.chiefComplaints || 'OPD Check-up'})`,
        category: 'CONSULTATION',
        qty: 1,
        unitPrice: consultationFee + emergencyFee,
        totalPrice: consultationFee + emergencyFee,
      },
    ];

    if (doctorProcedureCharges.length > 0) {
      doctorProcedureCharges.forEach((proc) => {
        if (proc.description && proc.amount) {
          items.push({
            description: `Doctor Procedure: ${proc.description}`,
            category: 'OTHER',
            qty: 1,
            unitPrice: Number(proc.amount) || 0,
            totalPrice: Number(proc.amount) || 0,
          });
        }
      });
    }

    const activeDeptOrders = departmentOrders.filter(
      (ord) => ord.chargeStatus !== 'CANCELLED' && ord.chargeStatus !== 'INCLUDED_IN_FINAL_BILL'
    );

    for (const ord of activeDeptOrders) {
      const catMap = {
        XRAY: 'RADIOLOGY',
        MRI: 'RADIOLOGY',
        CT_SCAN: 'RADIOLOGY',
        ULTRASOUND: 'RADIOLOGY',
        LABORATORY: 'LAB',
        BLOOD_TEST: 'LAB',
        URINE_ANALYSIS: 'LAB',
        ECG: 'OTHER',
      };
      const cat = catMap[ord.testCategory] || 'OTHER';
      const chgAmount = ord.totalDepartmentCharge || ord.price || 50.0;

      items.push({
        description: `[${ord.testCategory}] ${ord.testName} (${ord.technicianName || 'Department'})`,
        category: cat,
        qty: 1,
        unitPrice: chgAmount,
        totalPrice: chgAmount,
      });

      ord.chargeStatus = 'INCLUDED_IN_FINAL_BILL';
      ord.status = 'REVIEWED';
      if (!ord.reviewedAt) ord.reviewedAt = new Date();
      await ord.save();
    }

    // Include pharmacy billed medicine items
    try {
      const { Prescription } = await import('../../models/Prescription.js');
      const billedPrescriptions = await Prescription.find({
        patientId: appointment.patientId,
        dispenseStatus: { $in: ['BILLED_SENT_TO_DOCTOR', 'DISPENSED', 'PARTIALLY_DISPENSED'] },
        chargeStatus: { $ne: 'INCLUDED_IN_FINAL_BILL' },
      });

      if (billedPrescriptions.length > 0) {
        for (const rx of billedPrescriptions) {
          for (const med of rx.medicines || []) {
            if (med.itemStatus === 'PURCHASED_EXTERNALLY') continue;
            const medPrice = Number(med.price !== undefined ? med.price : (med.unitPrice !== undefined ? med.unitPrice : 0));
            const qty = Number(med.dispensedQty || med.quantity || med.durationDays || 1);
            const lineTotal = Number(med.totalPrice !== undefined ? med.totalPrice : (medPrice * qty));
            items.push({
              description: `[Pharmacy] ${med.medicineName} (${med.dosageForm || 'Tab'}) x ${qty}`,
              category: 'PHARMACY',
              qty,
              unitPrice: medPrice,
              totalPrice: lineTotal,
            });
          }
          rx.chargeStatus = 'INCLUDED_IN_FINAL_BILL';
          rx.dispenseStatus = 'DISPENSED';
          await rx.save();
        }
      } else if (prescription && data.prescriptions && Array.isArray(data.prescriptions)) {
        for (const med of data.prescriptions) {
          if (med.externalPurchaseRequired || med.itemStatus === 'PURCHASED_EXTERNALLY' || !med.medicineName?.trim()) continue;
          const medPrice = Number(med.price !== undefined ? med.price : (med.unitPrice !== undefined ? med.unitPrice : 0));
          const isNurse = med.treatmentType === 'NURSE_ADMINISTERED' || ['INJECTION', 'IV_FLUID'].includes(med.dosageForm);
          const qty = isNurse ? 1 : Number(med.quantity || med.dispensedQty || (Number(med.durationDays) || 5) * 2);
          const lineTotal = isNurse ? medPrice : Number(med.totalPrice !== undefined ? med.totalPrice : (medPrice * qty));
          items.push({
            description: `[${isNurse ? 'Nurse Treatment' : 'Prescription Medicine'}] ${med.medicineName} (${med.dosageForm || 'Tab'}) x ${qty}`,
            category: 'PHARMACY',
            qty,
            unitPrice: medPrice,
            totalPrice: lineTotal,
          });
        }
      }
    } catch (e) {
      console.error('Failed to include pharmacy billed medicines:', e);
    }

    const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);

    const invoice = await Invoice.create({
      hospitalId: hospId,
      branchId: brId,
      patientId: appointment.patientId,
      doctorId: user.id || user._id,
      doctorName: user.name ? `Dr. ${user.name}` : 'Doctor Consultant',
      invoiceNo,
      items,
      subtotal,
      discountAmount: 0,
      grandTotal: subtotal,
      paidAmount: 0,
      balanceAmount: subtotal,
      status: PAYMENT_STATUS.UNPAID,
    });

    // Notify Central Billing Desk (CASHIER / BILLING_STAFF)
    try {
      const { Patient } = await import('../../models/Patient.js');
      const { NotificationService } = await import('../notifications/notification.service.js');
      const { WorkflowEventService, WORKFLOW_EVENTS } = await import('../../events/workflowEventService.js');

      const patObj = await Patient.findById(appointment.patientId).select('firstName lastName uhid').lean();
      const patientName = patObj ? `${patObj.firstName} ${patObj.lastName}`.trim() : 'Patient';

      await NotificationService.createNotification({
        hospitalId: hospId,
        branchId: brId,
        recipientRole: 'CASHIER',
        title: 'New Bill Pending',
        message: `Consultation & billing finalized for ${patientName} (UHID: ${patObj?.uhid || 'N/A'}). Invoice ${invoiceNo} (₹${subtotal.toLocaleString()}) ready for payment collection.`,
        notificationType: 'NEW_DATA',
        targetModule: 'billing',
        targetRoute: '/billing/dashboard?tab=CENTRAL_DESK',
        relatedPatientId: appointment.patientId,
        relatedTaskId: String(invoice._id),
      });

      WorkflowEventService.emitSync(WORKFLOW_EVENTS.CONSULTATION_COMPLETE, {
        invoiceId: invoice._id,
        invoiceNo,
        patientName,
        grandTotal: subtotal,
        linkedPath: '/billing/dashboard?tab=CENTRAL_DESK',
      }, brId);
    } catch (e) {
      console.error('Failed to notify central billing desk:', e);
    }

    socketManager.emitToBranch(brId, 'billing:invoice_created', {
      invoiceId: invoice._id,
      invoiceNo,
      patientId: appointment.patientId,
      grandTotal: subtotal,
    });

    const populatedConsultation = await Consultation.findById(consultation._id)
      .populate('patientId')
      .populate('doctorId', 'name specialization');

    return {
      consultation: populatedConsultation,
      prescription,
      nurseTasks,
      invoice,
    };
  }

  static async getPatientEhr(patientId, user) {
    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new ApiError(404, 'Patient record not found', null, 'NOT_FOUND');
    }

    const consultations = await Consultation.find({ patientId }).populate('doctorId').sort({ createdAt: -1 });
    const prescriptions = await Prescription.find({ patientId }).populate('doctorId').sort({ createdAt: -1 });

    return {
      patient,
      consultations,
      prescriptions,
    };
  }
}
