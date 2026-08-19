export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  HOSPITAL_ADMIN: 'HOSPITAL_ADMIN',
  DOCTOR: 'DOCTOR',
  NURSE: 'NURSE',
  NURSE_INCHARGE: 'NURSE_INCHARGE',
  RECEPTIONIST: 'RECEPTIONIST',
  PHARMACIST: 'PHARMACIST',
  LAB_TECH: 'LAB_TECH',
  RADIOLOGIST: 'RADIOLOGIST',
  CASHIER: 'CASHIER',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  HR_MANAGER: 'HR_MANAGER',
  BILLING_STAFF: 'BILLING_STAFF',
  LABORATORY_STAFF: 'LABORATORY_STAFF',
  RADIOLOGY_STAFF: 'RADIOLOGY_STAFF',
  PHARMACY_STAFF: 'PHARMACY_STAFF',
  OPD_STAFF: 'OPD_STAFF',
  IPD_STAFF: 'IPD_STAFF',
  EMERGENCY_STAFF: 'EMERGENCY_STAFF',
  DEPARTMENT_MANAGER: 'DEPARTMENT_MANAGER',
  SUPPORT_STAFF: 'SUPPORT_STAFF',
  CUSTOM_ROLE: 'CUSTOM_ROLE',
  PATIENT: 'PATIENT',
  GUARDIAN: 'GUARDIAN',
};

export const ROLE_NAMES = {
  SUPER_ADMIN: 'System Super Admin',
  HOSPITAL_ADMIN: 'Hospital Administrator',
  DOCTOR: 'Doctor',
  NURSE: 'Nurse',
  NURSE_INCHARGE: 'Nurse In-Charge',
  RECEPTIONIST: 'Receptionist',
  PHARMACIST: 'Pharmacist',
  LAB_TECH: 'Lab Technician',
  RADIOLOGIST: 'Radiologist',
  CASHIER: 'Billing Staff / Cashier',
  BILLING_STAFF: 'Billing Staff / Cashier',
  LABORATORY_STAFF: 'Laboratory Staff',
  RADIOLOGY_STAFF: 'Radiology Staff',
  PHARMACY_STAFF: 'Pharmacy Staff',
  OPD_STAFF: 'OPD Staff',
  IPD_STAFF: 'IPD Staff',
  EMERGENCY_STAFF: 'Emergency Staff',
  DEPARTMENT_MANAGER: 'Department Manager',
  SUPPORT_STAFF: 'Support Staff',
  CUSTOM_ROLE: 'Custom Role',
  INVENTORY_MANAGER: 'Inventory Manager',
  HR_MANAGER: 'HR / Payroll Manager',
  PATIENT: 'Patient Portal',
  GUARDIAN: 'Guardian Portal',
};

export const DEPARTMENTS = [
  'General Medicine',
  'Cardiology',
  'Orthopedics',
  'Pediatrics',
  'Gynecology',
  'Nursing',
  'Reception',
  'Billing',
  'Laboratory',
  'CBC',
  'Pathology',
  'Radiology',
  'X-Ray',
  'MRI',
  'CT Scan',
  'Ultrasound',
  'Pharmacy',
  'OPD',
  'IPD',
  'Emergency',
  'Custom Department',
];

