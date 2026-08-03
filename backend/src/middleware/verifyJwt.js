import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { sendError } from '../utils/apiResponse.js';
import { Branch } from '../models/Branch.js';
import { User } from '../models/User.js';
import { hasPermission } from '../config/permissions.js';

const moduleForRequest = (url) => {
  const routes = [['/patients', 'patients'], ['/appointments', 'appointments'], ['/emr', 'doctor'], ['/beds', 'beds'], ['/requests', 'requests'], ['/billing', 'billing'], ['/diagnostics', 'diagnostics'], ['/admissions', 'ipd'], ['/emergency', 'emergency']];
  return routes.find(([prefix]) => url.startsWith(`/api/v1${prefix}`))?.[1];
};

const applyContextIfNeeded = async (req) => {
  if (req.user?.role !== 'SUPER_ADMIN') return;

  const contextHospitalId = req.headers['x-hospital-context'];
  if (!contextHospitalId) return;

  req.user.hospitalId = contextHospitalId;
  req.user._hospitalContextApplied = true;

  const branch =
    (await Branch.findOne({ hospitalId: contextHospitalId, isMainBranch: true })) ||
    (await Branch.findOne({ hospitalId: contextHospitalId }));
  if (branch) {
    req.user.branchId = branch._id.toString();
  }
};

const extractId = (val) => {
  if (!val) return '';
  if (typeof val === 'object') {
    return val._id ? String(val._id) : (val.id ? String(val.id) : String(val));
  }
  return String(val);
};

export const verifyJwt = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return sendError(res, 401, 'Authentication token missing', null, 'UNAUTHORIZED');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    // The platform owner is intentionally not a hospital operator.  Platform
    // administration is exposed through /saas only; operational APIs remain
    // inaccessible even if a Super Admin crafts a direct request.
    if (
      decoded.role === 'SUPER_ADMIN' &&
      !req.originalUrl.startsWith('/api/v1/saas') &&
      !req.originalUrl.startsWith('/api/v1/workflow') &&
      !req.originalUrl.startsWith('/api/v1/auth')
    ) {
      return sendError(res, 403, 'Super Admin accounts have read-only platform access and cannot use hospital operational APIs.', null, 'OPERATIONAL_ACCESS_FORBIDDEN');
    }
    const module = moduleForRequest(req.originalUrl);
    // PATIENT and GUARDIAN roles always pass permission check for their own portal routes
    const isPortalRole = decoded.role === 'PATIENT' || decoded.role === 'GUARDIAN';
    if (module && decoded.role !== 'SUPER_ADMIN' && !isPortalRole) {
      const currentUser = await User.findById(decoded.id).select('hospitalId role additionalRoles isActive status permissions revokedPermissions departmentId additionalDepartments');
      if (!currentUser || !currentUser.isActive || currentUser.status === 'INACTIVE') return sendError(res, 403, 'Your account is inactive.', null, 'ACCOUNT_INACTIVE');
      if (currentUser.hospitalId && decoded.hospitalId && extractId(currentUser.hospitalId) !== extractId(decoded.hospitalId)) {
        return sendError(res, 403, 'Hospital context is invalid.', null, 'HOSPITAL_CONTEXT_INVALID');
      }
      const action = req.method === 'GET' ? 'view' : req.method === 'POST' ? 'create' : req.method === 'DELETE' ? 'delete' : 'edit';
      if (!hasPermission(currentUser, module, action)) {
        return sendError(res, 403, 'You do not have permission to perform this action.', null, 'FORBIDDEN');
      }
      req.user.additionalRoles = currentUser.additionalRoles || [];
      req.user.additionalDepartments = currentUser.additionalDepartments || [];
      req.user.permissions = currentUser.permissions || {};
      req.user.departmentId = currentUser.departmentId;
    }
    await applyContextIfNeeded(req);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Token expired', null, 'TOKEN_EXPIRED');
    }
    return sendError(res, 401, 'Invalid authentication token', null, 'INVALID_TOKEN');
  }
};
