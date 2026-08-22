import { NurseTask } from '../../models/NurseTask.js';
import { Medicine } from '../../models/Medicine.js';
import { MedicineBatch } from '../../models/MedicineBatch.js';
import { PharmacyStockAdjustment } from '../../models/PharmacyStockAdjustment.js';
import { Prescription } from '../../models/Prescription.js';
import { PharmacyService } from './pharmacy.service.js';
import { ApiError } from '../../utils/apiError.js';
import { socketManager } from '../../events/socketManager.js';
import { Admission } from '../../models/Admission.js';
import { NotificationService } from '../notifications/notification.service.js';

export class NurseTasksService {
  static async getAvailableNurses(user) {
    const hospitalId = user?.hospitalId;
    const branchId = user?.branchId;

    const { User } = await import('../../models/User.js');
    const filter = {
      status: 'ACTIVE',
      isActive: true,
      $or: [
        { role: { $in: ['NURSE', 'NURSE_INCHARGE', 'NURSING'] } },
        { additionalRoles: { $in: ['NURSE', 'NURSE_INCHARGE', 'NURSING'] } },
      ],
    };

    if (hospitalId) filter.hospitalId = hospitalId;
    if (branchId) filter.$and = [{ $or: [{ branchId }, { branchId: null }] }];

    const nurses = await User.find(filter)
      .select('name role isAvailable shiftDetails cabinNo departmentId additionalRoles')
      .lean();

    // Compute live workload (pending tasks count) for each nurse
    const nurseListWithWorkload = await Promise.all(
      nurses.map(async (nurse) => {
        const activeTaskCount = await NurseTask.countDocuments({
          hospitalId: nurse.hospitalId || hospitalId,
          assignedNurseId: nurse._id,
          status: { $in: ['PENDING', 'ACCEPTED', 'SCHEDULED', 'DELAYED'] },
        });

        return {
          id: String(nurse._id),
          _id: nurse._id,
          name: nurse.name,
          role: nurse.role,
          isPrimaryNurse: ['NURSE', 'NURSE_INCHARGE', 'NURSING'].includes(nurse.role),
          isAvailable: nurse.isAvailable !== false,
          activeTaskCount,
        };
      })
    );

    // Dedicated nursing staff take precedence. A multi-role clinic owner is a
    // fallback when the clinic has no primary nurse available.
    nurseListWithWorkload.sort((a, b) => {
      if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
      if (a.isPrimaryNurse !== b.isPrimaryNurse) return a.isPrimaryNurse ? -1 : 1;
      return a.activeTaskCount - b.activeTaskCount;
    });

    return nurseListWithWorkload;
  }

