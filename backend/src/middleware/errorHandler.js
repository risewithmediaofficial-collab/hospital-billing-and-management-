import { sendError } from '../utils/apiResponse.js';

export const errorHandler = (err, req, res, next) => {
  console.error('[API Error Handler]', err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'SERVER_ERROR';
  let details = err.details || null;

  // Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    const errors = Object.values(err.errors || {}).map((el) => el.message);
    message = `Validation Failed: ${errors.join(', ')}`;
  }

  // Handle Duplicate Key Errors (MongoServerError 11000)
  if (err.code === 11000) {
    statusCode = 400;
    code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const val = err.keyValue ? err.keyValue[field] : '';
    message = `User already registered: A user with this ${field} ('${val}') already exists in the system.`;
  }

  return sendError(res, statusCode, message, details, code);
};
