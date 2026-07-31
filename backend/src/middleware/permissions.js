import { sendError } from '../utils/apiResponse.js';
import { User } from '../models/User.js';
import { hasPermission } from '../config/permissions.js';

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Unauthenticated user context', null, 'UNAUTHORIZED');
    }

    const userRoles = [req.user.role, ...(Array.isArray(req.user.additionalRoles) ? req.user.additionalRoles : [])].filter(Boolean);
    const hasRoleMatch = allowedRoles.some((role) => userRoles.includes(role)) || userRoles.includes('SUPER_ADMIN');

    if (!hasRoleMatch) {
      return sendError(
        res,
        403,
        `Access denied. Required role: [${allowedRoles.join(', ')}]. Your roles: ${userRoles.join(', ')}`,
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

/** Database-backed authorization. JWTs identify the user; they never become
 * the source of truth for mutable staff permissions. */
export const requireModulePermission = (module, action = 'view') => {
  return async (req, res, next) => {
    if (!req.user?.id) return sendError(res, 401, 'Authentication token missing', null, 'UNAUTHORIZED');
    const user = await User.findById(req.user.id).select('hospitalId departmentId additionalDepartments isActive status role additionalRoles permissions revokedPermissions');
    if (!user || !user.isActive || user.status === 'INACTIVE') return sendError(res, 403, 'Your account is inactive.', null, 'ACCOUNT_INACTIVE');
    
    const userHId = user.hospitalId?._id ? String(user.hospitalId._id) : (user.hospitalId ? String(user.hospitalId) : '');
    const tokenHId = req.user.hospitalId?._id ? String(req.user.hospitalId._id) : (req.user.hospitalId ? String(req.user.hospitalId) : '');
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