  static async createDirectNurseTask(data, user) {
    const hospitalId = user.hospitalId;
    const branchId = user.branchId || data.branchId;

    const { Patient } = await import('../../models/Patient.js');
    const { Appointment } = await import('../../models/Appointment.js');
    const { User } = await import('../../models/User.js');

    const patient = await Patient.findOne({ _id: data.patientId, hospitalId });
    if (!patient) {
      throw new ApiError(404, 'Patient record not found for injection request');
    }

    let appointment = null;
    if (data.appointmentId) {
      appointment = await Appointment.findOne({ _id: data.appointmentId, hospitalId });
      if (!appointment || String(appointment.patientId) !== String(patient._id)) {
        throw new ApiError(404, 'Matching appointment was not found for this hospital and patient');
      }
    }

    let assignedNurseId = data.assignedNurseId;
    if (assignedNurseId && assignedNurseId !== 'AUTO_ASSIGN') {
      const nurseUser = await User.findOne({
        _id: assignedNurseId,
        hospitalId,
        $or: [
          { role: { $in: ['NURSE', 'NURSE_INCHARGE', 'NURSING'] } },
          { additionalRoles: { $in: ['NURSE', 'NURSE_INCHARGE', 'NURSING'] } },
        ],
      });
      if (!nurseUser) {
        assignedNurseId = null;
      }
    } else {
      assignedNurseId = null;
      try {
        const availableNurses = await NurseTasksService.getAvailableNurses(user);
        if (availableNurses.length > 0) {
          assignedNurseId = availableNurses[0]._id;
        }
      } catch (e) {}
    }

    const medicine = await Medicine.findOne({
      hospitalId,
      $or: [{ name: data.medicineName }, { genericName: data.medicineName }],
    });

    const taskType = data.taskType || (
      data.dosageForm === 'INJECTION' || (data.medicineName || '').toLowerCase().includes('inj') ? 'INJECTION'
      : data.dosageForm === 'IV_FLUID' ? 'IV_FLUID'
      : data.dosageForm === 'NEBULIZATION' ? 'NEBULIZATION'
      : 'INJECTION'
    );

    const doctorName = user.name || user.fullName || 'Consulting Doctor';
    const doctorDepartment = user.department || 'Clinical Consultations';

    let assignedNurseName = 'Unassigned / Nursing Pool';
    if (assignedNurseId) {
      try {
        const nurseObj = await User.findOne({ _id: assignedNurseId, hospitalId }).select('name');
        if (nurseObj) assignedNurseName = nurseObj.name;
      } catch (e) {}
    }

    const task = await NurseTask.create({
      hospitalId,
      branchId,
      patientId: patient._id,
      doctorId: user.id || user._id,
      doctorName,
      doctorDepartment,
      assignedNurseId: assignedNurseId || null,
      assignedNurseName,
      appointmentId: appointment?._id || null,
      taskType,
      medicineName: data.medicineName,
      medicineId: medicine?._id,
      dose: data.dose || data.dosage || '1 Ampoule IV/IM Stat',
      route: data.route || 'IV',
      frequency: data.frequency || 'STAT_IMMEDIATE',
      priority: data.priority || 'STAT',
      doctorInstructions: data.doctorInstructions || data.instructions || 'Administer stat in nursing station',
      allergyInformation: data.allergyInformation || 'Check patient for allergies',
      scheduledTime: new Date(),
      status: 'PENDING',
    });

    // Update appointment status to WAITING_NURSE if active
    if (appointment) {
      appointment.status = 'WAITING_NURSE';
      appointment.departmentReturnedAt = null;
      await appointment.save();

      socketManager.emitToBranch(appointment.branchId, 'opd_queue:status_changed', {
        appointmentId: appointment._id,
        status: appointment.status,
        tokenNumber: appointment.tokenNumber,
      });
    }

    const isDedicatedNurse = assignedNurseId && String(assignedNurseId) !== String(user.id || user._id);
    const taskNotification = {
      hospitalId,
      branchId,
      title: `Doctor Prescribed: ${task.medicineName}`,
      message: `Dr. ${doctorName} requested ${task.medicineName} (${task.dose}) for patient ${patient.firstName || ''} ${patient.lastName || ''} (UHID: ${patient.uhid || 'N/A'}).`,
      notificationType: 'WORKFLOW',
      sourceModule: 'doctor',
      entityType: 'NurseTask',
      entityId: task._id,
      actionType: 'ADMINISTER_TREATMENT',
      targetModule: 'nursing',
      targetRoute: `/nurse-incharge/dashboard?tab=TASKS&taskId=${task._id}`,
      relatedPatientId: patient._id,
      relatedTaskId: String(task._id),
      metadata: { event: 'NURSE_TASK_CREATED', patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(), uhid: patient.uhid },
    };
    if (isDedicatedNurse) {
      await NotificationService.createNotification({ ...taskNotification, recipientUserId: assignedNurseId });
    } else {
      await NotificationService.createNotification({
        ...taskNotification,
        recipientRoles: ['NURSE', 'NURSE_INCHARGE'],
      });
    }

    const envelope = {
      type: 'NEW_NURSE_TASKS',
      count: 1,
      patientId: patient._id,
      patientName: `${patient.firstName} ${patient.lastName}`.trim(),
      uhid: patient.uhid,
      taskType: task.taskType,
      medicineName: task.medicineName,
      dose: task.dose,
      route: task.route,
      tokenNumber: appointment?.tokenNumber || null,
      linkedPath: `/nurse-incharge/dashboard?tab=TASKS&taskId=${task._id}`,
    };

    if (isDedicatedNurse) {
      socketManager.emitToUser(String(assignedNurseId), 'workflow:new_nurse_tasks', envelope);
    } else {
      for (const role of ['NURSE', 'NURSE_INCHARGE']) {
        if (branchId) {
          socketManager.emitToBranchRole(branchId, role, 'workflow:new_nurse_tasks', envelope);
        } else {
          socketManager.emitToHospitalRole(hospitalId, role, 'workflow:new_nurse_tasks', envelope);
        }
      }
    }

    socketManager.emitToBranch(branchId || hospitalId, 'workflow:pending_changed', envelope);

    return task;
  }

