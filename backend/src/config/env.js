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
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://mongo:27017/hpmbs_db',

  JWT_SECRET: process.env.JWT_SECRET || 'hpmbs_super_secret_jwt_key_2026_production_grade_x89',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',

  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'hpmbs_super_secret_refresh_key_2026_production_grade_x89',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '90d',

  FIELD_ENCRYPTION_KEY: process.env.FIELD_ENCRYPTION_KEY || Buffer.from('hpmbs_aes256_encryption_key_32b!').toString('base64'),
  SEARCH_HASH_KEY: process.env.SEARCH_HASH_KEY || 'hpmbs_search_hash_secret_key_2026_production_safe_key_32b',

  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  PUBLIC_APP_URL: process.env.PUBLIC_APP_URL || 'http://localhost:5173',
  EMAIL_PROVIDER: (process.env.EMAIL_PROVIDER || (process.env.NODE_ENV === 'production' ? '' : 'console')).toLowerCase(),
  EMAIL_FROM: process.env.EMAIL_FROM || '',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
};

const DEFAULT_JWT_SECRET = 'hpmbs_super_secret_jwt_key_2026_production_grade_x89';
const DEFAULT_REFRESH_SECRET = 'hpmbs_super_secret_refresh_key_2026_production_grade_x89';

export const validateProductionEnvironment = (configuration = env) => {
  if (configuration.NODE_ENV !== 'production') return true;
  const errors = [];
  if (!process.env.MONGO_URI) errors.push('MONGO_URI');
  if (!process.env.JWT_SECRET || configuration.JWT_SECRET === DEFAULT_JWT_SECRET || configuration.JWT_SECRET.length < 32) errors.push('JWT_SECRET');
  if (!process.env.REFRESH_TOKEN_SECRET || configuration.REFRESH_TOKEN_SECRET === DEFAULT_REFRESH_SECRET || configuration.REFRESH_TOKEN_SECRET.length < 32) errors.push('REFRESH_TOKEN_SECRET');
  if (configuration.JWT_SECRET === configuration.REFRESH_TOKEN_SECRET) errors.push('JWT_SECRET/REFRESH_TOKEN_SECRET must differ');
  let encryptionKeyLength = 0;
  try { encryptionKeyLength = Buffer.from(process.env.FIELD_ENCRYPTION_KEY || '', 'base64').length; } catch { encryptionKeyLength = 0; }
  if (!process.env.FIELD_ENCRYPTION_KEY || encryptionKeyLength !== 32) errors.push('FIELD_ENCRYPTION_KEY (base64-encoded 32-byte value)');
  if (!process.env.SEARCH_HASH_KEY || configuration.SEARCH_HASH_KEY.length < 32) errors.push('SEARCH_HASH_KEY (minimum 32 characters)');
  if (!configuration.CORS_ORIGIN || configuration.CORS_ORIGIN === '*') errors.push('CORS_ORIGIN');
  if (!configuration.PUBLIC_APP_URL || !/^https:\/\//i.test(configuration.PUBLIC_APP_URL)) errors.push('PUBLIC_APP_URL (HTTPS required)');
  if (configuration.EMAIL_PROVIDER !== 'resend') errors.push('EMAIL_PROVIDER=resend');
  if (!configuration.EMAIL_FROM) errors.push('EMAIL_FROM');
  if (!configuration.RESEND_API_KEY) errors.push('RESEND_API_KEY');
  if (errors.length > 0) {
    throw new Error(`Production configuration is insecure or incomplete: ${errors.join(', ')}`);
  }
  return true;
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
