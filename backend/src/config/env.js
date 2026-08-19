import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

// export const env = {
//   PORT: process.env.PORT || 5001,
//   NODE_ENV: process.env.NODE_ENV || 'development',
//   MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/hpmbs_db',
//   JWT_SECRET: process.env.JWT_SECRET || 'hpmbs_super_secret_jwt_key_2026_production_grade',
//   JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
//   REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'hpmbs_super_secret_refresh_key_2026_production_grade',
//   REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
//   CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
// };

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'production',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://mongo:27017/hpmbs_db',

  JWT_SECRET: process.env.JWT_SECRET || 'hpmbs_super_secret_jwt_key_2026_production_grade_x89',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',

  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'hpmbs_super_secret_refresh_key_2026_production_grade_x89',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '90d',

  FIELD_ENCRYPTION_KEY: process.env.FIELD_ENCRYPTION_KEY || Buffer.from('hpmbs_aes256_encryption_key_32b!').toString('base64'),
  SEARCH_HASH_KEY: process.env.SEARCH_HASH_KEY || 'hpmbs_search_hash_secret_key_2026_production_safe_key_32b',

  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};

// Ensure encryption key is safely normalized to exactly 32 bytes
try {
  const fieldKey = Buffer.from(env.FIELD_ENCRYPTION_KEY || '', 'base64');
  if (fieldKey.length !== 32) {
    env.FIELD_ENCRYPTION_KEY = Buffer.from('hpmbs_aes256_encryption_key_32b!').toString('base64');
  }
} catch (e) {
  env.FIELD_ENCRYPTION_KEY = Buffer.from('hpmbs_aes256_encryption_key_32b!').toString('base64');
}

if (!env.SEARCH_HASH_KEY || env.SEARCH_HASH_KEY.length < 32) {
  env.SEARCH_HASH_KEY = 'hpmbs_search_hash_secret_key_2026_production_safe_key_32b';
}
