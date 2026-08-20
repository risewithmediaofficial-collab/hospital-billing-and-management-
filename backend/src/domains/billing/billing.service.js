import { Invoice } from '../../models/Invoice.js';
import { Receipt } from '../../models/Receipt.js';
import { Patient } from '../../models/Patient.js';
import { Consultation } from '../../models/Consultation.js';
import { PAYMENT_STATUS } from '../../config/constants.js';
import { ApiError } from '../../utils/apiError.js';
import { socketManager } from '../../events/socketManager.js';
import { WorkflowEventService, WORKFLOW_EVENTS } from '../../events/workflowEventService.js';

export class BillingService {
  /**
   * Called by cashier dashboard: fetch all UNPAID invoices with
   * full patient + consultation context already populated.
   */
  static async getUnpaidInvoices(user) {
    let hospitalId = user?.hospitalId;
    if (!hospitalId) {
      const { Hospital } = await import('../../models/Hospital.js');
      const h = await Hospital.findOne({});
      hospitalId = h?._id;
    }

    const invoices = await Invoice.find({
      hospitalId,
      status: { $in: [PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.PARTIALLY_PAID] },
      isDeleted: { $ne: true },
    })
      .populate('patientId')
      .populate('doctorId', 'name specialization cabinNo')
      .sort({ createdAt: 1 });

    // Attach consultation data to each invoice
    const enriched = await Promise.all(
      invoices.map(async (inv) => {
        const filter = { patientId: inv.patientId?._id || inv.patientId };
        if (inv.doctorId) {
          filter.doctorId = inv.doctorId._id || inv.doctorId;
        }

        let consultation = await Consultation.findOne(filter)
          .populate('doctorId', 'name specialization cabinNo')
          .sort({ createdAt: -1 });

        if (!consultation && inv.patientId) {
          consultation = await Consultation.findOne({ patientId: inv.patientId._id || inv.patientId })
            .populate('doctorId', 'name specialization cabinNo')
            .sort({ createdAt: -1 });
        }

        if (consultation) consultation = consultation.toObject();

        return {
          ...inv.toObject(),
          consultation: consultation || null,
        };
      })
    );

    return enriched;
  }

  /**
   * Manually create an invoice (used when no doctor consultation exists).
   */
  static async createInvoice(data, user) {
    const patient = await Patient.findById(data.patientId);
    if (!patient) {
      throw new ApiError(404, 'Patient record not found for billing', null, 'NOT_FOUND');
    }

    // Collision-proof invoice number generation (same pattern as UHID)
    const year = new Date().getFullYear();
    let seqNum = await Invoice.countDocuments({ hospitalId: user.hospitalId }) + 1;
    let invoiceNo = `INV-${year}-${String(seqNum).padStart(5, '0')}`;
    let existing = await Invoice.findOne({ hospitalId: user.hospitalId, invoiceNo });
    while (existing) {
      seqNum++;
      invoiceNo = `INV-${year}-${String(seqNum).padStart(5, '0')}`;
      existing = await Invoice.findOne({ hospitalId: user.hospitalId, invoiceNo });
    }

    const items = data.items || [
      { description: 'OPD Consultation Fee', category: 'CONSULTATION', qty: 1, unitPrice: 100.0, totalPrice: 100.0 },
    ];

    const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);
    const discountAmount = data.discountAmount || 0;
    const grandTotal = Math.max(0, subtotal - discountAmount);

    const invoice = await Invoice.create({
      hospitalId: user.hospitalId,
      branchId: user.branchId,
      patientId: patient._id,
      invoiceNo,
      items,
      subtotal,
      discountAmount,
      grandTotal,
      paidAmount: 0,
      balanceAmount: grandTotal,
      status: PAYMENT_STATUS.UNPAID,
    });

