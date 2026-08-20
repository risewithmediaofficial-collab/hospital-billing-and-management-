import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { sendError } from '../utils/apiResponse.js';
import { Branch } from '../models/Branch.js';
import { Hospital } from '../models/Hospital.js';
import { User } from '../models/User.js';
import { hasPermission } from '../config/permissions.js';

const moduleForRequest = (url) => {
  const routes = [
    ['/patients', 'patients'],
    ['/appointments', 'appointments'],
    ['/emr', 'doctor'],
    ['/beds', 'beds'],
    ['/requests', 'requests'],
    ['/billing', 'billing'],
    ['/diagnostics', 'diagnostics'],
    ['/admissions', 'ipd'],
    ['/emergency', 'emergency'],
    ['/pharmacy', 'pharmacy'],
    ['/inventory', 'pharmacy'],
  ];
  return routes.find(([prefix]) => url.startsWith(`/api/v1${prefix}`))?.[1];
};

const applyContextIfNeeded = async (req) => {
  if (req.user?.role !== 'SUPER_ADMIN') return;

  const contextHospitalId = req.headers['x-hospital-context'] || req.query.hospitalId || req.query.hospitalDomain || req.query.hospital;
  if (!contextHospitalId) return;

  let hospitalDoc = null;
  if (mongoose.Types.ObjectId.isValid(String(contextHospitalId))) {
    hospitalDoc = await Hospital.findById(contextHospitalId);
  }
  if (!hospitalDoc) {
    hospitalDoc = await Hospital.findOne({
      $or: [
        { domain: String(contextHospitalId).toLowerCase() },
        { code: String(contextHospitalId).toUpperCase() },
        { name: String(contextHospitalId) },
      ],
    });
  }

  if (hospitalDoc) {
    req.user.hospitalId = hospitalDoc._id.toString();
    req.user._hospitalContextApplied = true;

    const branch =
      (await Branch.findOne({ hospitalId: hospitalDoc._id, isMainBranch: true })) ||
      (await Branch.findOne({ hospitalId: hospitalDoc._id }));
    if (branch) {
      req.user.branchId = branch._id.toString();
    }
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

    // Platform Super Admin operational rule
    if (
      decoded.role === 'SUPER_ADMIN' &&
      req.method !== 'GET' &&
      !req.originalUrl.startsWith('/api/v1/saas') &&
      !req.originalUrl.startsWith('/api/v1/workflow') &&
      !req.originalUrl.startsWith('/api/v1/auth') &&
      !req.originalUrl.startsWith('/api/v1/notifications')
    ) {
      return sendError(res, 403, 'Super Admin accounts have read-only platform access and cannot modify hospital operational data.', null, 'OPERATIONAL_ACCESS_FORBIDDEN');
    }

    // Always keep currentUser roles, status, hospitalId & permissions in sync with DB
    let currentUser = null;
    if (decoded.id && decoded.role !== 'SUPER_ADMIN') {
      currentUser = await User.findById(decoded.id)
        .select('hospitalId branchId role additionalRoles isActive status permissions revokedPermissions departmentId additionalDepartments')
        .lean();

      if (currentUser) {
        if (!currentUser.isActive || currentUser.status === 'INACTIVE') {
          return sendError(res, 403, 'Your account is inactive.', null, 'ACCOUNT_INACTIVE');
        }
        req.user.role = currentUser.role || decoded.role;
        req.user.additionalRoles = currentUser.additionalRoles || [];
        req.user.additionalDepartments = currentUser.additionalDepartments || [];
        req.user.permissions = currentUser.permissions || {};
        req.user.departmentId = currentUser.departmentId;
        if (currentUser.hospitalId) {
          req.user.hospitalId = currentUser.hospitalId.toString();
        }
        if (currentUser.branchId) {
          req.user.branchId = currentUser.branchId.toString();
        }
      }
    }

    const module = moduleForRequest(req.originalUrl);
    const isPortalRole = decoded.role === 'PATIENT' || decoded.role === 'GUARDIAN';
    if (module && decoded.role !== 'SUPER_ADMIN' && !isPortalRole && currentUser) {
      const action = req.method === 'GET' ? 'view' : req.method === 'POST' ? 'create' : req.method === 'DELETE' ? 'delete' : 'edit';
      if (!hasPermission(currentUser, module, action)) {
        return sendError(res, 403, 'You do not have permission to perform this action.', null, 'FORBIDDEN');
      }
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
