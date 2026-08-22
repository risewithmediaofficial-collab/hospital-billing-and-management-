import { getTenantModelContext } from './tenantModelContext.js';

const modelRegistry = new Map();

export const REQUIRED_TENANT_RUNTIME_MODELS = [
  'Admission', 'Appointment', 'Bed', 'BedReservation', 'BedStatusHistory', 'BedTransfer',
  'Branch', 'CareTeamAssignment', 'ChatMessage', 'Consultation', 'Department',
  'DiagnosticOrder', 'DoctorUpdate', 'Emergency', 'GuardianLink', 'HospitalBlock',
  'HospitalFloor', 'HospitalRoom', 'HospitalWard', 'Invoice', 'Medicine', 'MedicineBatch',
  'Notification', 'NurseTask', 'Patient', 'PatientRequest', 'PharmacyStockAdjustment',
  'PharmacySubstitutionRequest', 'Prescription', 'PrintTemplate', 'Receipt', 'User',
].sort();

const registerModel = (model) => {
  modelRegistry.set(model.modelName, {
    schema: model.schema,
    collectionName: model.collection.collectionName,
  });
};

export const registerTenantReferenceModel = (model) => registerModel(model);

const ensureModelsOnConnection = (connection) => {
  for (const [modelName, definition] of modelRegistry) {
    if (!connection.models[modelName]) {
      connection.model(modelName, definition.schema, definition.collectionName);
    }
  }
};

export const resolveTenantModel = (platformModel) => {
  const { connection } = getTenantModelContext();
  if (!connection) return platformModel;
  ensureModelsOnConnection(connection);
  return connection.models[platformModel.modelName] || connection.model(
    platformModel.modelName,
    platformModel.schema,
    platformModel.collection.collectionName,
  );
};

export const tenantAwareModel = (platformModel) => {
  registerModel(platformModel);
  return new Proxy(platformModel, {
    get(target, property) {
      const model = resolveTenantModel(target);
      const value = Reflect.get(model, property, model);
      return typeof value === 'function' ? value.bind(model) : value;
    },
    construct(target, argumentsList) {
      const Model = resolveTenantModel(target);
      return Reflect.construct(Model, argumentsList, Model);
    },
    apply(target, thisArgument, argumentsList) {
      const Model = resolveTenantModel(target);
      return Reflect.apply(Model, Model, argumentsList);
    },
  });
};

export const registeredTenantModelNames = () => [...modelRegistry.keys()].sort();

export const tenantRuntimeReadiness = () => {
  const registered = new Set(registeredTenantModelNames());
  const missingModels = REQUIRED_TENANT_RUNTIME_MODELS.filter((name) => !registered.has(name));
  return { ready: missingModels.length === 0, missingModels };
};
