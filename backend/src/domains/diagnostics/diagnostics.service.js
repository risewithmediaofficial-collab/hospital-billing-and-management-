import { DiagnosticOrder } from '../../models/DiagnosticOrder.js';
import { Patient } from '../../models/Patient.js';
import { Hospital } from '../../models/Hospital.js';
import { Branch } from '../../models/Branch.js';
import { AuditLog } from '../../models/AuditLog.js';
import { socketManager } from '../../events/socketManager.js';
import { ApiError } from '../../utils/apiError.js';

export class DiagnosticsService {
  static async requestInvestigation(data, user) {
    let hospitalId = user?.hospitalId;
    let branchId = user?.branchId;

    if (!hospitalId) {
      const defaultHosp = await Hospital.findOne({});
      hospitalId = defaultHosp?._id;
    }
    if (!branchId) {
      const defaultBranch = await Branch.findOne({ hospitalId });
      branchId = defaultBranch?._id;
    }

    const patient = await Patient.findById(data.patientId);
    if (!patient) {
      throw new ApiError(404, 'Patient record not found', null, 'NOT_FOUND');
    }

    // Compute patient age
    let patientAge = '30 Y';
    if (patient.dob) {
      const ageYears = new Date().getFullYear() - new Date(patient.dob).getFullYear();
      patientAge = `${ageYears} Y`;
    }

    const testCategory = data.testCategory || 'OTHER';
    const testName = data.testName || 'General Diagnostic Investigation';
    const priority = data.priority || 'NORMAL';

    const newOrder = await DiagnosticOrder.create({
      hospitalId,
      branchId,
      patientId: patient._id,
      uhid: patient.uhid,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientAge,
      patientGender: patient.gender || 'MALE',
      opIpNumber: data.opIpNumber || `OP-${patient.uhid}`,
      tokenNumber: data.tokenNumber || 1,
      doctorId: user.id || user._id,
      doctorName: user.name || 'Doctor Consultant',
      testCategory,
      testName,
      clinicalNotes: data.clinicalNotes || '',
      priority,
      price: data.price || 75.0,
      status: 'REQUESTED',
      timeline: [
        {
          status: 'REQUESTED',
          timestamp: new Date(),
          updatedBy: user.name || 'Doctor Consultant',
          notes: `Investigation '${testName}' requested by ${user.name || 'Doctor'} (Priority: ${priority})`,
        },
      ],
    });

    // Create Audit Log
    try {
      await AuditLog.create({
        hospitalId,
        branchId,
        userId: user.id || user._id,
        userName: user.name || 'Doctor',
        userRole: user.role || 'DOCTOR',
        action: 'INVESTIGATION_REQUESTED',
        entityType: 'DiagnosticOrder',
        entityId: newOrder._id,
        details: { testCategory, testName, patientUhid: patient.uhid, priority },
      });
    } catch (e) {
      console.error('Audit log write skipped:', e.message);
    }

    // Broadcast Socket.IO event to Department and Doctor
    socketManager.emitToBranch(branchId, 'investigation:new_request', {
      orderId: newOrder._id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      uhid: patient.uhid,
      patientAge,
      patientGender: patient.gender,
      doctorName: user.name || 'Doctor',
      testCategory,
      testName,
      priority,
      status: 'REQUESTED',
      createdAt: newOrder.createdAt,
    });

    return newOrder;
  }

  static async updateStatus(orderId, status, notes, user) {
    const order = await DiagnosticOrder.findById(orderId);
    if (!order) {
      throw new ApiError(404, 'Investigation order not found', null, 'NOT_FOUND');
    }

    order.status = status;
    order.timeline.push({
      status,
      timestamp: new Date(),
      updatedBy: user?.name || 'Department Specialist',
      notes: notes || `Status changed to ${status}`,
    });

    if (status === 'COMPLETED') {
      order.completedAt = new Date();
    }

    await order.save();

    // Audit Log
    try {
      await AuditLog.create({
        hospitalId: order.hospitalId,
        branchId: order.branchId,
        userId: user?.id || user?._id,
        userName: user?.name || 'Technician',
        userRole: user?.role || 'LAB_TECH',
        action: 'INVESTIGATION_STATUS_UPDATED',
        entityType: 'DiagnosticOrder',
        entityId: order._id,
        details: { status, notes, testName: order.testName },
      });
    } catch (e) {
      console.error('Audit log write skipped:', e.message);
    }

    // Broadcast status change to Doctor and Department
    socketManager.emitToBranch(order.branchId, 'investigation:status_updated', {
      orderId: order._id,
      patientId: order.patientId,
      patientName: order.patientName,
      uhid: order.uhid,
      testName: order.testName,
      status: order.status,
      updatedBy: user?.name || 'Technician',
      timestamp: new Date(),
    });

    return order;
  }

