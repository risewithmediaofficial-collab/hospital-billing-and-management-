import { Emergency } from '../../models/Emergency.js';
import { Hospital } from '../../models/Hospital.js';
import { Branch } from '../../models/Branch.js';
import { Patient } from '../../models/Patient.js';
import { WorkflowEventService, WORKFLOW_EVENTS } from '../../events/workflowEventService.js';
import { ApiError } from '../../utils/apiError.js';

export class EmergencyService {
  static async raiseEmergency(data, user) {
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

    let patientName = data.patientName || 'Unknown / Unidentified';
    let uhid = data.uhid || 'N/A';

    if (data.patientId) {
      const patient = await Patient.findById(data.patientId);
      if (patient) {
        patientName = `${patient.firstName} ${patient.lastName}`;
        uhid = patient.uhid;
      }
    }

    const newEmergency = await Emergency.create({
      hospitalId,
      branchId,
      emergencyType: data.emergencyType || 'CODE_BLUE',
      severity: data.severity || 'CRITICAL',
      raisedByDept: data.raisedByDept || user?.role || 'RECEPTIONIST',
      raisedByUserId: user?.id || user?._id,
      raisedByUserName: user?.name || 'Hospital Staff',
      patientId: data.patientId || null,
      patientName,
      uhid,
      location: data.location || 'General Ward / OPD Area',
      description: data.description || 'Immediate emergency medical response required!',
      status: 'ACTIVE',
      timeline: [
        {
          status: 'ACTIVE',
          timestamp: new Date(),
          updatedBy: user?.name || 'Hospital Staff',
          notes: `Emergency '${data.emergencyType || 'CODE_BLUE'}' raised by ${user?.name || 'Staff'} at ${data.location || 'Location'}`,
        },
      ],
    });

    // Broadcast workflow emergency event to ALL connected roles across hospital
    WorkflowEventService.emitSync(WORKFLOW_EVENTS.EMERGENCY_RAISED, {
      emergencyId: newEmergency._id,
      emergencyType: newEmergency.emergencyType,
      severity: newEmergency.severity,
      location: newEmergency.location,
      patientName: newEmergency.patientName,
      uhid: newEmergency.uhid,
      raisedBy: newEmergency.raisedByUserName,
      raisedByDept: newEmergency.raisedByDept,
      description: newEmergency.description,
      createdAt: newEmergency.createdAt,
    }, branchId);

    return newEmergency;
  }

  static async resolveEmergency(id, data, user) {
    const emergency = await Emergency.findById(id);
    if (!emergency) {
      throw new ApiError(404, 'Emergency record not found', null, 'NOT_FOUND');
    }

    emergency.status = 'RESOLVED';
    emergency.resolvedAt = new Date();
    emergency.resolvedByUserId = user?.id || user?._id;
    emergency.resolvedByUserName = user?.name || 'Emergency Responder';
    emergency.resolutionNotes = data.resolutionNotes || 'Emergency condition resolved and stabilized.';

    emergency.timeline.push({
      status: 'RESOLVED',
      timestamp: new Date(),
      updatedBy: user?.name || 'Emergency Responder',
      notes: data.resolutionNotes || 'Emergency stabilized and marked as resolved.',
    });

    await emergency.save();

    // Broadcast resolution event to ALL connected roles
    WorkflowEventService.emitSync(WORKFLOW_EVENTS.EMERGENCY_RESOLVED, {
      emergencyId: emergency._id,
      emergencyType: emergency.emergencyType,
      location: emergency.location,
      resolvedBy: emergency.resolvedByUserName,
      resolutionNotes: emergency.resolutionNotes,
      resolvedAt: emergency.resolvedAt,
    }, emergency.branchId);

    return emergency;
  }

  static async getActiveEmergencies(user) {
    let hospitalId = user?.hospitalId;
    if (!hospitalId) {
      const defaultHosp = await Hospital.findOne({});
      hospitalId = defaultHosp?._id;
    }

    const filter = { status: 'ACTIVE' };
    if (hospitalId) filter.hospitalId = hospitalId;

    return await Emergency.find(filter).sort({ createdAt: -1 });
  }

  static async getEmergencyHistory(user) {
    let hospitalId = user?.hospitalId;
    if (!hospitalId) {
      const defaultHosp = await Hospital.findOne({});
      hospitalId = defaultHosp?._id;
    }

    const filter = {};
    if (hospitalId) filter.hospitalId = hospitalId;

    return await Emergency.find(filter).sort({ createdAt: -1 }).limit(100);
  }
}
