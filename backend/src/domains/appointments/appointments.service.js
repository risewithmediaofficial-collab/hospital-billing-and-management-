import { Appointment } from '../../models/Appointment.js';
import { Patient } from '../../models/Patient.js';
import { User } from '../../models/User.js';
import { Hospital } from '../../models/Hospital.js';
import { Branch } from '../../models/Branch.js';
import { socketManager } from '../../events/socketManager.js';
import { WorkflowEventService, WORKFLOW_EVENTS } from '../../events/workflowEventService.js';
import { ApiError } from '../../utils/apiError.js';

export const FIFO_QUEUE_SORT = { appointmentDate: 1, tokenNumber: 1, createdAt: 1, _id: 1 };

export class AppointmentsService {
  static async issueToken(data, user) {
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

    // Bulletproof Doctor Resolution & Availability Check
    let doctor = null;
    if (user?.role === 'DOCTOR') {
      doctor = await User.findById(user.id || user._id);
    }
    if (!doctor && data.doctorId) {
      doctor = await User.findById(data.doctorId);
      if (doctor && doctor.isAvailable === false) {
        throw new ApiError(400, 'This doctor is currently unavailable. Please select another available doctor.', null, 'DOCTOR_UNAVAILABLE');
      }
    }
    if (!doctor && hospitalId) {
      doctor = await User.findOne({ hospitalId, role: 'DOCTOR', isAvailable: { $ne: false } });
    }
    if (!doctor) {
      doctor = await User.findOne({ role: 'DOCTOR', isAvailable: { $ne: false } });
    }
    if (!doctor) {
      doctor = await User.findOne({ hospitalId, isAvailable: { $ne: false } });
    }
    if (!doctor) {
      doctor = await User.findOne({ isAvailable: { $ne: false } });
    }

    if (!doctor) {
      throw new ApiError(400, 'No active/available doctor exists in system to assign token. Please select an available doctor.', null, 'NO_DOCTOR_AVAILABLE');
    }

    // Find Patient or create walk-in patient
    let patient = null;
    if (data.patientId) {
      patient = await Patient.findById(data.patientId);
    } else if (data.uhid) {
      patient = await Patient.findOne({ uhid: data.uhid.toUpperCase() });
    }

    if (!patient) {
      const count = await Patient.countDocuments({ hospitalId });
      const seq = String(count + 1).padStart(5, '0');
      const year = new Date().getFullYear();
      const uhid = `HOSP-${year}-${seq}`;

      patient = await Patient.create({
        hospitalId,
        branchId,
        uhid,
        firstName: data.patientName || 'Walk-in Patient',
        lastName: `(${uhid})`,
        gender: 'MALE',
        dob: new Date('1995-01-01'),
        phone: data.phone || '+1 (555) 000-0000',
        address: 'Walk-in Registration Counter',
        city: 'Main City',
        emergencyContact: {
          name: data.patientName || 'Self / Walk-in',
          phone: data.phone || '+1 (555) 000-0000',
          relation: 'Self',
        },
      });
    }

    // Calculate today's token number
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTokens = await Appointment.countDocuments({
      hospitalId,
      appointmentDate: todayStr,
    });

    const tokenNumber = todayTokens + 1;
    const appointmentNo = `APT-${todayStr.replace(/-/g, '')}-${tokenNumber}`;

    const appointment = await Appointment.create({
      hospitalId: hospitalId || doctor.hospitalId,
      branchId: branchId || doctor.branchId,
      patientId: patient._id,
      doctorId: doctor._id,
      departmentId: doctor.departmentId || branchId || doctor.branchId,
      appointmentNo,
      tokenNumber,
      appointmentDate: todayStr,
      status: 'WAITING', // Strictly WAITING until doctor consults
      chiefComplaints: data.chiefComplaints || 'OPD Check-up',
      cabinNo: doctor.cabinNo || 'Cabin 102',
    });

    // Notify connected Doctor Workstations & Queue TV displays
    const queuePayload = {
      doctorId: doctor._id,
      doctorName: doctor.name,
      tokenNumber,
      patientName: `${patient.firstName} ${patient.lastName}`,
      uhid: patient.uhid,
      linkedPath: '/doctor/dashboard?tab=LIVE',
      timestamp: new Date(),
    };

    const targetBranch = String(branchId || doctor.branchId || '');
    if (targetBranch) {
      socketManager.emitToBranch(targetBranch, 'opd_queue:updated', queuePayload);
      socketManager.emitToBranch(targetBranch, 'queue:patient_added', queuePayload);
      socketManager.emitToBranch(targetBranch, 'token:generated', queuePayload);
    }
    if (socketManager.io) {
      socketManager.io.emit('opd_queue:updated', queuePayload);
      socketManager.io.emit('queue:patient_added', queuePayload);
      socketManager.io.emit('token:generated', queuePayload);
    }

    WorkflowEventService.emitSync(WORKFLOW_EVENTS.PATIENT_QUEUED, {
      patientName: `${patient.firstName} ${patient.lastName}`,
      uhid: patient.uhid,
      tokenNumber,
      doctorId: doctor._id,
      doctorName: doctor.name,
      linkedPath: '/doctor/dashboard?tab=LIVE',
    }, branchId || doctor.branchId);

    return await Appointment.findById(appointment._id).populate('patientId').populate('doctorId');
  }