  static async uploadReport(orderId, data, user) {
    const order = await DiagnosticOrder.findById(orderId);
    if (!order) {
      throw new ApiError(404, 'Investigation order not found', null, 'NOT_FOUND');
    }

    order.status = 'REPORT_UPLOADED';
    order.reportSummary = data.reportSummary || 'Investigation scan analyzed and report uploaded.';
    order.technicianName = user?.name || 'Diagnostic Technician';

    if (data.price !== undefined) {
      order.price = Number(data.price) || 0;
    }
    if (data.additionalCharges && Array.isArray(data.additionalCharges)) {
      order.additionalCharges = data.additionalCharges.map((c) => ({
        description: c.description || 'Additional Charge',
        amount: Number(c.amount) || 0,
      }));
    }

    const additionalSum = (order.additionalCharges || []).reduce((sum, item) => sum + (item.amount || 0), 0);
    order.totalDepartmentCharge = (order.price || 0) + additionalSum;
    order.chargeStatus = 'SUBMITTED';

    if (data.attachments && Array.isArray(data.attachments)) {
      data.attachments.forEach((att) => {
        order.attachments.push({
          fileName: att.fileName || 'Diagnostic_Report.pdf',
          fileUrl: att.fileUrl || 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
          fileType: att.fileType || 'DICOM_IMAGE',
          uploadedAt: new Date(),
          technicianName: user?.name || 'Technician',
        });
      });
    } else {
      order.attachments.push({
        fileName: `${order.testCategory}_Report_${order.uhid}.pdf`,
        fileUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
        fileType: 'REPORT_PDF',
        uploadedAt: new Date(),
        technicianName: user?.name || 'Technician',
      });
    }

    order.timeline.push({
      status: 'REPORT_UPLOADED',
      timestamp: new Date(),
      updatedBy: user?.name || 'Technician',
      notes: `Report and diagnostic findings uploaded by ${user?.name || 'Technician'}`,
    });

    await order.save();

    // Broadcast report ready event
    socketManager.emitToBranch(order.branchId, 'diagnostics:report_ready', {
      orderId: order._id,
      patientId: order.patientId,
      patientName: order.patientName,
      uhid: order.uhid,
      testName: order.testName,
      reportSummary: order.reportSummary,
      attachments: order.attachments,
    });

    return order;
  }