export const MODULE_ACTION_MATRIX = {
  dashboard: {
    label: 'Dashboard Overview',
    actions: { view: 'View Dashboard' },
  },
  patientRegistration: {
    label: 'Patient Registration',
    actions: { view: 'View Registration Desk', create: 'Register Patient', edit: 'Edit Patient Details', delete: 'Delete Patient Record', print: 'Print Registration Form', export: 'Export Registration List' },
  },
  patients: {
    label: 'Patients Management',
    actions: { view: 'View Patients', create: 'Add Patient', edit: 'Edit Patient', delete: 'Delete Patient', print: 'Print Details', export: 'Export Records' },
  },
  tokens: {
    label: 'Tokens and Queue Management',
    actions: { view: 'View Tokens', create: 'Generate Token', edit: 'Edit Token', cancel: 'Cancel Token', assign: 'Assign Doctor', moveQueue: 'Move Queue Position', print: 'Print Token', markCompleted: 'Mark Consultation Completed' },
  },
  appointments: {
    label: 'Appointments',
    actions: { view: 'View Appointments', create: 'Create Appointment', edit: 'Edit Appointment', cancel: 'Cancel Appointment', book: 'Book Slot', doctorAvailability: 'View Doctor Availability' },
  },
  doctorConsultation: {
    label: 'Doctor Consultation',
    actions: { view: 'View Assigned Patients', startConsultation: 'Start Consultation', diagnose: 'Add Diagnosis', prescribe: 'Add Prescription', requestLab: 'Request Laboratory Test', requestRadiology: 'Request Radiology Test', addTreatment: 'Add Treatment Plan', finalize: 'Finalize Consultation', viewCompletedVisits: 'View Completed Visits' },
  },
  diagnosis: {
    label: 'Diagnosis & EMR',
    actions: { view: 'View Diagnoses', create: 'Add Diagnosis Entry', edit: 'Edit Diagnosis' },
  },
  prescription: {
    label: 'Prescription',
    actions: { view: 'View Prescriptions', create: 'Create Prescription', edit: 'Edit Prescription', dispense: 'Dispense Medicine' },
  },
  treatment: {
    label: 'Treatment & Care',
    actions: { view: 'View Treatments', create: 'Add Treatment Note', edit: 'Update Treatment' },
  },
  nursing: {
    label: 'Nursing & Ward Care',
    actions: { view: 'View Nursing Console', viewInstructions: 'View Doctor Instructions', viewTreatment: 'View Treatment Details', viewMedicineSchedule: 'View Medicine Schedule', updateVitals: 'Update Patient Vitals', addNotes: 'Add Nursing Notes', administerInjection: 'Administer Injections', manageTasks: 'Manage Nursing Tasks', handleRequests: 'Handle Patient Requests', respondEmergency: 'Respond to Emergencies', manageWardAssignments: 'Manage Ward Assignments' },
  },
  laboratory: {
    label: 'Laboratory & Pathology',
    actions: { view: 'View Laboratory Desk', accept: 'Accept Sample', edit: 'Edit Test Results', upload: 'Upload Diagnostic Report', print: 'Print Report', requestTest: 'Create Lab Request' },
  },
  radiology: {
    label: 'Radiology & Imaging',
    actions: { view: 'View Radiology Desk', accept: 'Accept Imaging Request', edit: 'Edit Scan Report', upload: 'Upload DICOM / Image', print: 'Print DICOM Report', requestTest: 'Create Imaging Request' },
  },
  pharmacy: {
    label: 'Pharmacy Store',
    actions: { view: 'View Pharmacy Desk', create: 'Add Stock Item', edit: 'Edit Batch Details', dispense: 'Dispense Prescriptions', print: 'Print Medicine Labels' },
  },
  billing: {
    label: 'Billing & Payments',
    actions: { view: 'View Finalized Bills', create: 'Create Bill', addCharges: 'Add Charges', editCharges: 'Edit Charges', removeCharges: 'Remove Charges', applyDiscount: 'Apply Discount', receivePayment: 'Accept Payment', generateInvoice: 'Generate Invoice', printReceipt: 'Print Receipt', processRefund: 'Process Refund', exportReport: 'Export Financial Report' },
  },
  opd: {
    label: 'OPD Management',
    actions: { view: 'View OPD Desk', manage: 'Manage OPD Workflows' },
  },
  ipd: {
    label: 'IPD Management',
    actions: { view: 'View IPD Ward Desk', manage: 'Manage Inpatient Allocations' },
  },
  emergency: {
    label: 'Emergency Care',
    actions: { view: 'View Emergency Console', create: 'Trigger Emergency Alert', respond: 'Respond to Code Blue / Emergency', resolve: 'Resolve Emergency' },
  },
  departments: {
    label: 'Departments Management',
    actions: { view: 'View Departments', manage: 'Manage Department Settings' },
  },

  reports: {
    label: 'Reports & Analytics',
    actions: { view: 'View Operational Reports', generate: 'Generate Analytics Report', export: 'Export Reports (PDF/CSV)' },
  },
  notifications: {
    label: 'Notifications',
    actions: { view: 'Receive & View Notifications' },
  },
  auditLogs: {
    label: 'Audit Logs',
    actions: { view: 'Inspect System Audit Logs' },
  },
  hospitalSettings: {
    label: 'Hospital Settings',
    actions: { view: 'View Settings', edit: 'Modify Tariff & Hospital Config' },
  },
};