  static async getOpdQueue(user, doctorId = null) {
    let hospitalId = user?.hospitalId;
    if (!hospitalId && user) {
      const defaultHosp = await Hospital.findOne({});
      hospitalId = defaultHosp?._id;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const targetDocId = doctorId || user?.id || user?._id;

    let filter = {};

    if (user?.role === 'DOCTOR') {
      filter = {
        $or: [
          { doctorId: targetDocId },
          ...(hospitalId ? [{ hospitalId }] : [])
        ],
        status: { $nin: ['CANCELLED'] }
      };
    } else if (targetDocId) {
      filter = { doctorId: targetDocId };
    } else if (hospitalId) {
      filter = { hospitalId };
    } else {
      filter = { appointmentDate: todayStr };
    }

    return await Appointment.find(filter)
      .populate('patientId')
      .populate('doctorId')
      .sort(FIFO_QUEUE_SORT);
  }

  static async updateTokenStatus(appointmentId, status, user) {
    const appointment = await Appointment.findById(appointmentId).populate('patientId').populate('doctorId');
    if (!appointment) {
      throw new ApiError(404, 'OPD token appointment not found', null, 'NOT_FOUND');
    }

    appointment.status = status;
    await appointment.save();

    socketManager.emitToBranch(appointment.branchId, 'opd_queue:status_changed', {
      appointmentId,
      status,
      tokenNumber: appointment.tokenNumber,
    });

    const pName = appointment.patientId ? `${appointment.patientId.firstName || ''} ${appointment.patientId.lastName || ''}`.trim() : 'Patient';
    const uhid = appointment.patientId?.uhid || 'N/A';
    const docName = appointment.doctorId?.name || user?.name || 'Doctor';

    if (status === 'IN_CONSULTATION') {
      WorkflowEventService.emitSync(WORKFLOW_EVENTS.DOCTOR_ACCEPTED_PATIENT, {
        patientName: pName,
        uhid,
        doctorName: docName,
        linkedPath: '/reception/registered-patients?tab=QUEUED',
      }, appointment.branchId);
    } else if (status === 'COMPLETED') {
      WorkflowEventService.emitSync(WORKFLOW_EVENTS.CONSULTATION_COMPLETE, {
        patientName: pName,
        uhid,
        doctorName: docName,
        linkedPath: '/billing/dashboard',
      }, appointment.branchId);
    }

    return appointment;
  }
}
