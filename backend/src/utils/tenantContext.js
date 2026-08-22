import { ApiError } from './apiError.js';

export const tenantId = (value) => value?._id || value || null;

export const requireHospitalContext = (user) => {
  const hospitalId = tenantId(user?.hospitalId);
  if (!hospitalId) {
    throw new ApiError(400, 'Hospital context is required for this operation.', null, 'HOSPITAL_CONTEXT_REQUIRED');
  }
  return hospitalId;
};

export const requireBranchContext = (user) => {
  const branchId = tenantId(user?.branchId);
  if (!branchId) {
    throw new ApiError(400, 'Branch context is required for this operation.', null, 'BRANCH_CONTEXT_REQUIRED');
  }
  return branchId;
};

export const tenantScope = (user, { branch = false } = {}) => ({
  hospitalId: requireHospitalContext(user),
  ...(branch ? { branchId: requireBranchContext(user) } : {}),
});