  static async getOrders(query = {}, user) {
    let hospitalId = user?.hospitalId;
    if (!hospitalId) {
      const defaultHosp = await Hospital.findOne({});
      hospitalId = defaultHosp?._id;
    }

    const filter = { hospitalId };

    if (query.testCategory) {
      if (query.testCategory === 'RADIOLOGY') {
        filter.testCategory = { $in: ['XRAY', 'MRI', 'CT_SCAN', 'ULTRASOUND'] };
      } else if (query.testCategory === 'PATHOLOGY') {
        filter.testCategory = { $in: ['LABORATORY', 'BLOOD_TEST', 'URINE_TEST', 'CULTURE_TEST', 'BIOPSY'] };
      } else if (query.testCategory === 'CARDIOLOGY') {
        filter.testCategory = { $in: ['ECG', 'ECHO', 'EEG', 'PFT'] };
      } else {
        filter.testCategory = query.testCategory;
      }
    }

    if (query.patientId) {
      filter.patientId = query.patientId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    return await DiagnosticOrder.find(filter).sort({ createdAt: -1 });
  }

  static async updateDepartmentCharge(orderId, data, user) {
    const order = await DiagnosticOrder.findById(orderId);
    if (!order) {
      throw new ApiError(404, 'Investigation order not found', null, 'NOT_FOUND');
    }

    if (data.price !== undefined) {
      order.price = Number(data.price) || 0;
    }
    if (data.additionalCharges && Array.isArray(data.additionalCharges)) {
      order.additionalCharges = data.additionalCharges.map((c) => ({
        description: c.description || 'Additional Charge',
        amount: Number(c.amount) || 0,
      }));
    }

    const additionalSum = (order.additionalCharges || []).reduce((sum, item) => sum + (item.amount || 0), 0);
    order.totalDepartmentCharge = order.price + additionalSum;
    order.chargeStatus = 'SUBMITTED';

    await order.save();

    socketManager.emitToBranch(order.branchId, 'investigation:status_updated', {
      orderId: order._id,
      patientId: order.patientId,
      status: order.status,
      chargeStatus: order.chargeStatus,
      totalDepartmentCharge: order.totalDepartmentCharge,
    });

    return order;
  }

  static async cancelInvestigation(orderId, cancellationReason, user) {
    const order = await DiagnosticOrder.findById(orderId);
    if (!order) {
      throw new ApiError(404, 'Investigation order not found', null, 'NOT_FOUND');
    }

    if (!cancellationReason || !cancellationReason.trim()) {
      throw new ApiError(400, 'A mandatory cancellation reason must be provided.', null, 'CANCELLATION_REASON_REQUIRED');
    }

    order.status = 'COMPLETED';
    order.chargeStatus = 'CANCELLED';
    order.cancellationReason = cancellationReason.trim();
    order.timeline.push({
      status: 'CANCELLED',
      timestamp: new Date(),
      updatedBy: user?.name || 'Doctor',
      notes: `Order cancelled by Dr. ${user?.name || 'Doctor'}. Reason: ${cancellationReason.trim()}`,
    });

    await order.save();

    socketManager.emitToBranch(order.branchId, 'investigation:status_updated', {
      orderId: order._id,
      patientId: order.patientId,
      status: order.status,
      chargeStatus: order.chargeStatus,
      cancellationReason: order.cancellationReason,
    });

    return order;
  }

  static async requestCorrection(orderId, correctionNote, user) {
    const order = await DiagnosticOrder.findById(orderId);
    if (!order) {
      throw new ApiError(404, 'Investigation order not found', null, 'NOT_FOUND');
    }

    if (!correctionNote || !correctionNote.trim()) {
      throw new ApiError(400, 'A correction note must be provided when returning to department.', null, 'CORRECTION_NOTE_REQUIRED');
    }

    order.chargeStatus = 'CORRECTION_REQUESTED';
    order.correctionNote = correctionNote.trim();
    order.status = 'IN_PROGRESS';
    order.timeline.push({
      status: 'CORRECTION_REQUESTED',
      timestamp: new Date(),
      updatedBy: user?.name || 'Doctor',
      notes: `Correction requested by Dr. ${user?.name || 'Doctor'}: ${correctionNote.trim()}`,
    });

    await order.save();

    socketManager.emitToBranch(order.branchId, 'investigation:status_updated', {
      orderId: order._id,
      patientId: order.patientId,
      status: order.status,
      chargeStatus: order.chargeStatus,
      correctionNote: order.correctionNote,
    });

    return order;
  }

  static async approveCharge(orderId, user) {
    const order = await DiagnosticOrder.findById(orderId);
    if (!order) {
      throw new ApiError(404, 'Investigation order not found', null, 'NOT_FOUND');
    }

    order.chargeStatus = 'APPROVED';
    await order.save();

    socketManager.emitToBranch(order.branchId, 'investigation:status_updated', {
      orderId: order._id,
      patientId: order.patientId,
      chargeStatus: order.chargeStatus,
    });

    return order;
  }

  static async getPatientReports(patientId, user) {
    return await DiagnosticOrder.find({ patientId }).sort({ createdAt: -1 });
  }
}