export const ROLE_NAVIGATION = {
  SUPER_ADMIN: [
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency', category: 'Emergency Services' },
  ],
  HOSPITAL_ADMIN: [
    // Executive & System Management
    { title: 'Dashboard Overview', path: '/admin/dashboard', icon: 'LayoutDashboard', module: 'dashboard', category: 'Executive & Setup' },
    { title: 'Staff Roles & Permissions', path: '/admin/staff', icon: 'KeyRound', module: 'staffManagement', category: 'Executive & Setup' },
    { title: 'Ward & Bed Matrix', path: '/admin/bed-matrix', icon: 'BedDouble', module: 'ipd', category: 'Executive & Setup' },
    { title: 'Departments Setup', path: '/admin/departments', icon: 'GitFork', module: 'departments', category: 'Executive & Setup' },
    { title: 'Hospital Settings & Tariffs', path: '/admin/tariffs', icon: 'Settings', module: 'hospitalSettings', category: 'Executive & Setup' },

    // System Analytics & Governance
    { title: 'Reports & Analytics', path: '/admin/reports', icon: 'BarChart3', module: 'reports', category: 'System & Analytics' },
    { title: 'Audit Logs', path: '/admin/reports?tab=audit', icon: 'FileText', module: 'auditLogs', category: 'System & Analytics' },
    { title: 'Notifications & Alerts', path: '/admin/dashboard?tab=notifications', icon: 'Bell', module: 'notifications', category: 'System & Analytics' },
    { title: 'Plan Details', path: '/admin/plan-details', icon: 'BadgeCheck', module: 'dashboard', category: 'System & Analytics' },
    { title: 'Usage & Limits', path: '/admin/usage-limits', icon: 'Gauge', module: 'dashboard', category: 'System & Analytics' },
  ],
  DOCTOR: [
    { title: 'Appointments Desk', path: '/doctor/dashboard?tab=LIVE', icon: 'Calendar', module: 'appointments', category: 'Clinical Consultations' },
    { title: 'Clinical EMR Desk', path: '/doctor/dashboard', icon: 'Stethoscope', module: 'doctorConsultation', category: 'Clinical Consultations' },
    { title: 'Completed Visits', path: '/doctor/dashboard?tab=COMPLETED', icon: 'CheckCircle2', module: 'doctorConsultation', category: 'Clinical Consultations' },
    { title: 'Department Responses', path: '/doctor/dashboard?tab=DEPT_RESPONSES', icon: 'FileCheck2', module: 'doctorConsultation', category: 'Clinical Consultations' },
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency', category: 'Emergency Services' },
  ],
  NURSE: [
    { title: 'Nursing Workstation', path: '/nurse-incharge/dashboard', icon: 'Activity', module: 'nursing', category: 'Inpatient & Ward' },
    { title: 'Ward & Bed Matrix', path: '/nurse/bed-matrix', icon: 'BedDouble', module: 'nursing', category: 'Inpatient & Ward' },
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency', category: 'Emergency Services' },
  ],
  NURSE_INCHARGE: [
    { title: 'Nursing Workstation', path: '/nurse-incharge/dashboard', icon: 'Activity', module: 'nursing', category: 'Inpatient & Ward' },
    { title: 'Ward & Bed Matrix', path: '/nurse/bed-matrix', icon: 'BedDouble', module: 'nursing', category: 'Inpatient & Ward' },
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency', category: 'Emergency Services' },
  ],
  RECEPTIONIST: [
    { title: 'Reception Desk', path: '/reception/dashboard', icon: 'LayoutDashboard', module: 'appointments', category: 'Front Desk Operations' },
    { title: 'Tokens & Queue', path: '/reception/tokens', icon: 'Ticket', module: 'tokens', category: 'Front Desk Operations' },
    { title: 'Registered Patients', path: '/reception/registered-patients?tab=REGISTERED', icon: 'UserCheck', module: 'patients', category: 'Front Desk Operations' },
    { title: 'Queued / Active OPD', path: '/reception/registered-patients?tab=QUEUED', icon: 'Hourglass', module: 'opd', category: 'Front Desk Operations' },
    { title: 'All Hospital Patients', path: '/reception/registered-patients?tab=ALL', icon: 'Users', module: 'patients', category: 'Front Desk Operations' },
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency', category: 'Emergency Services' },
  ],
  PHARMACIST: [
    { title: 'Pharmacy Desk', path: '/pharmacy/dashboard', icon: 'Pill', module: 'pharmacy', category: 'Pharmacy Operations' },
    { title: 'Prescription Queue', path: '/pharmacy/dispense-queue', icon: 'Clock', module: 'pharmacy', category: 'Pharmacy Operations' },
    { title: 'FEFO Stock Manager', path: '/pharmacy/stock', icon: 'Boxes', module: 'pharmacy', category: 'Stock & Inventory' },
    { title: 'Expiry Alerts', path: '/pharmacy/expiry-alerts', icon: 'AlertTriangle', module: 'pharmacy', category: 'Stock & Inventory' },
    { title: 'Stock Audit Trail', path: '/pharmacy/audit', icon: 'FileText', module: 'pharmacy', category: 'Stock & Inventory' },
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency', category: 'Emergency Services' },
  ],
  PHARMACY_STAFF: [
    { title: 'Pharmacy Desk', path: '/pharmacy/dashboard', icon: 'Pill', module: 'pharmacy', category: 'Pharmacy Operations' },
    { title: 'Prescription Queue', path: '/pharmacy/dispense-queue', icon: 'Clock', module: 'pharmacy', category: 'Pharmacy Operations' },
    { title: 'FEFO Stock Manager', path: '/pharmacy/stock', icon: 'Boxes', module: 'pharmacy', category: 'Stock & Inventory' },
    { title: 'Expiry Alerts', path: '/pharmacy/expiry-alerts', icon: 'AlertTriangle', module: 'pharmacy', category: 'Stock & Inventory' },
    { title: 'Stock Audit Trail', path: '/pharmacy/audit', icon: 'FileText', module: 'pharmacy', category: 'Stock & Inventory' },
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency', category: 'Emergency Services' },
  ],
  LAB_TECH: [
    { title: 'Laboratory Desk', path: '/laboratory/dashboard', icon: 'TestTube', module: 'laboratory', category: 'Pathology & Lab' },
    { title: 'Sample Intake & Barcodes', path: '/laboratory/dashboard?tab=SAMPLES', icon: 'QrCode', module: 'laboratory', category: 'Pathology & Lab' },
    { title: 'Result Entry Workbench', path: '/laboratory/dashboard?tab=RESULTS', icon: 'FileSpreadsheet', module: 'laboratory', category: 'Pathology & Lab' },
    { title: 'Report Sign-Off', path: '/laboratory/dashboard?tab=REPORTS', icon: 'CheckCircle2', module: 'laboratory', category: 'Pathology & Lab' },
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency', category: 'Emergency Services' },
  ],
  LABORATORY_STAFF: [
    { title: 'Laboratory Desk', path: '/laboratory/dashboard', icon: 'TestTube', module: 'laboratory', category: 'Pathology & Lab' },
    { title: 'Sample Intake & Barcodes', path: '/laboratory/dashboard?tab=SAMPLES', icon: 'QrCode', module: 'laboratory', category: 'Pathology & Lab' },
    { title: 'Result Entry Workbench', path: '/laboratory/dashboard?tab=RESULTS', icon: 'FileSpreadsheet', module: 'laboratory', category: 'Pathology & Lab' },
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency', category: 'Emergency Services' },
  ],
  RADIOLOGIST: [
    { title: 'Radiology Desk', path: '/radiology/dashboard', icon: 'FileCheck', module: 'radiology', category: 'Radiology & Imaging' },
    { title: 'PACS DICOM Viewer', path: '/radiology/dashboard?tab=DICOM', icon: 'FileImage', module: 'radiology', category: 'Radiology & Imaging' },
    { title: 'Diagnostic Reports', path: '/radiology/dashboard?tab=REPORTS', icon: 'FileCheck2', module: 'radiology', category: 'Radiology & Imaging' },
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency', category: 'Emergency Services' },
  ],
  RADIOLOGY_STAFF: [
    { title: 'Radiology Desk', path: '/radiology/dashboard', icon: 'FileCheck', module: 'radiology', category: 'Radiology & Imaging' },
    { title: 'PACS DICOM Viewer', path: '/radiology/dashboard?tab=DICOM', icon: 'FileImage', module: 'radiology', category: 'Radiology & Imaging' },
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency', category: 'Emergency Services' },
  ],
  CASHIER: [
    { title: 'Central Billing Desk', path: '/billing/dashboard', icon: 'CreditCard', module: 'billing', category: 'Billing & Cashier' },
    { title: 'Receipts & Payment History', path: '/billing/dashboard?tab=RECEIPTS', icon: 'Receipt', module: 'billing', category: 'Billing & Cashier' },
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency', category: 'Emergency Services' },
  ],
  BILLING_STAFF: [
    { title: 'Central Billing Desk', path: '/billing/dashboard', icon: 'CreditCard', module: 'billing', category: 'Billing & Cashier' },
    { title: 'Receipts & Payment History', path: '/billing/dashboard?tab=RECEIPTS', icon: 'Receipt', module: 'billing', category: 'Billing & Cashier' },
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency', category: 'Emergency Services' },
  ],
  OPD_STAFF: [
    { title: 'OPD Queued Desk', path: '/reception/registered-patients?tab=QUEUED', icon: 'ClipboardList', module: 'opd', category: 'OPD Operations' },
    { title: 'Tokens & Queue Calling', path: '/reception/tokens', icon: 'Ticket', module: 'tokens', category: 'OPD Operations' },
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency', category: 'Emergency Services' },
  ],
  IPD_STAFF: [
    { title: 'IPD Inpatient Desk', path: '/nurse-incharge/dashboard', icon: 'BedDouble', module: 'ipd', category: 'Inpatient & Ward' },
    { title: 'Ward & Bed Matrix', path: '/nurse/bed-matrix', icon: 'BedDouble', module: 'nursing', category: 'Inpatient & Ward' },
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency' },
  ],
  EMERGENCY_STAFF: [
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency' },
  ],
  DEPARTMENT_MANAGER: [
    { title: 'Department Overview', path: '/admin/departments', icon: 'GitFork', module: 'departments' },
    { title: 'Reports & Analytics', path: '/admin/reports', icon: 'BarChart3', module: 'reports' },
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency' },
  ],
  SUPPORT_STAFF: [
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency' },
  ],
  CUSTOM_ROLE: [
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency' },
  ],
  INVENTORY_MANAGER: [
    { title: 'Inventory Dashboard', path: '/inventory/dashboard', icon: 'Package', module: 'inventory' },
    { title: 'Ward Indent Requests', path: '/inventory/indents', icon: 'Truck', module: 'inventory' },
    { title: 'Purchase Orders Console', path: '/inventory/purchase-orders', icon: 'ShoppingCart', module: 'inventory' },
    { title: 'Stock Reorder Alerts', path: '/inventory/reorder-alerts', icon: 'AlertCircle', module: 'inventory' },
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency' },
  ],
  HR_MANAGER: [
    { title: 'HR Management Desk', path: '/hr/dashboard', icon: 'UserCheck', module: 'hr' },
    { title: 'Duty Rostering Engine', path: '/hr/roster', icon: 'CalendarDays', module: 'hr' },
    { title: 'Biometric Attendance', path: '/hr/attendance', icon: 'Fingerprint', module: 'hr' },
    { title: 'Monthly Payroll', path: '/hr/payroll', icon: 'IndianRupee', module: 'hr' },
    { title: 'Emergency Console', path: '/emergency', icon: 'ShieldAlert', module: 'emergency' },
  ],
  PATIENT: [
    { title: 'Dashboard', path: '/patient-portal/dashboard', icon: 'LayoutDashboard', module: 'patientPortal' },
    { title: 'My Profile', path: '/patient-portal/profile', icon: 'User', module: 'patientPortal' },
    { title: 'My Tokens', path: '/patient-portal/tokens', icon: 'Ticket', module: 'patientPortal' },
    { title: 'Current Treatment', path: '/patient-portal/treatment', icon: 'Activity', module: 'patientPortal' },
    { title: 'Treatment History', path: '/patient-portal/history', icon: 'Clock', module: 'patientPortal' },
    { title: 'Doctor Instructions', path: '/patient-portal/doctor-instructions', icon: 'Stethoscope', module: 'patientPortal' },
    { title: 'Prescriptions', path: '/patient-portal/prescriptions', icon: 'Pill', module: 'patientPortal' },
    { title: 'Laboratory Reports', path: '/patient-portal/lab-reports', icon: 'TestTube', module: 'patientPortal' },
    { title: 'Radiology Reports', path: '/patient-portal/radiology-reports', icon: 'FileImage', module: 'patientPortal' },
    { title: 'Admission & Room Details', path: '/patient-portal/admission', icon: 'BedDouble', module: 'patientPortal' },
    { title: 'Assigned Care Team', path: '/patient-portal/care-team', icon: 'Users', module: 'patientPortal' },
    { title: 'Patient Care Requests', path: '/patient-portal/requests', icon: 'Bell', module: 'patientPortal' },
    { title: 'Billing and Payments', path: '/patient-portal/billing', icon: 'Receipt', module: 'patientPortal' },
    { title: 'Discharge Summary', path: '/patient-portal/discharge', icon: 'FileText', module: 'patientPortal' },
    { title: 'Emergency Assistance', path: '/emergency', icon: 'ShieldAlert', module: 'emergency' },
  ],
  GUARDIAN: [
    { title: 'Treatment History & Care', path: '/guardian-portal/dashboard', icon: 'Clock', module: 'guardianPortal' },
    { title: 'Emergency Assistance', path: '/emergency', icon: 'ShieldAlert', module: 'emergency' },
  ],
};
