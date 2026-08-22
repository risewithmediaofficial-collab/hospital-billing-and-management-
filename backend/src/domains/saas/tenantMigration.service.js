import mongoose from 'mongoose';
import '../../models/index.js';

import { AuditLog } from '../../models/AuditLog.js';
import { Hospital } from '../../models/Hospital.js';
import { ApiError } from '../../utils/apiError.js';
import { databaseKeyForHospital } from '../../config/tenantDatabase.js';
import { tenantRuntimeReadiness } from '../../config/tenantAwareModel.js';
import { waitForTenantWritesToDrain } from '../../config/tenantOperationLease.js';

const PLATFORM_MODELS = new Set([
  'Hospital',
  'SubscriptionPlan',
  'GlobalPatient',
  'MedicalRecordShare',
  'RefreshToken',
  'Role',
]);

export const tenantOwnedModels = () => Object.values(mongoose.models)
  .filter((model) => model.schema.path('hospitalId') && !PLATFORM_MODELS.has(model.modelName));

const copyModelDocuments = async ({ model, hospitalId, tenantConnection, batchSize = 500, changedSince = null }) => {
  const sourceCollection = model.collection;
  const targetCollection = tenantConnection.collection(sourceCollection.collectionName);
  const query = { hospitalId };
  const copyQuery = changedSince && model.schema.path('updatedAt')
    ? { ...query, updatedAt: { $gte: changedSince } }
    : query;
  let copied = 0;
  let operations = [];

  const flush = async () => {
    if (operations.length === 0) return;
    await targetCollection.bulkWrite(operations, { ordered: false });
    copied += operations.length;
    operations = [];
  };

  const cursor = sourceCollection.find(copyQuery).batchSize(batchSize);
  for await (const document of cursor) {
    operations.push({
      replaceOne: {
        filter: { _id: document._id },
        replacement: document,
        upsert: true,
      },
    });
    if (operations.length >= batchSize) await flush();
  }
  await flush();

  // Reconcile deletions in bounded batches. This removes only records owned by
  // the target hospital and never deletes from the shared source database.
  let staleDeleted = 0;
  let targetIds = [];
  const reconcileIds = async () => {
    if (targetIds.length === 0) return;
    const sourceIds = await sourceCollection
      .find({ hospitalId, _id: { $in: targetIds } }, { projection: { _id: 1 } })
      .toArray();
    const existing = new Set(sourceIds.map((item) => String(item._id)));
    const staleIds = targetIds.filter((id) => !existing.has(String(id)));
    if (staleIds.length > 0) {
      const result = await targetCollection.deleteMany({ hospitalId, _id: { $in: staleIds } });
      staleDeleted += result.deletedCount || 0;
    }
    targetIds = [];
  };
  const targetCursor = targetCollection.find(query, { projection: { _id: 1 } }).batchSize(batchSize);
  for await (const document of targetCursor) {
    targetIds.push(document._id);
    if (targetIds.length >= batchSize) await reconcileIds();
  }
  await reconcileIds();

  const indexes = await sourceCollection.listIndexes().toArray().catch(() => []);
  for (const index of indexes) {
    if (index.name === '_id_') continue;
    const options = Object.fromEntries(
      ['name', 'unique', 'sparse', 'expireAfterSeconds', 'partialFilterExpression', 'collation']
        .filter((key) => index[key] !== undefined)
        .map((key) => [key, index[key]]),
    );
    await targetCollection.createIndex(index.key, options);
  }

  const [sourceCount, targetCount] = await Promise.all([
    sourceCollection.countDocuments(query),
    targetCollection.countDocuments(query),
  ]);

  return {
    model: model.modelName,
    collection: sourceCollection.collectionName,
    copied,
    staleDeleted,
    deltaSince: changedSince || null,
    sourceCount,
    targetCount,
    countsMatch: sourceCount === targetCount,
  };
};

export class TenantMigrationService {
  static async prepareDedicatedDatabase(hospitalId, actor, { changedSince = null } = {}) {
    if (!mongoose.connection.db) {
      throw new ApiError(503, 'MongoDB is not connected.', null, 'DATABASE_UNAVAILABLE');
    }

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital || hospital.isDeleted) {
      throw new ApiError(404, 'Hospital tenant not found.', null, 'HOSPITAL_NOT_FOUND');
    }
    if (hospital.code === 'PLATFORM' || hospital.domain === 'platform') {
      throw new ApiError(400, 'The platform directory cannot be migrated as a hospital tenant.', null, 'INVALID_TENANT');
    }
    if (hospital.databaseMigrationStatus === 'COPYING') {
      throw new ApiError(409, 'A dedicated database copy is already running.', null, 'MIGRATION_IN_PROGRESS');
    }

    const databaseKey = hospital.databaseKey || databaseKeyForHospital(hospital._id);
    hospital.databaseKey = databaseKey;
    hospital.storageMode = 'DEDICATED_PENDING';
    hospital.databaseMigrationStatus = 'COPYING';
    hospital.databaseMigrationError = null;
    await hospital.save();

