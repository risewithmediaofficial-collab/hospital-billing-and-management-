export const sendSuccess = (res, statusCode = 200, message = 'Operation successful', data = null, meta = {}) => {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  });
};

export const sendError = (res, statusCode = 500, message = 'Internal Server Error', details = null, code = 'SERVER_ERROR') => {
  return res.status(statusCode).json({
    success: false,
    statusCode,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};
