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
    })
      .populate('patientId')
      .populate('doctorId', 'name specialization cabinNo')
      .sort({ createdAt: -1 });

    // Attach consultation data to each invoice
    const enriched = await Promise.all(
      invoices.map(async (inv) => {
        const filter = { patientId: inv.patientId?._id || inv.patientId };
        if (inv.doctorId) {
          filter.doctorId = inv.doctorId._id || inv.doctorId;
        }

        let consultation = await Consultation.findOne(filter)
          .populate('doctorId', 'name specialization cabinNo')
          .sort({ createdAt: -1 })
          .lean();

        if (!consultation && inv.patientId) {
          consultation = await Consultation.findOne({ patientId: inv.patientId._id || inv.patientId })
            .populate('doctorId', 'name specialization cabinNo')
            .sort({ createdAt: -1 })
            .lean();
        }

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

    // Collision-proof receipt number generation
    const rcYear = new Date().getFullYear();
    let rcSeq = await Receipt.countDocuments({ hospitalId: user.hospitalId }) + 1;
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
      paymentMode: data.paymentMode || 'CARD',
      transactionRef: data.transactionRef || 'TXN-ONLINE',
      remarks: data.remarks || 'Payment collected at counter',
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
      WorkflowEventService.emit(WORKFLOW_EVENTS.PAYMENT_COLLECTED, paymentPayload, invoice.branchId);
      socketManager.emitToBranch(invoice.branchId, 'billing:payment_collected', paymentPayload);
    }

    return {
      receipt,
      invoice,
    };
  }

  static async getInvoices(user) {
    return await Invoice.find({ branchId: user.branchId }).populate('patientId').sort({ createdAt: -1 });
  }

  static async getReceipts(user) {
    const receipts = await Receipt.find({ branchId: user.branchId })
      .populate({
        path: 'invoiceId',
        populate: [
          { path: 'patientId' },
          { path: 'doctorId', select: 'name specialization' },
        ],
      })
      .populate('patientId')
      .populate('cashierId')
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(
      receipts.map(async (rc) => {
        const rcObj = rc.toObject();
        if (rcObj.invoiceId && !rcObj.invoiceId.doctorId && rcObj.invoiceId.patientId) {
          const consult = await Consultation.findOne({ patientId: rcObj.invoiceId.patientId._id || rcObj.invoiceId.patientId })
            .populate('doctorId', 'name specialization')
            .sort({ createdAt: -1 })
            .lean();
          if (consult) {
            rcObj.invoiceId.consultation = consult;
          }
        }
        return rcObj;
      })
    );

    return enriched;
  }
}