    try {
      const tenantConnection = mongoose.connection.useDb(databaseKey, { useCache: true });
      await tenantConnection.collection('hospitals').replaceOne(
        { _id: hospital._id },
        hospital.toObject({ depopulate: true, transform: false, versionKey: true }),
        { upsert: true },
      );
      const reports = [{
        model: 'Hospital',
        collection: 'hospitals',
        copied: 1,
        sourceCount: 1,
        targetCount: 1,
        countsMatch: true,
      }];
      for (const model of tenantOwnedModels()) {
        reports.push(await copyModelDocuments({
          model,
          hospitalId: hospital._id,
          tenantConnection,
          changedSince,
        }));
      }

      const mismatches = reports.filter((report) => !report.countsMatch);
      if (mismatches.length > 0) {
        throw new Error(`Count verification failed for: ${mismatches.map((item) => item.collection).join(', ')}`);
      }

      const report = {
        databaseKey,
        preparedAt: new Date(),
        collections: reports,
        sourceDocuments: reports.reduce((sum, item) => sum + item.sourceCount, 0),
        copiedDocuments: reports.reduce((sum, item) => sum + item.copied, 0),
        runtimeActivated: false,
      };
      hospital.databaseMigrationStatus = 'COPY_PREPARED';
      hospital.databaseMigrationReport = report;
      hospital.databaseProvisionedAt = report.preparedAt;
      await hospital.save();

      await AuditLog.create({
        hospitalId: hospital._id,
        userId: actor?.id || actor?._id,
        userRole: actor?.role,
        action: 'TENANT_DATABASE_COPY_PREPARED',
        module: 'SAAS',
        resourceId: String(hospital._id),
        details: `Prepared ${report.sourceDocuments} tenant-owned documents in ${databaseKey}. Runtime activation remains disabled.`,
        newState: report,
      });

      return { hospital, report };
    } catch (error) {
      hospital.databaseMigrationStatus = 'FAILED';
      hospital.databaseMigrationError = error.message;
      await hospital.save();
      throw new ApiError(500, 'Dedicated database preparation failed.', { reason: error.message }, 'TENANT_MIGRATION_FAILED');
    }
  }

  static async activateDedicatedDatabase(hospitalId, actor) {
    const readiness = tenantRuntimeReadiness();
    if (!readiness.ready) {
      throw new ApiError(409, 'Tenant runtime model coverage is incomplete.', { missingModels: readiness.missingModels }, 'TENANT_RUNTIME_NOT_READY');
    }

    const lockedHospital = await Hospital.findOneAndUpdate(
      {
        _id: hospitalId,
        storageMode: 'DEDICATED_PENDING',
        databaseMigrationStatus: 'COPY_PREPARED',
        databaseProvisionedAt: { $ne: null },
        databaseWriteLocked: { $ne: true },
      },
      {
        $set: {
          databaseWriteLocked: true,
          databaseWriteLockReason: 'Final dedicated database cutover is in progress. Please retry shortly.',
          databaseWriteLockedAt: new Date(),
        },
      },
      { new: true },
    );
    if (!lockedHospital) {
      throw new ApiError(
        409,
        'Hospital database must have a verified prepared copy and no active migration lock before activation.',
        null,
        'TENANT_DATABASE_NOT_PREPARED',
      );
    }

    try {
      await waitForTenantWritesToDrain(lockedHospital._id);
      const previousPreparedAt = lockedHospital.databaseMigrationReport?.preparedAt || lockedHospital.databaseProvisionedAt;
      const { report } = await this.prepareDedicatedDatabase(
        lockedHospital._id,
        actor,
        { changedSince: previousPreparedAt ? new Date(previousPreparedAt) : null },
      );
      const hospital = await Hospital.findById(lockedHospital._id);
      if (!hospital || hospital.databaseMigrationStatus !== 'COPY_PREPARED') {
        throw new Error('Final tenant copy did not complete verification.');
      }

      hospital.storageMode = 'DEDICATED';
      hospital.databaseWriteLocked = false;
      hospital.databaseWriteLockReason = '';
      hospital.databaseWriteLockedAt = null;
      hospital.databaseMigrationError = null;
      hospital.databaseMigrationReport = {
        ...(hospital.databaseMigrationReport || report),
        runtimeActivated: true,
        activatedAt: new Date(),
        activatedBy: actor?.id || actor?._id || null,
      };
      await hospital.save();

      await AuditLog.create({
        hospitalId: hospital._id,
        userId: actor?.id || actor?._id,
        userRole: actor?.role,
        action: 'TENANT_DATABASE_ACTIVATED',
        module: 'SAAS',
        resourceId: String(hospital._id),
        details: `Dedicated database ${hospital.databaseKey} activated after active writes drained and final copy verification completed.`,
        newState: hospital.databaseMigrationReport,
      });
      return { hospital, report: hospital.databaseMigrationReport };
    } catch (error) {
      await Hospital.updateOne(
        { _id: lockedHospital._id },
        {
          $set: {
            databaseWriteLocked: false,
            databaseWriteLockReason: '',
            databaseWriteLockedAt: null,
            databaseMigrationError: error.message,
          },
        },
      );
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Dedicated database activation failed safely; shared storage remains active.', { reason: error.message }, 'TENANT_ACTIVATION_FAILED');
    }
  }
}
