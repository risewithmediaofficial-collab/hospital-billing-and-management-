import { AsyncLocalStorage } from 'node:async_hooks';

const tenantModelStorage = new AsyncLocalStorage();

export const runWithTenantModelContext = (callback) => (
  tenantModelStorage.run({ connection: null, hospitalId: null }, callback)
);

export const setTenantModelConnection = ({ connection, hospitalId }) => {
  const store = tenantModelStorage.getStore();
  if (!store) {
    throw new Error('Tenant model context was not initialized for this request.');
  }
  store.connection = connection || null;
  store.hospitalId = hospitalId ? String(hospitalId) : null;
};

export const getTenantModelContext = () => tenantModelStorage.getStore() || {
  connection: null,
  hospitalId: null,
};

export const tenantModelContextMiddleware = (req, res, next) => runWithTenantModelContext(next);
