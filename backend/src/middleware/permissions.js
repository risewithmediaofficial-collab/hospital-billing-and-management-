import { sendError } from '../utils/apiResponse.js';
import { User } from '../models/User.js';
import { hasPermission } from '../config/permissions.js';

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Unauthenticated user context', null, 'UNAUTHORIZED');
    }

    const userRoles = [req.user.role, ...(Array.isArray(req.user.additionalRoles) ? req.user.additionalRoles : [])].filter(Boolean);
    const hasRoleMatch = allowedRoles.some((role) => userRoles.includes(role))
      || userRoles.includes('SUPER_ADMIN')
      || userRoles.includes('HOSPITAL_ADMIN')
      || userRoles.includes('ADMIN');

    if (!hasRoleMatch) {
      // DEBUG: log the actual role mismatch details
      console.error(`[requireRole] 403 on ${req.method} ${req.originalUrl} — JWT role: "${req.user.role}", additionalRoles: [${(req.user.additionalRoles||[]).join(', ')}], required: [${allowedRoles.join(', ')}], userId: ${req.user.id}`);
      return sendError(
        res,
        403,
        `Access denied. Required role: [${allowedRoles.join(', ')}]. Your role: ${req.user.role}`,
        null,
        'FORBIDDEN'
      );
    }

    next();
  };
};

export const requirePermission = (permissionScope) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Unauthenticated user context', null, 'UNAUTHORIZED');
    }

    // SUPER_ADMIN override
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    next();
  };
};

const extractId = (val) => {
  if (!val) return '';
  if (typeof val === 'object') {
    return val._id ? String(val._id) : (val.id ? String(val.id) : String(val));
  }
  return String(val);
};

/** Database-backed authorization. JWTs identify the user; they never become
 * the source of truth for mutable staff permissions. */
export const requireModulePermission = (module, action = 'view') => {
  return async (req, res, next) => {
    if (!req.user?.id) return sendError(res, 401, 'Authentication token missing', null, 'UNAUTHORIZED');
    const user = await User.findById(req.user.id).select('hospitalId departmentId additionalDepartments isActive status role additionalRoles permissions revokedPermissions');
    if (!user || !user.isActive || user.status === 'INACTIVE') return sendError(res, 403, 'Your account is inactive.', null, 'ACCOUNT_INACTIVE');
    
    const userHId = extractId(user.hospitalId);
    const tokenHId = extractId(req.user.hospitalId);
    if (userHId && tokenHId && userHId !== tokenHId) {
      return sendError(res, 403, 'Hospital context is invalid.', null, 'HOSPITAL_CONTEXT_INVALID');
    }
    if (!hasPermission(user, module, action)) {
      return sendError(res, 403, 'You do not have permission to perform this action.', null, 'FORBIDDEN');
    }
    req.permissionUser = user;
    next();
  };
};
