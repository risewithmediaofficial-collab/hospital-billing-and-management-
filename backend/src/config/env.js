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
  PORT: process.env.PORT || 5001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/hpmbs_db',

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',

  FIELD_ENCRYPTION_KEY: process.env.FIELD_ENCRYPTION_KEY,
  SEARCH_HASH_KEY: process.env.SEARCH_HASH_KEY,

  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};


if (env.NODE_ENV === 'production') {
  const requiredSecrets = [
    'JWT_SECRET',
    'REFRESH_TOKEN_SECRET',
    'FIELD_ENCRYPTION_KEY',
    'SEARCH_HASH_KEY',
  ];

  for (const name of requiredSecrets) {
    if (!env[name]) {
      throw new Error(`${name} is required in production`);
    }
  }

  const fieldKey = Buffer.from(env.FIELD_ENCRYPTION_KEY, 'base64');
  if (fieldKey.length !== 32) {
    throw new Error('FIELD_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  }
  if (env.SEARCH_HASH_KEY.length < 32) {
    throw new Error('SEARCH_HASH_KEY must contain at least 32 characters');
  }
}
