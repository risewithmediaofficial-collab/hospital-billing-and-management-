import { NurseTask } from '../../models/NurseTask.js';
import { Medicine } from '../../models/Medicine.js';
import { MedicineBatch } from '../../models/MedicineBatch.js';
import { PharmacyStockAdjustment } from '../../models/PharmacyStockAdjustment.js';
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

    // If no dedicated nurses exist (e.g. small solo clinic where doctor handles everything), include current user
    if (nurses.length === 0 && user) {
      nurses.push({
        _id: user.id || user._id,
        name: `${user.name || 'Doctor'} (Self / Clinic Desk)`,
        role: user.role || 'DOCTOR',
        isAvailable: true,
      });
    }

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
          isAvailable: nurse.isAvailable !== false,
          activeTaskCount,
        };
      })
    );

    // Sort by: available first, then lowest active task count (least workload recommendation)
    nurseListWithWorkload.sort((a, b) => {
      if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
      return a.activeTaskCount - b.activeTaskCount;
    });

    return nurseListWithWorkload;
  }

  static async createTasksFromPrescription(prescription, user) {
    const createdTasks = [];
    const admission = await Admission.findOne({ patientId: prescription.patientId, status: 'ADMITTED' })
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
      
      const targetNurseIds = Array.from(new Set(pendingNurseTasks.map(t => t.assignedNurseId).filter(Boolean)));
      if (targetNurseIds.length > 0) {
        targetNurseIds.forEach(nId => socketManager.emitToUser(String(nId), 'workflow:notification', envelope));
      }
      socketManager.emitToRole('NURSE', 'workflow:notification', envelope);
      socketManager.emitToRole('NURSE_INCHARGE', 'workflow:notification', envelope);

      await NotificationService.createNotification({
        hospitalId: prescription.hospitalId,
        branchId: prescription.branchId,
        recipientUserId: targetNurseIds[0] || null,
        recipientRole: targetNurseIds.length === 0 ? 'NURSE' : null,
        title: 'New nurse treatment task',
        message: `${pendingNurseTasks.length} nurse-administered treatment task${pendingNurseTasks.length === 1 ? '' : 's'} received from the consulting doctor.`,
        notificationType: 'NEW_DATA',
        targetModule: 'nursing',
        targetRoute: '/nurse-incharge/dashboard?tab=TASKS',
        relatedPatientId: prescription.patientId,
        relatedTaskId: String(pendingNurseTasks[0]._id),
      });
      socketManager.emitToBranch(prescription.branchId || prescription.hospitalId, 'workflow:pending_changed', envelope);
      try {
        const { WorkflowEventService, WORKFLOW_EVENTS } = await import('../../events/workflowEventService.js');
        WorkflowEventService.emitSync(WORKFLOW_EVENTS.NURSE_REQUEST_RAISED, {
          patientId: prescription.patientId,
          taskCount: pendingNurseTasks.length,
          doctorId: prescription.doctorId,
          linkedPath: '/nurse-incharge/dashboard?tab=TASKS',
        }, prescription.branchId || prescription.hospitalId);
      } catch (e) {}
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

          const medicine = await Medicine.findById(task.medicineId);
          if (medicine) {
            // Automatically add charge to patient's bill
            await PharmacyService.addPharmacyChargeToBill({
              hospitalId: user.hospitalId,
              branchId: user.branchId,
              patientId: task.patientId,
              doctorId: task.doctorId,
              description: `${task.medicineName} (${task.dose}) - Nurse Administered [Batch: ${batch.batchNumber}]`,
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

    await task.save();

    socketManager.emitToBranch(task.branchId || user.hospitalId, 'workflow:pending_changed', {
      resource: 'NURSE_TASKS',
      taskId: task._id,
      status: task.status,
    });

    return task;
  }
}
