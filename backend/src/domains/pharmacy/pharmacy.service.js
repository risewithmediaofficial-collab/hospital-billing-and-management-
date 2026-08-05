import mongoose from 'mongoose';
import { Medicine } from '../../models/Medicine.js';
import { MedicineBatch } from '../../models/MedicineBatch.js';
import { PharmacyStockAdjustment } from '../../models/PharmacyStockAdjustment.js';
import { PharmacySubstitutionRequest } from '../../models/PharmacySubstitutionRequest.js';
import { Prescription } from '../../models/Prescription.js';
import { NurseTask } from '../../models/NurseTask.js';
import { Invoice } from '../../models/Invoice.js';
import { Patient } from '../../models/Patient.js';
import { AuditLog } from '../../models/AuditLog.js';
import { ApiError } from '../../utils/apiError.js';
import { socketManager } from '../../events/socketManager.js';
import { PAYMENT_STATUS } from '../../config/constants.js';

export class PharmacyService {
  // --- INVENTORY MANAGEMENT ---

  static async getMedicines(user, query = {}) {
    const filter = { hospitalId: user.hospitalId, isActive: true };
    if (user.branchId) filter.branchId = user.branchId;

    if (query.category) filter.category = query.category;
    if (query.dosageForm) filter.dosageForm = query.dosageForm;
    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [{ name: regex }, { genericName: regex }, { brandName: regex }, { manufacturer: regex }];
    }

    const medicines = await Medicine.find(filter).sort({ name: 1 }).lean();

    // Attach batch & stock details
    const medicineIds = medicines.map((m) => m._id);
    const now = new Date();
    const batchFilter = { hospitalId: user.hospitalId, medicineId: { $in: medicineIds }, isActive: true };
    if (query.location) batchFilter.location = query.location;

    const batches = await MedicineBatch.find(batchFilter).sort({ expiryDate: 1 }).lean();

