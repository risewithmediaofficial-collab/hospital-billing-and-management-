import { Router } from 'express';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { requireAssignedRole, requireModulePermission } from '../../middleware/permissions.js';
import {
  getMedicines,
  createMedicine,
  updateMedicine,
  getBatches,
  addBatch,
  adjustStock,
  transferStock,
  getDashboardAlerts,
  getStockAdjustments,
  getPrescriptions,
  dispensePrescription,
  requestSubstitution,
  respondSubstitution,
  acknowledgeSubstitution,
  getPendingSubstitutions,
  getSubstitutions,
  getNurseTasks,
  getAvailableNurses,
  updateNurseTaskStatus,
  createNurseTask,
} from './pharmacy.controller.js';

const router = Router();
router.use(verifyJwt);

// Inventory & Batches
router.get('/medicines', getMedicines);
router.post('/medicines', requireAssignedRole('PHARMACIST', 'PHARMACY_STAFF', 'INVENTORY_MANAGER'), requireModulePermission('pharmacy', 'edit'), createMedicine);
router.put('/medicines/:id', requireAssignedRole('PHARMACIST', 'PHARMACY_STAFF', 'INVENTORY_MANAGER'), requireModulePermission('pharmacy', 'edit'), updateMedicine);
router.get('/batches', getBatches);
router.post('/batches', requireAssignedRole('PHARMACIST', 'PHARMACY_STAFF', 'INVENTORY_MANAGER'), requireModulePermission('pharmacy', 'edit'), addBatch);
router.post('/stock/adjust', requireAssignedRole('PHARMACIST', 'PHARMACY_STAFF', 'INVENTORY_MANAGER'), requireModulePermission('pharmacy', 'edit'), adjustStock);
router.post('/stock/transfer', requireAssignedRole('PHARMACIST', 'PHARMACY_STAFF', 'INVENTORY_MANAGER'), requireModulePermission('pharmacy', 'edit'), transferStock);
router.get('/alerts', getDashboardAlerts);
router.get('/stock-movements', getStockAdjustments);
router.get('/stock/adjustments', getStockAdjustments);

// E-Prescriptions & Dispensing
router.get('/prescriptions', getPrescriptions);
router.patch('/prescriptions/:id/dispense', requireAssignedRole('PHARMACIST', 'PHARMACY_STAFF'), requireModulePermission('pharmacy', 'dispense'), dispensePrescription);

// Substitutions
router.post('/substitutions/request', requireAssignedRole('PHARMACIST', 'PHARMACY_STAFF'), requestSubstitution);
router.get('/substitutions', getSubstitutions);
router.get('/substitutions/pending', getPendingSubstitutions);
router.patch('/substitutions/:id/respond', requireAssignedRole('DOCTOR'), respondSubstitution);
router.patch('/substitutions/:id/acknowledge', requireAssignedRole('PHARMACIST', 'PHARMACY_STAFF'), acknowledgeSubstitution);

// Nurse Administration Tasks
router.get('/nurse-tasks', getNurseTasks);
router.post('/nurse-tasks', requireAssignedRole('DOCTOR'), createNurseTask);
router.post('/request-injection', requireAssignedRole('DOCTOR'), createNurseTask);
router.get('/available-nurses', getAvailableNurses);
router.patch('/nurse-tasks/:id/status', requireAssignedRole('NURSE', 'NURSE_INCHARGE'), updateNurseTaskStatus);
router.patch('/nurse-tasks/:id/doctor-review', requireAssignedRole('DOCTOR'), async (req, res, next) => {
  try {
    const { NurseTask } = await import('../../models/NurseTask.js');
    const task = await NurseTask.findOneAndUpdate(
      { _id: req.params.id, hospitalId: req.user.hospitalId },
      { $set: { doctorReviewedAt: new Date() } },
      { new: true }
    );
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

// Prescription-time availability check for doctors
router.post('/prescriptions/check-availability', requireAssignedRole('DOCTOR'), async (req, res, next) => {
  try {
    const { Medicine } = await import('../../models/Medicine.js');
    const { MedicineBatch } = await import('../../models/MedicineBatch.js');
    const { medicines } = req.body; // [{ medicineId, medicineName, dosageForm, strength }]

    if (!Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ success: false, message: 'medicines array is required' });
    }

    const hospitalId = req.user.hospitalId;
    const now = new Date();
    const results = [];

    for (const item of medicines) {
      const filter = { hospitalId, isActive: true };
      if (item.medicineId) {
        filter._id = item.medicineId;
      } else {
        const regex = new RegExp(item.medicineName, 'i');
        filter.$or = [{ name: regex }, { genericName: regex }, { brandName: regex }];
        if (item.dosageForm) filter.dosageForm = item.dosageForm.toUpperCase();
      }

      const medicine = await Medicine.findOne(filter).lean();

      if (!medicine) {
        results.push({
          ...item,
          status: 'NOT_MAINTAINED',
          stockStatus: 'NOT_MAINTAINED',
          totalQuantity: 0,
          message: 'This medicine is not listed in this hospital pharmacy.',
        });
        continue;
      }

      // Get total available stock across all valid batches
      const batchFilter = {
        hospitalId,
        medicineId: medicine._id,
        isActive: true,
        expiryDate: { $gt: now },
        quantity: { $gt: 0 },
      };
      if (req.body.location) batchFilter.location = req.body.location;

      const batches = await MedicineBatch.find(batchFilter).lean();
      const totalQty = batches.reduce((sum, b) => sum + b.quantity, 0);

      const nearExpiryThreshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const nearExpiryBatches = batches.filter(b => new Date(b.expiryDate) <= nearExpiryThreshold);

      let stockStatus;
      if (totalQty === 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (totalQty <= medicine.minimumStockLevel) {
        stockStatus = 'LOW_STOCK';
      } else if (nearExpiryBatches.length > 0) {
        stockStatus = 'NEAR_EXPIRY';
      } else {
        stockStatus = 'AVAILABLE';
      }

      results.push({
        medicineId: medicine._id,
        medicineName: medicine.name,
        genericName: medicine.genericName,
        dosageForm: medicine.dosageForm,
        strength: medicine.strength,
        status: stockStatus,
        stockStatus,
        totalQuantity: totalQty,
        minimumStockLevel: medicine.minimumStockLevel,
        locations: batches.map(b => ({ location: b.location, quantity: b.quantity, expiryDate: b.expiryDate })),
        message: stockStatus === 'OUT_OF_STOCK'
          ? `${medicine.name} is currently OUT OF STOCK in this hospital pharmacy.`
          : stockStatus === 'LOW_STOCK'
          ? `${medicine.name} is LOW STOCK (${totalQty} remaining).`
          : stockStatus === 'NEAR_EXPIRY'
          ? `${medicine.name} has batches nearing expiry within 30 days.`
          : `${medicine.name} is available (${totalQty} units).`,
      });
    }

    const hasUnavailable = results.some(r => r.stockStatus === 'OUT_OF_STOCK' || r.stockStatus === 'NOT_MAINTAINED');
    return res.json({
      success: true,
      data: {
        results,
        hasUnavailableItems: hasUnavailable,
        summary: `${results.filter(r => r.stockStatus === 'AVAILABLE').length}/${results.length} medicines available`,
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
