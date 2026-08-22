export const ROLE_PERMISSION_DEFAULTS = {
  HOSPITAL_ADMIN: {
    dashboard: ['view', 'manage'],
    departments: ['view', 'manage'],
    staffManagement: ['view', 'create', 'edit', 'delete', 'managePermissions'],
    reports: ['view', 'generate', 'export'],
    notifications: ['view'],
    auditLogs: ['view'],
    hospitalSettings: ['view', 'edit'],
    plan: ['view'],
    settings: ['view', 'edit'],
    usage: ['view'],
    admin: ['view', 'manage'],
  },
  SUPER_ADMIN: { '*': ['*'] },
  DOCTOR: {
    dashboard: ['view'],
    doctorConsultation: ['view', 'create', 'edit', 'startConsultation', 'diagnose', 'prescribe', 'requestLab', 'requestRadiology', 'addTreatment', 'finalize', 'viewCompletedVisits', '*'],
    doctor: ['view', 'create', 'edit', 'consult', 'diagnose', 'prescribe', 'finalize', '*'],
    emr: ['view', 'create', 'edit', '*'],
    diagnostics: ['view', 'create', 'edit', 'requestTest', '*'],
    patients: ['view', 'create', 'edit'],
    tokens: ['view', 'create', 'edit'],
    diagnosis: ['view', 'create', 'edit'],
    prescription: ['view', 'create', 'edit'],
    treatment: ['view', 'create', 'edit'],
    laboratory: ['view', 'requestTest', 'create', 'edit', '*'],
    radiology: ['view', 'requestTest', 'create', 'edit', '*'],
    ipd: ['view', 'create', 'edit'],
    billing: ['view', 'create', 'edit', 'printReceipt'],
    notifications: ['view'],
  },
  NURSE: {
    dashboard: ['view'],
    nursing: ['view', 'create', 'edit', 'viewInstructions', 'viewTreatment', 'viewMedicineSchedule', 'updateVitals', 'addNotes', 'administerInjection', 'manageTasks', 'handleRequests', 'respondEmergency', '*'],
    patients: ['view', 'create', 'edit'],
    requests: ['view', 'create', 'edit', 'handleRequests'],
    emergency: ['view', 'create', 'respond'],
    notifications: ['view'],
  },
  NURSE_INCHARGE: {
    dashboard: ['view'],
    nursing: ['view', 'create', 'edit', 'viewInstructions', 'viewTreatment', 'viewMedicineSchedule', 'updateVitals', 'addNotes', 'administerInjection', 'manageTasks', 'handleRequests', 'respondEmergency', 'manageWardAssignments', '*'],
    ipd: ['view', 'create', 'manage', 'edit'],
    beds: ['view', 'create', 'edit', 'manage'],
    requests: ['view', 'create', 'edit'],
    emergency: ['view', 'create', 'respond'],
    notifications: ['view'],
  },
  RECEPTIONIST: {
    dashboard: ['view'],
    patientRegistration: ['view', 'create', 'edit'],
    patients: ['view', 'create', 'edit'],
    tokens: ['view', 'create', 'edit', 'cancel', 'assign', 'moveQueue', 'print', 'markCompleted'],
    appointments: ['view', 'create', 'edit', 'cancel', 'book', 'doctorAvailability'],
    reception: ['view'],
    emergency: ['view', 'create'],
    notifications: ['view'],
  },
  CASHIER: {
    dashboard: ['view'],
    billing: ['view', 'create', 'addCharges', 'editCharges', 'receivePayment', 'generateInvoice', 'printReceipt', 'edit', '*'],
    emergency: ['view', 'create'],
    notifications: ['view'],
  },
  BILLING_STAFF: {
    dashboard: ['view'],
    billing: ['view', 'create', 'addCharges', 'editCharges', 'receivePayment', 'generateInvoice', 'printReceipt', 'edit', '*'],
    emergency: ['view', 'create'],
    notifications: ['view'],
  },
  LAB_TECH: {
    dashboard: ['view'],
    laboratory: ['view', 'create', 'accept', 'edit', 'upload', 'print', '*'],
    diagnostics: ['view', 'create', 'edit', '*'],
    emergency: ['view', 'create'],
    notifications: ['view'],
  },
  LABORATORY_STAFF: {
    dashboard: ['view'],
    laboratory: ['view', 'create', 'accept', 'edit', 'upload', 'print', '*'],
    diagnostics: ['view', 'create', 'edit', '*'],
    emergency: ['view', 'create'],
    notifications: ['view'],
  },
  RADIOLOGIST: {
    dashboard: ['view'],
    radiology: ['view', 'create', 'accept', 'edit', 'upload', 'print', '*'],
    diagnostics: ['view', 'create', 'edit', '*'],
    emergency: ['view', 'create'],
    notifications: ['view'],
  },
  RADIOLOGY_STAFF: {
    dashboard: ['view'],
    radiology: ['view', 'create', 'accept', 'edit', 'upload', 'print', '*'],
    diagnostics: ['view', 'create', 'edit', '*'],
    emergency: ['view', 'create'],
    notifications: ['view'],
  },
  PHARMACIST: {
    dashboard: ['view'],
    pharmacy: ['view', 'create', 'edit', 'dispense', 'adjust', 'transfer', 'print', 'delete', '*'],
    billing: ['view'],
    emergency: ['view', 'create'],
    notifications: ['view'],
  },
  PHARMACY_STAFF: {
    dashboard: ['view'],
    pharmacy: ['view', 'create', 'edit', 'dispense', 'adjust', 'transfer', 'print', 'delete', '*'],
    billing: ['view'],
    emergency: ['view', 'create'],
    notifications: ['view'],
  },
  OPD_STAFF: {
    dashboard: ['view'],
    opd: ['view', 'manage'],
    tokens: ['view', 'create', 'edit'],
    notifications: ['view'],
  },
  IPD_STAFF: {
    dashboard: ['view'],
    ipd: ['view', 'manage'],
    nursing: ['view', 'updateVitals'],
    notifications: ['view'],
  },
  EMERGENCY_STAFF: {
    dashboard: ['view'],
    emergency: ['view', 'create', 'respond', 'resolve'],
    notifications: ['view'],
  },
  DEPARTMENT_MANAGER: {
    dashboard: ['view'],
    departments: ['view', 'manage', '*'],
    reports: ['view', 'generate', '*'],
    billing: ['view', 'create', 'edit'],
    audit: ['view', '*'],
    admin: ['view', '*'],
    notifications: ['view'],
  },
  SUPPORT_STAFF: {
    dashboard: ['view'],
    notifications: ['view'],
  },
  CUSTOM_ROLE: {
    dashboard: ['view'],
  },
  INVENTORY_MANAGER: {
    dashboard: ['view'],
    inventory: ['view', 'create', 'edit'],
    notifications: ['view'],
  },
  HR_MANAGER: {
    dashboard: ['view'],
    hr: ['view', 'create', 'edit'],
    notifications: ['view'],
  },
  PATIENT: { dashboard: ['view'], patientPortal: ['view', 'create', 'edit'], requests: ['view', 'create', 'edit'] },
  GUARDIAN: { dashboard: ['view'], guardianPortal: ['view', 'create', 'edit'] },
};

