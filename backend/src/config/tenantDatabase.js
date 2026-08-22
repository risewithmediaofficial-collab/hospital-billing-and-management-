import mongoose from 'mongoose';

const TENANT_DATABASE_KEY = /^tenant_[a-f0-9]{24}$/;

export const databaseKeyForHospital = (hospitalId) => {
  const id = hospitalId?._id || hospitalId;
  if (!mongoose.Types.ObjectId.isValid(String(id || ''))) {
    throw new TypeError('A valid hospital id is required to select a tenant database.');
  }
  return `tenant_${String(id).toLowerCase()}`;
};

export const validateTenantDatabaseKey = (databaseKey) => {
  const normalized = String(databaseKey || '').toLowerCase().trim();
  if (!TENANT_DATABASE_KEY.test(normalized)) {
    throw new TypeError('Invalid tenant database key.');
  }
  return normalized;
};

export const getTenantConnection = (hospital) => {
  if (!hospital || hospital.storageMode !== 'DEDICATED') {
    throw new TypeError('A provisioned dedicated hospital is required to select a tenant database.');
  }
  const databaseKey = validateTenantDatabaseKey(
    hospital.databaseKey || databaseKeyForHospital(hospital._id),
  );
  return mongoose.connection.useDb(databaseKey, { useCache: true });
};
