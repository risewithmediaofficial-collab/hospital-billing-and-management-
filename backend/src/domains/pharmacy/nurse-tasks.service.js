import { NurseTask } from '../../models/NurseTask.js';
import { Medicine } from '../../models/Medicine.js';
import { MedicineBatch } from '../../models/MedicineBatch.js';
import { PharmacyStockAdjustment } from '../../models/PharmacyStockAdjustment.js';
import { PharmacyService } from './pharmacy.service.js';
import { ApiError } from '../../utils/apiError.js';
import { socketManager } from '../../events/socketManager.js';

export class NurseTasksService {
  static async createTasksFromPrescription(prescription, user) {
    const createdTasks = [];

    for (const item of prescription.medicines || []) {
      if (item.treatmentType === 'NURSE_ADMINISTERED') {
        const medicine = await Medicine.findOne({
          hospitalId: prescription.hospitalId,
          $or: [{ name: item.medicineName }, { genericName: item.genericName || item.medicineName }],
        });

        const task = await NurseTask.create({
          hospitalId: prescription.hospitalId,
          branchId: prescription.branchId,
          patientId: prescription.patientId,
          doctorId: prescription.doctorId,
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
      }
    }

    if (createdTasks.length > 0) {
      socketManager.emitToBranch(prescription.branchId || prescription.hospitalId, 'workflow:notification', {
        type: 'NEW_NURSE_TASKS',
        count: createdTasks.length,
      });
    }

    return createdTasks;
  }

  static async getNurseTasks(user, query = {}) {
    const filter = { hospitalId: user.hospitalId };
    if (query.patientId) filter.patientId = query.patientId;
    if (query.status) filter.status = query.status;

    return NurseTask.find(filter)
      .populate('patientId', 'firstName lastName uhid gender age bedNo roomNo')
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 })
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