const OPERATIONAL_MODULE_ROLES = {
  patients: ['RECEPTIONIST', 'OPD_STAFF', 'DOCTOR', 'NURSE', 'NURSE_INCHARGE'],
  appointments: ['RECEPTIONIST', 'OPD_STAFF', 'DOCTOR'],
  doctor: ['DOCTOR'],
  beds: ['NURSE', 'NURSE_INCHARGE', 'IPD_STAFF'],
  requests: ['NURSE', 'NURSE_INCHARGE', 'IPD_STAFF'],
  billing: ['CASHIER', 'BILLING_STAFF'],
  diagnostics: ['DOCTOR', 'LAB_TECH', 'LABORATORY_STAFF', 'RADIOLOGIST', 'RADIOLOGY_STAFF'],
  ipd: ['DOCTOR', 'NURSE', 'NURSE_INCHARGE', 'IPD_STAFF'],
  emergency: ['DOCTOR', 'NURSE', 'NURSE_INCHARGE', 'IPD_STAFF', 'RECEPTIONIST', 'OPD_STAFF', 'EMERGENCY_STAFF'],
  pharmacy: ['PHARMACIST', 'PHARMACY_STAFF'],
};

export const hasOperationalRoleForModule = (user, module) => {
  const assignedRoles = user?.role === 'HOSPITAL_ADMIN'
    ? (Array.isArray(user.additionalRoles) ? user.additionalRoles : [])
    : [user?.role, ...(Array.isArray(user?.additionalRoles) ? user.additionalRoles : [])];
  return (OPERATIONAL_MODULE_ROLES[module] || []).some((role) => assignedRoles.includes(role));
};