    return await Invoice.findById(invoice._id).populate('patientId');
  }

  static async processPayment(data, user) {
    const invoice = await Invoice.findById(data.invoiceId).populate('patientId');
    if (!invoice) {
      throw new ApiError(404, 'Invoice record not found', null, 'NOT_FOUND');
    }

    const amountPaid = Number(data.amountPaid);
    if (isNaN(amountPaid) || amountPaid <= 0) {
      throw new ApiError(400, 'Valid payment amount is required', null, 'INVALID_AMOUNT');
    }

    // Handle Split / Multi-Tender Payments
    let finalSplitPayments = [];
    let isSplit = data.paymentMode === 'SPLIT' || (Array.isArray(data.splitPayments) && data.splitPayments.length > 0);

    if (Array.isArray(data.splitPayments) && data.splitPayments.length > 0) {
      finalSplitPayments = data.splitPayments
        .filter((s) => s && Number(s.amount) > 0)
        .map((s) => ({
          mode: s.mode || 'CASH',
          amount: Number(s.amount),
          reference: s.reference ? String(s.reference).trim() : '',
          notes: s.notes ? String(s.notes).trim() : '',
        }));

      if (finalSplitPayments.length > 0) {
        const splitSum = finalSplitPayments.reduce((acc, cur) => acc + cur.amount, 0);
        if (Math.abs(splitSum - amountPaid) > 0.01) {
          throw new ApiError(
            400,
            `Split payments total (₹${splitSum.toFixed(2)}) must equal the amount paid (₹${amountPaid.toFixed(2)}).`,
            null,
            'SPLIT_AMOUNT_MISMATCH'
          );
        }
        isSplit = true;
      }
    }

    let primaryMode = isSplit ? 'SPLIT' : (data.paymentMode || 'CARD');
    let autoRemarks = data.remarks || 'Payment collected successfully';
    if (isSplit && finalSplitPayments.length > 0) {
      const splitSummary = finalSplitPayments
        .map((s) => `${s.mode}: ₹${s.amount.toFixed(2)}${s.reference ? ` (${s.reference})` : ''}`)
        .join(', ');
      autoRemarks = data.remarks
        ? `${data.remarks} | Split Breakdown: ${splitSummary}`
        : `Split: ${splitSummary}`;
    }

    // Collision-proof receipt number generation
    const rcYear = new Date().getFullYear();
    let rcSeq = (await Receipt.countDocuments({ hospitalId: user.hospitalId })) + 1;
    let receiptNo = `REC-${rcYear}-${String(rcSeq).padStart(5, '0')}`;
    let rcExisting = await Receipt.findOne({ hospitalId: user.hospitalId, receiptNo });
    while (rcExisting) {
      rcSeq++;
      receiptNo = `REC-${rcYear}-${String(rcSeq).padStart(5, '0')}`;
      rcExisting = await Receipt.findOne({ hospitalId: user.hospitalId, receiptNo });
    }

    const receipt = await Receipt.create({
      hospitalId: user.hospitalId,
      branchId: user.branchId,
      invoiceId: invoice._id,
      patientId: invoice.patientId._id,
      cashierId: user.id,
      receiptNo,
      amountPaid,
      paymentMode: primaryMode,
      splitPayments: finalSplitPayments,
      transactionRef: data.transactionRef || (isSplit ? 'TXN-SPLIT-MULTI' : 'TXN-COUNTER'),
      remarks: autoRemarks,
      followUpDate: invoice.followUpDate || null,
    });

    invoice.paidAmount += amountPaid;
    invoice.balanceAmount = Math.max(0, invoice.grandTotal - invoice.paidAmount);

    if (invoice.balanceAmount === 0) {
      invoice.status = PAYMENT_STATUS.PAID;
    } else {
      invoice.status = PAYMENT_STATUS.PARTIALLY_PAID;
    }

    await invoice.save();
    socketManager.emitToBranch(invoice.branchId, 'workflow:pending_changed', { resourceId: invoice._id, status: invoice.status });

    if (invoice.status === PAYMENT_STATUS.PAID) {
      const patientName = `${invoice.patientId?.firstName || ''} ${invoice.patientId?.lastName || ''}`.trim() || 'Patient';
      const paymentPayload = {
        invoiceId: invoice._id,
        invoiceNo: invoice.invoiceNo,
        patientId: invoice.patientId?._id || invoice.patientId,
        patientName,
        uhid: invoice.patientId?.uhid || 'N/A',
        receiptNo: receipt.receiptNo,
        linkedPath: '/reception/registered-patients?tab=COMPLETED',
      };
      WorkflowEventService.emitSync(WORKFLOW_EVENTS.PAYMENT_COLLECTED, paymentPayload, invoice.branchId);
      socketManager.emitToBranch(invoice.branchId, 'billing:payment_collected', paymentPayload);
    }

    const populatedReceipt = await Receipt.findById(receipt._id)
      .populate('hospitalId', 'name code domain address contactPhone contactEmail logo')
      .populate({
        path: 'invoiceId',
        populate: [
          { path: 'patientId' },
          { path: 'doctorId', select: 'name specialization cabinNo' },
        ],
      })
      .populate('patientId')
      .populate('cashierId', 'name email role');

    return {
      receipt: populatedReceipt || receipt,
      invoice,
    };
  }

  static async getInvoices(user) {
    const query = { isDeleted: { $ne: true } };
    if (user.branchId) query.branchId = user.branchId;
    else if (user.hospitalId) query.hospitalId = user.hospitalId;
    return await Invoice.find(query)
      .populate('patientId')
      .populate('hospitalId', 'name code domain address contactPhone contactEmail logo')
      .sort({ createdAt: -1 });
  }

  static async getReceipts(user, queryParams = {}) {
    const query = { isDeleted: { $ne: true } };
    if (user?.role === 'SUPER_ADMIN') {
      if (queryParams.all === 'true' || queryParams.hospitalId === 'ALL') {
        // No hospitalId restriction — return all receipts across all hospitals
      } else if (queryParams.hospitalId) {
        query.hospitalId = queryParams.hospitalId;
      } else if (user._hospitalContextApplied && user.hospitalId) {
        query.hospitalId = user.hospitalId;
      }
    } else {
      if (user.branchId) query.branchId = user.branchId;
      else if (user.hospitalId) query.hospitalId = user.hospitalId;
    }

    const receipts = await Receipt.find(query)
      .populate('hospitalId', 'name code domain address contactPhone contactEmail logo')
      .populate({
        path: 'invoiceId',
        populate: [
          { path: 'patientId' },
          { path: 'doctorId', select: 'name specialization cabinNo' },
        ],
      })
      .populate('patientId')
      .populate('cashierId', 'name email role')
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(
      receipts.map(async (rc) => {
        const rcObj = rc.toObject();
        if (rcObj.invoiceId && !rcObj.invoiceId.doctorId && rcObj.invoiceId.patientId) {
          const consult = await Consultation.findOne({ patientId: rcObj.invoiceId.patientId._id || rcObj.invoiceId.patientId })
            .populate('doctorId', 'name specialization cabinNo')
            .sort({ createdAt: -1 });
          if (consult) {
            rcObj.invoiceId.consultation = consult.toObject();
          }
        }
        return rcObj;
      })
    );

    return enriched;
  }

  /**
   * Fetch all voided/deleted bills for the hospital
   */
  static async getDeletedReceipts(user) {
    const query = { isDeleted: true };
    if (user?.role === 'SUPER_ADMIN') {
      if (user._hospitalContextApplied && user.hospitalId) {
        query.hospitalId = user.hospitalId;
      }
    } else {
      if (user?.branchId) query.branchId = user.branchId;
      else if (user?.hospitalId) query.hospitalId = user.hospitalId;
    }

    const deletedReceipts = await Receipt.find(query)
      .populate('hospitalId', 'name code domain address contactPhone contactEmail logo')
      .populate({
        path: 'invoiceId',
        populate: [
          { path: 'patientId' },
          { path: 'doctorId', select: 'name specialization cabinNo' },
        ],
      })
      .populate('patientId')
      .populate('cashierId', 'name email role')
      .populate('deletedBy', 'name email role')
      .sort({ deletedAt: -1, updatedAt: -1 });

    return deletedReceipts;
  }

  /**
   * Delete / void a receipt with audit log
   */
  static async deleteReceipt(receiptId, deletionReason, user) {
    const reason = (deletionReason && String(deletionReason).trim()) ? String(deletionReason).trim() : 'Voided by cashier / staff';

    const receipt = await Receipt.findById(receiptId)
      .populate('patientId')
      .populate('cashierId', 'name email');

    if (!receipt) {
      throw new ApiError(404, 'Receipt record not found', null, 'NOT_FOUND');
    }

    if (receipt.isDeleted) {
      return { success: true, message: 'This receipt has already been deleted.', receipt };
    }

    // Soft delete receipt
    receipt.isDeleted = true;
    receipt.deletedAt = new Date();
    receipt.deletedBy = user?.id || user?._id || null;
    receipt.deletedByName = user?.name || 'Staff';
    receipt.deletionReason = reason;
    await receipt.save();

    // Rollback invoice payment amounts
    let invoice = null;
    if (receipt.invoiceId) {
      invoice = await Invoice.findById(receipt.invoiceId);
      if (invoice) {
        invoice.paidAmount = Math.max(0, (invoice.paidAmount || 0) - receipt.amountPaid);
        invoice.balanceAmount = Math.max(0, invoice.grandTotal - invoice.paidAmount);
        if (invoice.balanceAmount > 0) {
          invoice.status = invoice.paidAmount > 0 ? PAYMENT_STATUS.PARTIALLY_PAID : PAYMENT_STATUS.UNPAID;
        }
        invoice.isDeleted = true;
        invoice.deletionReason = reason;
        invoice.deletedAt = new Date();
        invoice.deletedBy = user?.id || user?._id || null;
        await invoice.save();
      }
    }

    // Immutable Audit Log for Hospital Admin
    try {
      const { AuditLog } = await import('../../models/AuditLog.js');
      await AuditLog.create({
        hospitalId: receipt.hospitalId || user?.hospitalId,
        userId: user?.id || user?._id,
        userRole: user?.role || 'CASHIER',
        action: 'BILL_DELETED',
        module: 'BILLING',
        resourceId: String(receipt._id),
        previousState: {
          receiptNo: receipt.receiptNo,
          amountPaid: receipt.amountPaid,
          paymentMode: receipt.paymentMode,
          cashierName: receipt.cashierId?.name || 'Cashier',
          cashierEmail: receipt.cashierId?.email || '',
        },
        newState: {
          isDeleted: true,
          deletedByName: user?.name || 'Staff',
          deletedByRole: user?.role || 'CASHIER',
          deletionReason: reason,
          deletedAt: receipt.deletedAt,
        },
        details: `Receipt #${receipt.receiptNo} of ₹${receipt.amountPaid} originally billed by ${receipt.cashierId?.name || 'Cashier'} was deleted by ${user?.name || 'Staff'} (${user?.role || 'CASHIER'}). Reason: ${reason}`,
      });
    } catch (auditErr) {
      console.error('Failed to write billing deletion audit log:', auditErr);
    }

    // Real-time notification & pending status broadcast
    const branchId = receipt.branchId || user?.branchId;
    if (branchId) {
      socketManager.emitToBranch(branchId, 'billing:receipt_deleted', {
        receiptId: receipt._id,
        receiptNo: receipt.receiptNo,
        amountPaid: receipt.amountPaid,
        deletedByName: user?.name || 'Staff',
        deletionReason: reason,
      });
      socketManager.emitToBranch(branchId, 'workflow:pending_changed', { resourceId: receipt._id });
    }

    return {
      success: true,
      message: `Receipt #${receipt.receiptNo} deleted successfully`,
      receipt,
      invoice,
    };
  }

  /**
   * Cancel / delete a pending unpaid invoice with audit log
   */
  static async deleteInvoice(invoiceId, deletionReason, user) {
    const reason = (deletionReason && String(deletionReason).trim()) ? String(deletionReason).trim() : 'Cancelled by cashier / staff';

    const invoice = await Invoice.findById(invoiceId)
      .populate('patientId')
      .populate('doctorId', 'name email');

    if (!invoice) {
      throw new ApiError(404, 'Invoice record not found', null, 'NOT_FOUND');
    }

    if (invoice.isDeleted) {
      return { success: true, message: 'This invoice has already been cancelled or deleted.', invoice };
    }

    // Soft delete invoice
    invoice.isDeleted = true;
    invoice.status = PAYMENT_STATUS.CANCELLED || 'CANCELLED';
    invoice.deletedAt = new Date();
    invoice.deletedBy = user?.id || user?._id || null;
    invoice.deletedByName = user?.name || 'Staff';
    invoice.deletionReason = reason;
    await invoice.save();

    // Immutable Audit Log for Hospital Admin
    try {
      const { AuditLog } = await import('../../models/AuditLog.js');
      await AuditLog.create({
        hospitalId: invoice.hospitalId || user?.hospitalId,
        userId: user?.id || user?._id,
        userRole: user?.role || 'CASHIER',
        action: 'INVOICE_CANCELLED',
        module: 'BILLING',
        resourceId: String(invoice._id),
        previousState: {
          invoiceNo: invoice.invoiceNo,
          grandTotal: invoice.grandTotal,
          balanceAmount: invoice.balanceAmount,
          patientName: `${invoice.patientId?.firstName || ''} ${invoice.patientId?.lastName || ''}`.trim(),
        },
        newState: {
          isDeleted: true,
          status: 'CANCELLED',
          deletedByName: user?.name || 'Staff',
          deletedByRole: user?.role || 'CASHIER',
          deletionReason: reason,
          deletedAt: invoice.deletedAt,
        },
        details: `Pending Invoice #${invoice.invoiceNo} (₹${invoice.grandTotal}) for patient ${invoice.patientId?.firstName || ''} was cancelled/deleted by ${user?.name || 'Staff'} (${user?.role || 'CASHIER'}). Reason: ${reason}`,
      });
    } catch (auditErr) {
      console.error('Failed to write invoice deletion audit log:', auditErr);
    }

    // Real-time broadcast
    const branchId = invoice.branchId || user?.branchId;
    if (branchId) {
      socketManager.emitToBranch(branchId, 'billing:invoice_deleted', {
        invoiceId: invoice._id,
        invoiceNo: invoice.invoiceNo,
        deletedByName: user?.name || 'Staff',
        deletionReason: reason,
      });
      socketManager.emitToBranch(branchId, 'workflow:pending_changed', { resourceId: invoice._id });
    }

    return {
      success: true,
      message: `Invoice #${invoice.invoiceNo} cancelled successfully`,
      invoice,
    };
  }

  /**
   * Calculate cumulative accommodation stay charges across all bed/ward transfers
   */
  static async calculateInpatientStayCharges(admissionId, user) {
    const { Admission } = await import('../../models/Admission.js');
    const { BedTransfer } = await import('../../models/BedTransfer.js');

    const admission = await Admission.findById(admissionId).populate('patientId');
    if (!admission) {
      throw new ApiError(404, 'Admission record not found', null, 'NOT_FOUND');
    }

    const transfers = await BedTransfer.find({ admissionId: admission._id }).sort({ transferDate: 1 });
    const startTime = new Date(admission.admittedAt || admission.createdAt);
    const endTime = admission.dischargedAt ? new Date(admission.dischargedAt) : new Date();

    const stayItems = [];

    if (transfers.length === 0) {
      const msDiff = Math.max(1000 * 60 * 60, endTime - startTime);
      const days = Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
      const unitPrice = Number(admission.dailyTariff) || 150.0;
      stayItems.push({
        description: `Accommodation: ${admission.targetWardName || 'Ward'} (Bed ${admission.bedNumber})`,
        wardName: admission.targetWardName,
        bedNumber: admission.bedNumber,
        wardType: admission.wardType,
        qty: days,
        unitPrice,
        totalPrice: days * unitPrice,
        fromDate: startTime,
        toDate: endTime,
      });
    } else {
      let currentStart = startTime;
      for (let i = 0; i < transfers.length; i++) {
        const t = transfers[i];
        const legEnd = new Date(t.transferDate);
        const msDiff = Math.max(1000 * 60 * 60, legEnd - currentStart);
        const days = Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
        const unitPrice = Number(t.fromDailyTariff) || 150.0;

        stayItems.push({
          description: `Accommodation: ${t.fromWardName || 'Ward'} (Bed ${t.fromBedNumber})`,
          wardName: t.fromWardName,
          bedNumber: t.fromBedNumber,
          qty: days,
          unitPrice,
          totalPrice: days * unitPrice,
          fromDate: currentStart,
          toDate: legEnd,
        });

        currentStart = legEnd;
      }

      // Final leg from last transfer to endTime
      const lastTransfer = transfers[transfers.length - 1];
      const msDiff = Math.max(1000 * 60 * 60, endTime - currentStart);
      const days = Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
      const unitPrice = Number(lastTransfer.toDailyTariff) || Number(admission.dailyTariff) || 150.0;

      stayItems.push({
        description: `Accommodation: ${lastTransfer.toWardName || admission.targetWardName || 'Ward'} (Bed ${lastTransfer.toBedNumber})`,
        wardName: lastTransfer.toWardName || admission.targetWardName,
        bedNumber: lastTransfer.toBedNumber,
        qty: days,
        unitPrice,
        totalPrice: days * unitPrice,
        fromDate: currentStart,
        toDate: endTime,
      });
    }

    const totalAccommodationCost = stayItems.reduce((acc, item) => acc + item.totalPrice, 0);

    return {
      admissionId: admission._id,
      patient: admission.patientId,
      admissionReference: admission.admissionReference,
      admittedAt: startTime,
      dischargedAt: admission.dischargedAt || null,
      status: admission.status,
      stayItems,
      totalAccommodationCost,
    };
  }
}
