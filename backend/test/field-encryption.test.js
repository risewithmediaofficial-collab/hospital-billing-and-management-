import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { createBlindIndex, decryptField, encryptField, isEncrypted } from '../src/utils/fieldEncryption.js';
import { encryptedFieldsPlugin } from '../src/plugins/encryptedFieldsPlugin.js';

const originalEncryptionKey = env.FIELD_ENCRYPTION_KEY;
const originalSearchKey = env.SEARCH_HASH_KEY;
env.FIELD_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
env.SEARCH_HASH_KEY = crypto.randomBytes(32).toString('base64');

test.after(() => {
  env.FIELD_ENCRYPTION_KEY = originalEncryptionKey;
  env.SEARCH_HASH_KEY = originalSearchKey;
});

test('AES-GCM encryption round-trips and produces randomized ciphertext', () => {
  const first = encryptField('sensitive clinical note');
  const second = encryptField('sensitive clinical note');
  assert.equal(isEncrypted(first), true);
  assert.notEqual(first, second);
  assert.equal(decryptField(first), 'sensitive clinical note');
  assert.equal(encryptField(first), first);
});

test('AES-GCM authentication rejects tampered ciphertext', () => {
  const encrypted = encryptField('diagnosis');
  assert.throws(() => decryptField(`${encrypted.slice(0, -2)}AA`));
});

test('blind indexes normalize equivalent values', () => {
  assert.equal(createBlindIndex(' Patient@Example.COM '), createBlindIndex('patient@example.com'));
  assert.notEqual(createBlindIndex('patient@example.com'), createBlindIndex('other@example.com'));
});

test('Mongoose plugin stores ciphertext and returns plaintext', () => {
  const schema = new mongoose.Schema({ note: String });
  schema.plugin(encryptedFieldsPlugin, { fields: ['note'] });
  const Model = mongoose.models.EncryptionPluginTest || mongoose.model('EncryptionPluginTest', schema);
  const document = new Model({ note: 'private patient note' });
  assert.equal(isEncrypted(document.$__getValue('note')), true);
  assert.equal(document.note, 'private patient note');
  assert.equal(document.toJSON().note, 'private patient note');
});