  static async createTasksFromPrescription(prescription, user, appointmentId = null) {
    const createdTasks = [];
    const admission = await Admission.findOne({ hospitalId: prescription.hospitalId, patientId: prescription.patientId, status: 'ADMITTED' })
      .select('assignedNurseId dutyNurseId').lean();
    let defaultAssignedNurseId = admission?.assignedNurseId || admission?.dutyNurseId || null;

    let recommendedNurseId = null;
    try {
      const availableNurses = await NurseTasksService.getAvailableNurses(user);
      if (availableNurses.length > 0) {
        recommendedNurseId = availableNurses[0]._id;
      }
    } catch (e) {}

    const pendingNurseTasks = [];

    for (const item of prescription.medicines || []) {
      if (item.treatmentType === 'NURSE_ADMINISTERED' || ['INJECTION', 'IV_FLUID', 'DROPS'].includes(item.dosageForm)) {
        let assignedNurseId = item.assignedNurseId;
        if (!assignedNurseId || assignedNurseId === 'AUTO_ASSIGN') {
          assignedNurseId = defaultAssignedNurseId || recommendedNurseId;
        }

        const medicine = await Medicine.findOne({
          hospitalId: prescription.hospitalId,
          $or: [{ name: item.medicineName }, { genericName: item.genericName || item.medicineName }],
        });

        const task = await NurseTask.create({
          hospitalId: prescription.hospitalId,
          branchId: prescription.branchId,
          patientId: prescription.patientId,
          doctorId: prescription.doctorId,
          assignedNurseId: assignedNurseId || null,
          appointmentId: appointmentId || null,
          prescriptionId: prescription._id,
          consultationId: prescription.consultationId,
          taskType:
            item.dosageForm === 'INJECTION'
              ? 'INJECTION'
              : item.dosageForm === 'IV_FLUID'
              ? 'IV_FLUID'
              : item.dosageForm === 'DROPS'
              ? 'NEBULIZATION'
              : 'BEDSIDE_MEDICATION',
          medicineName: item.medicineName,
          medicineId: medicine?._id,
          dose: item.dosage || '1 Dose',
          route: item.dosageForm === 'INJECTION' ? 'IV' : 'Oral',
          frequency: item.frequency || 'ONCE',
          doctorInstructions: item.specialInstructions || item.instructions || '',
          allergyInformation: 'Check patient record for allergies',
          scheduledTime: item.startDate || new Date(),
          status: 'PENDING',
        });

        createdTasks.push(task);
        pendingNurseTasks.push(task);
      }
    }

    if (pendingNurseTasks.length > 0) {
      const envelope = {
        type: 'NEW_NURSE_TASKS',
        count: pendingNurseTasks.length,
        patientId: prescription.patientId,
        linkedPath: '/nurse-incharge/dashboard?tab=TASKS',
      };
      
      const doctorUserIdStr = String(user?.id || user?._id || prescription.doctorId || '');
      const targetNurseIds = Array.from(new Set(pendingNurseTasks.map(t => String(t.assignedNurseId || '')).filter(id => id && id !== doctorUserIdStr)));
      if (targetNurseIds.length > 0) {
        targetNurseIds.forEach(nId => {
          socketManager.emitToUser(String(nId), 'workflow:new_nurse_tasks', envelope);
        });
      }
      if (targetNurseIds.length === 0) {
        for (const role of ['NURSE', 'NURSE_INCHARGE']) {
          if (prescription.branchId) {
            socketManager.emitToBranchRole(prescription.branchId, role, 'workflow:new_nurse_tasks', envelope);
          } else {
            socketManager.emitToHospitalRole(prescription.hospitalId, role, 'workflow:new_nurse_tasks', envelope);
          }
        }
      }

      await Promise.all(pendingNurseTasks.flatMap((pendingTask) => {
        const base = {
          hospitalId: prescription.hospitalId,
          branchId: prescription.branchId,
          title: `New nurse treatment task: ${pendingTask.medicineName}`,
          message: `A nurse-administered treatment task was received from the consulting doctor.`,
          notificationType: 'NEW_DATA',
          sourceModule: 'doctor',
          entityType: 'NurseTask',
          entityId: pendingTask._id,
          actionType: 'ADMINISTER_TREATMENT',
          targetModule: 'nursing',
          targetRoute: `/nurse-incharge/dashboard?tab=TASKS&taskId=${pendingTask._id}`,
          relatedPatientId: prescription.patientId,
          relatedTaskId: String(pendingTask._id),
        };
        if (pendingTask.assignedNurseId) {
          return [NotificationService.createNotification({ ...base, recipientUserId: pendingTask.assignedNurseId })];
        }
        return [NotificationService.createNotification({
          ...base,
          recipientRoles: ['NURSE', 'NURSE_INCHARGE'],
        })];
      }));
      socketManager.emitToBranch(prescription.branchId || prescription.hospitalId, 'workflow:pending_changed', envelope);
    }

    return createdTasks;
  }

