import rateLimit from 'express-rate-limit';

// Real-time hospital dashboard makes 6-10 API calls on page load, polls every 10s,
// plus multiple users may share an IP (hospital LAN/WiFi).
// 2000 per 15-min = ~133/min = 2.2/sec — safe for real usage.
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // 2000 requests per IP per 15-min window
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Never rate-limit socket.io polling — it uses long-polling HTTP internally
    if (req.path && req.path.startsWith('/socket.io')) return true;
    // Never rate-limit health checks
    if (req.path === '/api/v1/health') return true;
    return false;
  },
  message: {
    success: false,
    statusCode: 429,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP. Please try again after 15 minutes.',
    },
  },
});

// Auth endpoints stay strict to prevent brute-force login attacks.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // 60 login attempts per 15 mins per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
  },
});
