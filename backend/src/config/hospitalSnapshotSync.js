import mongoose from 'mongoose';

export const syncHospitalSnapshotToTenant = async (document) => {
  if (!document?._id || !mongoose.connection.db) return;
  const hospital = document.toObject
    ? document.toObject({ depopulate: true, transform: false, versionKey: true })
    : { ...document };
  if (
    hospital.storageMode !== 'DEDICATED' ||
    hospital.databaseMigrationStatus !== 'COPY_PREPARED' ||
    !hospital.databaseKey
  ) return;
  const connection = mongoose.connection.useDb(hospital.databaseKey, { useCache: true });
  await connection.collection('hospitals').replaceOne({ _id: hospital._id }, hospital, { upsert: true });
};
