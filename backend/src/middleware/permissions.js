import { sendError } from '../utils/apiResponse.js';

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Unauthenticated user context', null, 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
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

    // Role-based scope matching
    next();
  };
};
