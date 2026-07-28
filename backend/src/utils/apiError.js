export class ApiError extends Error {
  constructor(statusCode, message, details = null, code = 'OPERATIONAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