const normalizeActions = (actionsInput) => {
  if (!actionsInput) return [];
  if (Array.isArray(actionsInput)) {
    return actionsInput.filter(Boolean);
  }
  if (typeof actionsInput === 'object') {
    return Object.entries(actionsInput)
      .filter(([, val]) => Boolean(val))
      .map(([key]) => key);
  }
  if (actionsInput === true || actionsInput === '*') {
    return ['*'];
  }
  return [];
};

export const permissionsFor = (user, hospitalModules = null) => {
  const roles = [
    user?.role,
    ...(Array.isArray(user?.additionalRoles) ? user.additionalRoles : []),
  ].filter(Boolean);

  const combinedDefaults = {};
  for (const roleCode of roles) {
    const roleDefaults = ROLE_PERMISSION_DEFAULTS[roleCode] || {};
    for (const [module, actions] of Object.entries(roleDefaults)) {
      if (!combinedDefaults[module]) {
        combinedDefaults[module] = new Set();
      }
      normalizeActions(actions).forEach((a) => combinedDefaults[module].add(a));
    }
  }

  const custom = user?.permissions || {};
  const hasCustomPermissions = Object.keys(custom).length > 0;
  const customGranted = {};
  for (const [module, actions] of Object.entries(custom)) {
    customGranted[module] = new Set(normalizeActions(actions));
  }

  const revoked = user?.revokedPermissions || {};
  const revokedSet = {};
  for (const [module, actions] of Object.entries(revoked)) {
    revokedSet[module] = new Set(normalizeActions(actions));
  }

  const allModules = new Set([
    ...Object.keys(combinedDefaults),
    ...Object.keys(customGranted),
  ]);

  const finalPermissions = {};
  for (const module of allModules) {
    if (hospitalModules && hospitalModules[module] === false && !roles.includes('SUPER_ADMIN')) {
      continue;
    }

    const baseActions = combinedDefaults[module] ? Array.from(combinedDefaults[module]) : [];
    const grantedActions = customGranted[module] ? Array.from(customGranted[module]) : [];
    const removedActions = revokedSet[module] ? Array.from(revokedSet[module]) : [];

    const merged = Array.from(new Set([...baseActions, ...grantedActions]));
    
    let finalActions = [];
    if (removedActions.includes('*')) {
      finalActions = [];
    } else {
      finalActions = merged.filter((act) => !removedActions.includes(act));
    }

    if (finalActions.length > 0) {
      finalPermissions[module] = finalActions;
    }
  }

  if (roles.includes('SUPER_ADMIN')) {
    finalPermissions['*'] = ['*'];
  }

  return finalPermissions;
};

