/** Strictly platform-management navigation for the system owner. */
export const SUPER_ADMIN_NAVIGATION = [
  { title: 'Dashboard', path: '/admin/dashboard', icon: 'LayoutDashboard' },
  // Dedicated Pending Approvals queue — shown separately with amber badge
  { title: 'Pending Approvals', path: '/admin/pending-approvals', icon: 'ClipboardList', badgeKey: 'PENDING_HOSPITALS', highlight: 'amber' },
  { title: 'All Hospitals', path: '/admin/hospitals', icon: 'Building2' },
  { title: 'Active Hospitals', path: '/admin/hospitals?tab=ACTIVE', icon: 'CheckCircle2' },
  { title: 'Expired Hospitals', path: '/admin/hospitals?tab=EXPIRED', icon: 'Clock' },
  { title: 'Deleted Hospitals', path: '/admin/hospitals?tab=DELETED', icon: 'Trash2' },
  { title: 'Hospital Administrators', path: '/admin/hospital-admins', icon: 'ShieldCheck' },
  { title: 'Reports', path: '/admin/reports', icon: 'BarChart3' },
  { title: 'Notifications', path: '/admin/notifications', icon: 'Bell' },
  { title: 'Audit Logs', path: '/admin/audit-logs', icon: 'FileText' },
  { title: 'Subscription Management', path: '/admin/subscriptions', icon: 'CreditCard' },
  { title: 'System Settings', path: '/admin/settings', icon: 'Settings' },
];

/** A hospital drill-down is an overview only; it never opens staff workstations. */
export const HOSPITAL_DRILLDOWN_NAVIGATION = (hospitalId) => [
  { title: 'Hospital Overview', path: `/admin/hospital/${hospitalId}/dashboard`, icon: 'Building2' },
  { title: 'Reports', path: `/admin/hospital/${hospitalId}/reports`, icon: 'BarChart3' },
  { title: 'Audit History', path: `/admin/hospital/${hospitalId}/audit-logs`, icon: 'FileText' },
];

export const STAT_CARD_ROUTES = {
  totalHospitals: '/admin/hospitals', activeHospitals: '/admin/hospitals?status=APPROVED',
  inactiveHospitals: '/admin/hospitals?status=inactive', hospitalAdmins: '/admin/hospital-admins',
  totalStaff: '/admin/reports?metric=staff', doctors: '/admin/reports?metric=doctors',
  receptionists: '/admin/reports?metric=reception', nurses: '/admin/reports?metric=nursing',
  labStaff: '/admin/reports?metric=laboratory', radiologyStaff: '/admin/reports?metric=radiology',
  pharmacyStaff: '/admin/reports?metric=pharmacy', billingStaff: '/admin/reports?metric=billing',
  totalPatients: '/admin/reports?metric=patients', opdPatients: '/admin/reports?metric=opd',
  ipdPatients: '/admin/reports?metric=ipd', recentHospitalRegistrations: '/admin/hospitals',
  recentActivities: '/admin/audit-logs',
};