    return medicines.map((med) => {
      const medBatches = batches.filter((b) => String(b.medicineId) === String(med._id));
      const validBatches = medBatches.filter((b) => new Date(b.expiryDate) > now && b.quantity > 0);
      const totalAvailableQty = validBatches.reduce((sum, b) => sum + b.quantity, 0);

      // Redact purchase price if patient or guardian
      const isPatientOrGuardian = ['PATIENT', 'GUARDIAN'].includes(user.role);
      const baseMed = {
        ...med,
        totalQuantity: totalAvailableQty,
        stockStatus:
          totalAvailableQty === 0
            ? 'OUT_OF_STOCK'
            : totalAvailableQty <= med.minimumStockLevel
            ? 'LOW_STOCK'
            : 'IN_STOCK',
        batches: isPatientOrGuardian
          ? validBatches.map(({ purchasePrice, ...b }) => b)
          : medBatches,
      };

      if (isPatientOrGuardian) {
        delete baseMed.purchasePrice;
        delete baseMed.supplier;
      }

      return baseMed;
    });
  }

  static async createMedicine(data, user) {
    if (!data.name || !data.genericName || !data.category) {
      throw new ApiError(400, 'Medicine Name, Generic Name, and Category are required');
    }

    const medicine = await Medicine.create({
      ...data,
      hospitalId: user.hospitalId,
      branchId: user.branchId,
    });

    await AuditLog.create({
      hospitalId: user.hospitalId,
      userId: user.id,
      userRole: user.role,
      action: 'MEDICINE_CREATED',
      module: 'PHARMACY',
      resourceId: String(medicine._id),
      details: `Created new medicine SKU: ${medicine.name} (${medicine.genericName})`,
    });

    return medicine;
  }

  static async updateMedicine(medicineId, data, user) {
    const medicine = await Medicine.findOne({ _id: medicineId, hospitalId: user.hospitalId });
    if (!medicine) throw new ApiError(404, 'Medicine not found');

    Object.assign(medicine, data);
    await medicine.save();

    await AuditLog.create({
      hospitalId: user.hospitalId,
      userId: user.id,
      userRole: user.role,
      action: 'MEDICINE_UPDATED',
      module: 'PHARMACY',
      resourceId: String(medicine._id),
      details: `Updated medicine details for ${medicine.name}`,
    });

    return medicine;
  }

  // --- BATCH MANAGEMENT ---

  static async addBatch(data, user) {
    const medicine = await Medicine.findOne({ _id: data.medicineId, hospitalId: user.hospitalId });
    if (!medicine) throw new ApiError(404, 'Medicine record not found');

    const batch = await MedicineBatch.create({
      hospitalId: user.hospitalId,
      branchId: user.branchId,
      medicineId: medicine._id,
      batchNumber: data.batchNumber,
      location: data.location || 'MAIN_PHARMACY',
      mfgDate: data.mfgDate,
      expiryDate: data.expiryDate,
      purchasePrice: data.purchasePrice ?? medicine.purchasePrice,
      sellingPrice: data.sellingPrice ?? medicine.sellingPrice,
      quantity: Number(data.quantity) || 0,
      storageLocation: data.storageLocation || 'Rack 1',
    });

    // Record stock adjustment audit log
    await PharmacyStockAdjustment.create({
      hospitalId: user.hospitalId,
      branchId: user.branchId,
      medicineId: medicine._id,
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      type: 'ADD_STOCK',
      sourceLocation: batch.location,
      previousQuantity: 0,
      quantityChanged: batch.quantity,
      newQuantity: batch.quantity,
      reason: data.reason || 'Initial purchase / stock addition',
      performedBy: user.id,
      performedByName: user.name,
    });

    socketManager.emitToBranch(user.branchId || user.hospitalId, 'workflow:pending_changed', {
      resource: 'PHARMACY_STOCK',
    });

    return batch;
  }

  static async adjustStock(data, user) {
    const { batchId, type, quantityChanged, reason } = data;
    if (!reason || !reason.trim()) {
      throw new ApiError(400, 'A reason is required for stock adjustments');
    }

    const batch = await MedicineBatch.findOne({ _id: batchId, hospitalId: user.hospitalId });
    if (!batch) throw new ApiError(404, 'Batch not found');

    const qtyChange = Number(quantityChanged);
    const prevQty = batch.quantity;
    const newQty = Math.max(0, prevQty + qtyChange);

    batch.quantity = newQty;
    await batch.save();

    await PharmacyStockAdjustment.create({
      hospitalId: user.hospitalId,
      branchId: user.branchId,
      medicineId: batch.medicineId,
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      type: type || 'ADJUSTMENT',
      sourceLocation: batch.location,
      previousQuantity: prevQty,
      quantityChanged: qtyChange,
      newQuantity: newQty,
      reason: reason.trim(),
      performedBy: user.id,
      performedByName: user.name,
    });

    return batch;
  }

  static async transferStock(data, user) {
    const { batchId, destinationLocation, transferQuantity, reason } = data;
    if (!destinationLocation || !transferQuantity || transferQuantity <= 0) {
      throw new ApiError(400, 'Destination location and positive transfer quantity are required');
    }

    const sourceBatch = await MedicineBatch.findOne({ _id: batchId, hospitalId: user.hospitalId });
    if (!sourceBatch) throw new ApiError(404, 'Source batch not found');
    if (sourceBatch.quantity < transferQuantity) {
      throw new ApiError(400, `Insufficient quantity in source location. Available: ${sourceBatch.quantity}`);
    }

    // Deduct from source batch
    const sourcePrev = sourceBatch.quantity;
    sourceBatch.quantity -= transferQuantity;
    await sourceBatch.save();

    // Find or create destination batch
    let destBatch = await MedicineBatch.findOne({
      hospitalId: user.hospitalId,
      medicineId: sourceBatch.medicineId,
      batchNumber: sourceBatch.batchNumber,
      location: destinationLocation,
    });

    if (!destBatch) {
      destBatch = await MedicineBatch.create({
        hospitalId: user.hospitalId,
        branchId: user.branchId,
        medicineId: sourceBatch.medicineId,
        batchNumber: sourceBatch.batchNumber,
        location: destinationLocation,
        mfgDate: sourceBatch.mfgDate,
        expiryDate: sourceBatch.expiryDate,
        purchasePrice: sourceBatch.purchasePrice,
        sellingPrice: sourceBatch.sellingPrice,
        quantity: transferQuantity,
        storageLocation: sourceBatch.storageLocation,
      });
    } else {
      destBatch.quantity += transferQuantity;
      await destBatch.save();
    }

    // Log adjustment audit
    await PharmacyStockAdjustment.create({
      hospitalId: user.hospitalId,
      branchId: user.branchId,
      medicineId: sourceBatch.medicineId,
      batchId: sourceBatch._id,
      batchNumber: sourceBatch.batchNumber,
      type: 'TRANSFER',
      sourceLocation: sourceBatch.location,
      destinationLocation,
      previousQuantity: sourcePrev,
      quantityChanged: -transferQuantity,
      newQuantity: sourceBatch.quantity,
      reason: reason || `Inter-departmental transfer to ${destinationLocation}`,
      performedBy: user.id,
      performedByName: user.name,
    });

    return { sourceBatch, destBatch };
  }

  // --- DASHBOARD ALERTS & REPORTS ---

  static async getDashboardAlerts(user) {
    const filter = { hospitalId: user.hospitalId, isActive: true };

    const medicines = await Medicine.find(filter).lean();
    const batches = await MedicineBatch.find(filter).lean();

    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const lowStock = [];
    const outOfStock = [];
    const nearExpiry = [];
    const expired = [];

    for (const med of medicines) {
      const medBatches = batches.filter((b) => String(b.medicineId) === String(med._id));
      const validBatches = medBatches.filter((b) => new Date(b.expiryDate) > now && b.quantity > 0);
      const totalQty = validBatches.reduce((sum, b) => sum + b.quantity, 0);

      if (totalQty === 0) {
        outOfStock.push(med);
      } else if (totalQty <= med.minimumStockLevel) {
        lowStock.push({ ...med, totalQuantity: totalQty });
      }

      for (const b of medBatches) {
        const exp = new Date(b.expiryDate);
        if (exp <= now && b.quantity > 0) {
          expired.push({ ...med, batchNumber: b.batchNumber, location: b.location, quantity: b.quantity, expiryDate: b.expiryDate });
        } else if (exp > now && exp <= thirtyDays && b.quantity > 0) {
          nearExpiry.push({ ...med, batchNumber: b.batchNumber, location: b.location, quantity: b.quantity, expiryDate: b.expiryDate });
        }
      }
    }

    return {
      lowStock,
      outOfStock,
      nearExpiry,
      expired,
    };
  }

  static async getStockAdjustments(user) {
    return PharmacyStockAdjustment.find({ hospitalId: user.hospitalId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('medicineId', 'name genericName')
      .populate('performedBy', 'name role')
      .lean();
  }

  // --- PRESCRIPTION DISPENSING (FEFO) ---

  static async getPrescriptions(user) {
    const filter = { hospitalId: user.hospitalId };
    if (user.branchId) filter.branchId = user.branchId;

    return Prescription.find(filter)
      .populate('patientId', 'firstName lastName uhid phone age gender')
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 })
      .lean();
  }

  static async dispense(prescriptionId, dispenseData, user) {
    const prescription = await Prescription.findOne({ _id: prescriptionId, hospitalId: user.hospitalId });
    if (!prescription) throw new ApiError(404, 'Prescription not found');

    const now = new Date();
    const itemsToDispense = dispenseData?.items || prescription.medicines;

    let overallDispensed = true;
    let anyDispensed = false;

    for (const item of prescription.medicines) {
      const dispenseReq = itemsToDispense.find(
        (i) => String(i.medicineName).toLowerCase() === String(item.medicineName).toLowerCase()
      ) || item;

      if (dispenseReq.purchasedExternally) {
        item.itemStatus = 'PURCHASED_EXTERNALLY';
        item.externalPurchaseRequired = true;
        item.externalPurchaseNote = dispenseReq.note || 'Patient purchased externally';
        continue;
      }

      // Check available FEFO batches for this medicine
      const medicine = await Medicine.findOne({
        hospitalId: user.hospitalId,
        $or: [{ name: item.medicineName }, { genericName: item.genericName || item.medicineName }],
      });

      if (!medicine) {
        item.itemStatus = 'UNAVAILABLE';
        overallDispensed = false;
        continue;
      }

      // Find valid batches sorted by earliest expiry date (FEFO)
      const batches = await MedicineBatch.find({
        hospitalId: user.hospitalId,
        medicineId: medicine._id,
        location: 'MAIN_PHARMACY',
        quantity: { $gt: 0 },
        expiryDate: { $gt: now },
      }).sort({ expiryDate: 1 });

      const requestedQty = (item.durationDays || 5) * 2; // Default dosage calculation if not specified
      let qtyNeeded = requestedQty;
      let qtyDispensed = 0;
      let usedBatchNo = '';

      for (const batch of batches) {
        if (qtyNeeded <= 0) break;
        const takeQty = Math.min(qtyNeeded, batch.quantity);

        batch.quantity -= takeQty;
        await batch.save();

        qtyNeeded -= takeQty;
        qtyDispensed += takeQty;
        usedBatchNo = batch.batchNumber;

        // Log audit
        await PharmacyStockAdjustment.create({
          hospitalId: user.hospitalId,
          branchId: user.branchId,
          medicineId: medicine._id,
          batchId: batch._id,
          batchNumber: batch.batchNumber,
          type: 'DISPENSE',
          sourceLocation: 'MAIN_PHARMACY',
          previousQuantity: batch.quantity + takeQty,
          quantityChanged: -takeQty,
          newQuantity: batch.quantity,
          reason: `Dispensed for Prescription #${prescription.prescriptionNo}`,
          performedBy: user.id,
          performedByName: user.name,
        });
      }

      if (qtyDispensed > 0) {
        anyDispensed = true;
        item.dispensedQty = qtyDispensed;
        item.batchNumberUsed = usedBatchNo;
        item.itemStatus = qtyDispensed >= requestedQty ? 'DISPENSED' : 'PARTIALLY_DISPENSED';
        if (qtyDispensed < requestedQty) overallDispensed = false;

        // Automatically add to Patient Invoice
        await PharmacyService.addPharmacyChargeToBill({
          hospitalId: user.hospitalId,
          branchId: user.branchId,
          patientId: prescription.patientId,
          doctorId: prescription.doctorId,
          description: `${item.medicineName} (${item.dosageForm || 'Tab'}) [Batch: ${usedBatchNo}]`,
          qty: qtyDispensed,
          unitPrice: medicine.sellingPrice,
          taxPercentage: medicine.taxPercentage,
        });
      } else {
        item.itemStatus = 'UNAVAILABLE';
        overallDispensed = false;
      }
    }

    prescription.dispenseStatus = overallDispensed ? 'DISPENSED' : anyDispensed ? 'PARTIALLY_DISPENSED' : 'PENDING_DISPENSE';
    prescription.dispensedBy = user.id;
    prescription.dispensedAt = new Date();
    prescription.pharmacyNotes = dispenseData?.pharmacyNotes || 'Processed by Pharmacy';
    await prescription.save();

    socketManager.emitToBranch(prescription.branchId || user.hospitalId, 'workflow:pending_changed', {
      resourceId: prescription._id,
      status: prescription.dispenseStatus,
    });

    return prescription;
  }

  // --- AUTOMATED BILLING INTEGRATION ---

  static async addPharmacyChargeToBill({ hospitalId, branchId, patientId, doctorId, description, qty, unitPrice, taxPercentage }) {
    const tax = (unitPrice * (taxPercentage || 0)) / 100;
    const itemUnitPrice = unitPrice + tax;
    const totalPrice = itemUnitPrice * qty;

    let invoice = await Invoice.findOne({
      hospitalId,
      patientId,
      status: { $in: [PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.PARTIALLY_PAID] },
    }).sort({ createdAt: -1 });

    if (!invoice) {
      const invCount = await Invoice.countDocuments({ hospitalId });
      const invoiceNo = `INV-PHARM-${Date.now().toString().slice(-4)}-${invCount + 1}`;

      invoice = new Invoice({
        hospitalId,
        branchId,
        patientId,
        doctorId,
        invoiceNo,
        items: [],
        subtotal: 0,
        discountAmount: 0,
        grandTotal: 0,
        paidAmount: 0,
        balanceAmount: 0,
        status: PAYMENT_STATUS.UNPAID,
      });
    }

    invoice.items.push({
      description,
      category: 'PHARMACY',
      qty,
      unitPrice: itemUnitPrice,
      totalPrice,
    });

    invoice.subtotal = invoice.items.reduce((acc, i) => acc + i.totalPrice, 0);
    invoice.grandTotal = Math.max(0, invoice.subtotal - (invoice.discountAmount || 0));
    invoice.balanceAmount = invoice.grandTotal - (invoice.paidAmount || 0);

    await invoice.save();
    return invoice;
  }

  // --- SUBSTITUTION WORKFLOW ---

  static async requestSubstitution(data, user) {
    const { prescriptionId, originalMedicineName, suggestedMedicineId, reason } = data;
    const prescription = await Prescription.findOne({ _id: prescriptionId, hospitalId: user.hospitalId });
    if (!prescription) throw new ApiError(404, 'Prescription not found');

    const suggestedMed = await Medicine.findOne({ _id: suggestedMedicineId, hospitalId: user.hospitalId });
    if (!suggestedMed) throw new ApiError(404, 'Suggested alternative medicine not found');

    const batches = await MedicineBatch.find({
      hospitalId: user.hospitalId,
      medicineId: suggestedMed._id,
      quantity: { $gt: 0 },
      expiryDate: { $gt: new Date() },
    });
    const availQty = batches.reduce((acc, b) => acc + b.quantity, 0);

    const req = await PharmacySubstitutionRequest.create({
      hospitalId: user.hospitalId,
      branchId: user.branchId,
      prescriptionId: prescription._id,
      patientId: prescription.patientId,
      doctorId: prescription.doctorId,
      pharmacistId: user.id,
      originalMedicineName,
      suggestedMedicineId: suggestedMed._id,
      suggestedMedicineName: suggestedMed.name,
      genericComposition: suggestedMed.genericName,
      strength: suggestedMed.strength,
      availableQty: availQty,
      priceDifference: suggestedMed.sellingPrice,
      reason: reason || 'Prescribed brand is out of stock',
    });

    socketManager.emitToBranch(user.branchId || user.hospitalId, 'workflow:notification', {
      type: 'SUBSTITUTION_REQUEST',
      doctorId: prescription.doctorId,
      requestId: req._id,
    });

    return req;
  }

  static async respondSubstitution(requestId, { status, doctorNotes }, user) {
    const req = await PharmacySubstitutionRequest.findOne({ _id: requestId, hospitalId: user.hospitalId });
    if (!req) throw new ApiError(404, 'Substitution request not found');

    req.status = status;
    req.doctorResponseNotes = doctorNotes || '';
    req.respondedAt = new Date();
    await req.save();

    socketManager.emitToBranch(user.branchId || user.hospitalId, 'workflow:notification', {
      type: 'SUBSTITUTION_RESPONSE',
      requestId: req._id,
      status,
    });

    return req;
  }

  static async getPendingSubstitutions(user) {
    const filter = { hospitalId: user.hospitalId };
    if (user.role === 'DOCTOR') filter.doctorId = user.id;

    return PharmacySubstitutionRequest.find(filter)
      .populate('patientId', 'firstName lastName uhid')
      .populate('doctorId', 'name')
      .populate('pharmacistId', 'name')
      .sort({ createdAt: -1 })
      .lean();
  }
}
