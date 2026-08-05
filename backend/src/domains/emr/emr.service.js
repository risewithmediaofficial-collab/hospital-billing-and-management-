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
    if (String(appointment.doctorId) !== String(user.id || user._id)) {
      throw new ApiError(403, 'This appointment is assigned to another doctor', null, 'FORBIDDEN');
    }

    // Check for any pending department requests for this patient/appointment
    const { DiagnosticOrder } = await import('../../models/DiagnosticOrder.js');
    const departmentOrders = await DiagnosticOrder.find({
      $or: [
        { appointmentId: appointment._id },
        { appointmentId: null, patientId: appointment.patientId },
      ],
      chargeStatus: { $ne: 'CANCELLED' },
    });

    const pendingOrders = departmentOrders.filter((ord) =>
      ['REQUESTED', 'DEPARTMENT_RECEIVED', 'ACCEPTED', 'IN_PROGRESS'].includes(ord.status)
    );

    if (pendingOrders.length > 0) {
      throw new ApiError(
        400,
        `One or more department requests are still pending (${pendingOrders.length} pending: ${pendingOrders
          .map((p) => p.testName)
          .join(', ')}). Complete all required services and charges before finalizing the bill.`,
        null,
        'PENDING_DEPARTMENT_REQUESTS'
      );
    }

    const consultationFee = Number(data.consultationFee) || 150.0;
    const emergencyFee = Number(data.emergencyFee) || 0;
    const doctorProcedureCharges = Array.isArray(data.doctorProcedureCharges) ? data.doctorProcedureCharges : [];

    const consultation = await Consultation.create({
      hospitalId: user.hospitalId || appointment.hospitalId,
      branchId: user.branchId || appointment.branchId,
      appointmentId: appointment._id,
      patientId: appointment.patientId,
      doctorId: user.id || user._id,
      vitals: data.vitals || { bp: '120/80', pulse: 72, spo2: 98, temperature: 98.6, weightKg: 70 },
      chiefComplaints: data.chiefComplaints || 'General Check-up',
      historyOfPresentIllness: data.historyOfPresentIllness || '',
      prescriptions: data.prescriptions || [],
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
    if (data.prescriptions && data.prescriptions.length > 0) {
      const rxCount = await Prescription.countDocuments({ hospitalId: user.hospitalId || appointment.hospitalId });
      const rxNo = `RX-${new Date().getFullYear()}-${String(rxCount + 1).padStart(5, '0')}`;

      prescription = await Prescription.create({
        hospitalId: user.hospitalId || appointment.hospitalId,
        branchId: user.branchId || appointment.branchId,
        consultationId: consultation._id,
        patientId: appointment.patientId,
        doctorId: user.id || user._id,
        prescriptionNo: rxNo,
        medicines: data.prescriptions,
      });

      // Automatically extract nurse-administered treatments (injections, IV fluids, dressings) into Nurse Tasks
      nurseTasks = await NurseTasksService.createTasksFromPrescription(prescription, user);

      const patient = await Patient.findById(appointment.patientId).select('firstName lastName uhid');
      WorkflowEventService.emit(WORKFLOW_EVENTS.PRESCRIPTION_ISSUED, {
        prescriptionId: prescription._id,
        patientName: patient ? `${patient.firstName} ${patient.lastName}`.trim() : 'Patient',
        uhid: patient?.uhid || 'N/A',
        doctorName: user.name || 'Doctor',
        linkedPath: '/pharmacy/dispense-queue',
      }, appointment.branchId);
    }

    // Consolidated Invoice logic
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

    const completedDeptOrders = departmentOrders.filter(
      (ord) => ['REPORT_UPLOADED', 'COMPLETED', 'DOCTOR_REVIEW'].includes(ord.status) && ord.chargeStatus !== 'CANCELLED'
    );

    for (const ord of completedDeptOrders) {
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
      await ord.save();
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