export const hasPermission = (user, module, action = 'view', hospitalModules = null) => {
  if (user?.role === 'SUPER_ADMIN') return true;

  const role = user?.role;
  const userRoles = [role, ...(Array.isArray(user?.additionalRoles) ? user.additionalRoles : [])].filter(Boolean);

  // Role domain overrides — domain staff always have full access to their primary and cross-department workflow modules
  if (['doctor', 'emr', 'doctorConsultation', 'appointments', 'diagnostics', 'pharmacy', 'laboratory', 'radiology', 'billing', 'ipd'].includes(module) && userRoles.includes('DOCTOR')) return true;
  if (['nursing', 'ipd', 'beds', 'requests', 'pharmacy', 'emergency', 'billing'].includes(module) && userRoles.some((r) => ['NURSE', 'NURSE_INCHARGE'].includes(r))) return true;
  if (['pharmacy', 'inventory', 'billing', 'emergency'].includes(module) && userRoles.some((r) => ['PHARMACIST', 'PHARMACY_STAFF'].includes(r))) return true;
  if (['laboratory', 'diagnostics', 'emergency', 'billing'].includes(module) && userRoles.some((r) => ['LAB_TECH', 'LABORATORY_STAFF'].includes(r))) return true;
  if (['radiology', 'diagnostics', 'emergency', 'billing'].includes(module) && userRoles.some((r) => ['RADIOLOGIST', 'RADIOLOGY_STAFF'].includes(r))) return true;
  if (['billing', 'cashier', 'reception', 'emergency'].includes(module) && userRoles.some((r) => ['CASHIER', 'BILLING_STAFF'].includes(r))) return true;
  if (['reception', 'patientRegistration', 'tokens', 'appointments', 'patients', 'billing', 'emergency'].includes(module) && userRoles.some((r) => ['RECEPTIONIST', 'OPD_STAFF'].includes(r))) return true;
  if (['departments', 'reports', 'billing', 'dashboard', 'admin', 'audit', 'plan', 'settings', 'usage'].includes(module) && userRoles.includes('DEPARTMENT_MANAGER')) return true;
  if (module === 'emergency' && userRoles.some((r) => ['EMERGENCY_STAFF', 'NURSE', 'NURSE_INCHARGE', 'DOCTOR'].includes(r))) return true;

  const permissions = permissionsFor(user, hospitalModules);
  
  if (permissions['*']?.includes('*') || permissions['*']?.includes(action)) return true;

  const aliases = {
    doctor: ['doctor', 'doctorConsultation', 'emr'],
    doctorConsultation: ['doctor', 'doctorConsultation', 'emr'],
    patients: ['patients', 'patientRegistration'],
    patientRegistration: ['patients', 'patientRegistration'],
    ipd: ['ipd', 'admissions', 'beds'],
    beds: ['beds', 'ipd'],
    appointments: ['appointments', 'tokens', 'reception', 'doctorConsultation', 'dashboard'],
    tokens: ['tokens', 'appointments', 'reception', 'doctorConsultation'],
    diagnostics: ['diagnostics', 'laboratory', 'radiology', 'doctorConsultation'],
    emergency: ['emergency', 'nursing', 'doctorConsultation'],
    billing: ['billing', 'reception', 'cashier'],
  }[module] || [module];

  for (const mod of aliases) {
    const values = permissions[mod] || [];
    if (Array.isArray(values)) {
      if (values.includes('*') || values.includes(action)) {
        return true;
      }
      // API routes use HTTP verbs for their coarse authorization check. A POST
      // is therefore checked as `create`, even when the permission matrix uses
      // the more precise workflow action names below.
      if (action === 'create' && (
        values.includes('consult') ||
        values.includes('finalize') ||
        values.includes('startConsultation') ||
        values.includes('diagnose') ||
        values.includes('prescribe') ||
        values.includes('requestTest') ||
        values.includes('requestLab') ||
        values.includes('requestRadiology') ||
        values.includes('create')
      )) {
        return true;
      }
      if (action === 'edit' && (values.includes('consult') || values.includes('finalize') || values.includes('diagnose') || values.includes('edit'))) {
        return true;
      }
    }
  }

  return false;
};