  static async getNurseTasks(user, query = {}) {
    const filter = {};
    if (user?.role === 'SUPER_ADMIN') {
      if (query.hospitalId && query.hospitalId !== 'ALL') {
        filter.hospitalId = query.hospitalId;
      } else if (query.all !== 'true' && user._hospitalContextApplied && user.hospitalId) {
        filter.hospitalId = user.hospitalId;
      }
    } else {
      if (user?.hospitalId) filter.hospitalId = user.hospitalId;
      if (user?.branchId) filter.branchId = user.branchId;
      if (user?.role === 'NURSE') filter.$or = [{ assignedNurseId: user.id }, { assignedNurseId: null }];
    }

    if (query.patientId) filter.patientId = query.patientId;
    if (query.status) filter.status = query.status;

    // Strict FIFO Queue Sorting: Oldest pending tasks are shown at the TOP
    return NurseTask.find(filter)
      .populate('patientId', 'firstName lastName uhid gender age bedNo roomNo')
      .populate('doctorId', 'name specialization')
      .populate('assignedNurseId', 'name role')
      .sort({ createdAt: 1 })
      .lean();
  }

  static async updateTaskStatus(taskId, updateData, user) {
    const task = await NurseTask.findOne({ _id: taskId, hospitalId: user.hospitalId });
    if (!task) throw new ApiError(404, 'Nurse task not found');

    const { status, administeredQty, batchNumber, siteOrRoute, patientReaction, notes, reasonIfSkippedOrRefused } = updateData;
    const allowedStatuses = ['ACCEPTED', 'SCHEDULED', 'ADMINISTERED', 'SKIPPED', 'DELAYED', 'REFUSED', 'CANCELLED'];
    if (!allowedStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid nurse task workflow status', null, 'INVALID_STATUS');
    }
    if (['ADMINISTERED', 'SKIPPED', 'REFUSED', 'CANCELLED'].includes(task.status)) {
      throw new ApiError(409, 'This nurse task is already closed.', null, 'TASK_ALREADY_CLOSED');
    }
    const assignedNurseId = task.assignedNurseId?._id || task.assignedNurseId;
    const currentNurseId = user?.id || user?._id;
    if (user?.role === 'NURSE' && assignedNurseId && String(assignedNurseId) !== String(currentNurseId)) {
      throw new ApiError(403, 'This task is assigned to another nurse.', null, 'TASK_ASSIGNED_TO_ANOTHER_NURSE');
    }
    let billingInvoice = null;

    task.status = status;

    if (status === 'ADMINISTERED') {
      task.administrationDetails = {
        administeredAt: new Date(),
        administeredQty: Number(administeredQty) || 1,
        nurseId: user.id,
        nurseName: user.name,
        batchNumber: batchNumber || 'DEFAULT-BATCH',
        siteOrRoute: siteOrRoute || task.route || 'IV',
        patientReaction: patientReaction || 'NORMAL',
        notes: notes || '',
      };

      // Find and deduct batch stock if available
      if (task.medicineId) {
        const batch = await MedicineBatch.findOne({
          hospitalId: user.hospitalId,
          medicineId: task.medicineId,
          quantity: { $gt: 0 },
        }).sort({ expiryDate: 1 });

        if (batch) {
          const prevQty = batch.quantity;
          const qty = Number(administeredQty) || 1;
          batch.quantity = Math.max(0, batch.quantity - qty);
          await batch.save();

          await PharmacyStockAdjustment.create({
            hospitalId: user.hospitalId,
            branchId: user.branchId,
            medicineId: task.medicineId,
            batchId: batch._id,
            batchNumber: batch.batchNumber,
            type: 'ADMINISTERED',
            sourceLocation: batch.location,
            previousQuantity: prevQty,
            quantityChanged: -qty,
            newQuantity: batch.quantity,
            reason: `Nurse Administered to patient (Task #${task._id})`,
            performedBy: user.id,
            performedByName: user.name,
          });

          task.administrationDetails.batchId = batch._id;
          task.administrationDetails.batchNumber = batch.batchNumber;

          const medicine = await Medicine.findOne({ _id: task.medicineId, hospitalId: user.hospitalId });
          if (medicine) {
            // Automatically add charge to patient's bill
            billingInvoice = await PharmacyService.addPharmacyChargeToBill({
              hospitalId: user.hospitalId,
              branchId: user.branchId,
              patientId: task.patientId,
              doctorId: task.doctorId,
              description: `${task.medicineName} (${task.dose}) - Nurse Administered [Batch: ${batch.batchNumber}]`,
              sourceRef: `nurse-task:${task._id}`,
              qty,
              unitPrice: medicine.sellingPrice,
              taxPercentage: medicine.taxPercentage,
            });
          }
        }
      }
    } else if (['SKIPPED', 'REFUSED', 'CANCELLED'].includes(status)) {
      if (!reasonIfSkippedOrRefused || !reasonIfSkippedOrRefused.trim()) {
        throw new ApiError(400, 'A reason is required when skipping, refusing, or cancelling a task');
      }
      task.administrationDetails.reasonIfSkippedOrRefused = reasonIfSkippedOrRefused.trim();
    }

    task.doctorReviewedAt = null;
    await task.save();

    if (status === 'ADMINISTERED' && task.prescriptionId) {
      const prescription = await Prescription.findOne({
        _id: task.prescriptionId,
        hospitalId: user.hospitalId,
      });
      if (prescription) {
        const medicine = prescription.medicines.find(
          (item) => item.treatmentType === 'NURSE_ADMINISTERED'
            && item.itemStatus === 'PENDING'
            && item.medicineName === task.medicineName
        );
        if (medicine) {
          medicine.itemStatus = 'ADMINISTERED_BY_NURSE';
          await prescription.save();
        }
      }
    }

    const { Patient } = await import('../../models/Patient.js');
    const { Notification } = await import('../../models/Notification.js');
    const patient = await Patient.findOne({ _id: task.patientId, hospitalId: user.hospitalId }).select('firstName lastName uhid').lean();
    const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : 'Patient';
    const uhid = patient?.uhid || 'N/A';

    // Mark previous nurse pending notifications as read so nurse badge count updates immediately
    await Notification.updateMany(
      { hospitalId: task.hospitalId, relatedTaskId: String(task._id), isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    ).catch(() => {});

    if (status === 'ADMINISTERED') {
      // 1. Notify the Prescribing Doctor
      await NotificationService.createNotification({
        hospitalId: task.hospitalId,
        branchId: task.branchId,
        recipientUserId: task.doctorId,
        title: `Injection / Treatment Administered: ${task.medicineName}`,
        message: `Nurse ${user.name} administered ${task.medicineName} (${task.dose}) for patient ${patientName} (UHID: ${uhid}). Route: ${task.administrationDetails?.siteOrRoute || 'IV'}.`,
        notificationType: 'DEPARTMENT_RESPONSE',
        sourceModule: 'nursing',
        entityType: 'NurseTask',
        entityId: task._id,
        actionType: 'REVIEW_TREATMENT_RESPONSE',
        targetModule: 'doctor',
        targetRoute: `/doctor/dashboard?tab=DEPT_RESPONSES&taskId=${task._id}`,
        relatedPatientId: task.patientId,
        relatedTaskId: String(task._id),
      });

      // 2. Notify Cashier / Central Billing
      const billingRoute = `/billing/dashboard?tab=CENTRAL_DESK${billingInvoice?._id ? `&invoiceId=${billingInvoice._id}` : ''}`;
      await NotificationService.createNotification({
        hospitalId: task.hospitalId,
        branchId: task.branchId,
        recipientRoles: ['CASHIER', 'BILLING_STAFF'],
        title: `Bill Ready (Post-Injection): ${task.medicineName}`,
        message: `Nurse ${user.name} completed administration for patient ${patientName} (UHID: ${uhid}). Invoice charges logged for billing clearance.`,
        notificationType: 'BILLING_UPDATE',
        sourceModule: 'nursing',
        entityType: billingInvoice?._id ? 'Invoice' : 'NurseTask',
        entityId: billingInvoice?._id || task._id,
        actionType: 'COLLECT_PAYMENT',
        targetModule: 'billing',
        targetRoute: billingRoute,
        relatedPatientId: task.patientId,
        relatedTaskId: String(billingInvoice?._id || task._id),
      });

      socketManager.emitToUser(String(task.doctorId), 'department:order_update', {
        taskId: task._id,
        status: 'ADMINISTERED',
        medicineName: task.medicineName,
        nurseName: user.name,
      });

    }

    // Check if appointment should transition upon completing nurse tasks
    if (task.appointmentId) {
      try {
        const { Appointment } = await import('../../models/Appointment.js');
        const appt = await Appointment.findOne({ _id: task.appointmentId, hospitalId: user.hospitalId });
        if (appt && appt.status === 'WAITING_NURSE') {
          const remainingPending = await NurseTask.countDocuments({
            hospitalId: user.hospitalId,
            appointmentId: task.appointmentId,
            status: { $in: ['PENDING', 'ACCEPTED', 'SCHEDULED'] },
          });

          if (remainingPending === 0) {
            // Keep patient on department hold so it routes cleanly to "Department Responses"
            appt.status = 'WAITING_DEPARTMENT';
            appt.departmentReturnedAt = new Date();
            await appt.save();

            socketManager.emitToBranch(appt.branchId, 'opd_queue:status_changed', {
              appointmentId: appt._id,
              status: appt.status,
              tokenNumber: appt.tokenNumber,
            });

            socketManager.emitToUser(String(task.doctorId), 'department:order_update', {
              taskId: task._id,
              status: 'ADMINISTERED',
              medicineName: task.medicineName,
              nurseName: user.name,
              linkedPath: `/doctor/dashboard?tab=DEPT_RESPONSES&taskId=${task._id}`,
            });
          }
        }
      } catch (err) {
        console.error('Failed to update appointment upon nurse task completion:', err);
      }
    }

    socketManager.emitToBranch(task.branchId || user.hospitalId, 'workflow:pending_changed', {
      resource: 'NURSE_TASKS',
      taskId: task._id,
      status: task.status,
    });

    return task;
  }
}
