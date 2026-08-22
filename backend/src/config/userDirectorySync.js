import mongoose from 'mongoose';

const plainDocument = (document) => {
  if (!document) return null;
  return document.toObject
    ? document.toObject({ depopulate: true, transform: false, versionKey: true })
    : { ...document };
};

export const syncUserAcrossDirectoryAndTenant = async (document) => {
  const user = plainDocument(document);
  if (!user?._id || !user.hospitalId || !mongoose.connection.db) return;

  const platformUsers = mongoose.connection.collection('users');
  const sourceDatabase = document?.constructor?.db?.name;
  if (sourceDatabase && sourceDatabase !== mongoose.connection.name) {
    await platformUsers.replaceOne({ _id: user._id }, user, { upsert: true });
  }

  const hospitalId = user.hospitalId?._id || user.hospitalId;
  const hospital = await mongoose.connection.collection('hospitals').findOne(
    { _id: hospitalId },
    { projection: { storageMode: 1, databaseKey: 1, databaseMigrationStatus: 1 } },
  );
  if (
    hospital?.storageMode !== 'DEDICATED' ||
    hospital.databaseMigrationStatus !== 'COPY_PREPARED' ||
    !hospital.databaseKey
  ) return;

  const tenantConnection = mongoose.connection.useDb(hospital.databaseKey, { useCache: true });
  if (sourceDatabase !== tenantConnection.name) {
    await tenantConnection.collection('users').replaceOne({ _id: user._id }, user, { upsert: true });
  }
};
