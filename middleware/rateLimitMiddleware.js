import RateLimiter from "../services/rateLimiter.js";

/**
 * Middleware Rate Limiter cho Express
 * @param {Object} options - Tùy chọn cấu hình
 * @param {number} options.windowMs - Thời gian window (ms)
 * @param {number} options.maxRequests - Số requests tối đa trong window
 * @param {Function} options.keyGenerator - Function tạo key từ request
 */
export function createRateLimitMiddleware(options = {}) {
  const rateLimiter = new RateLimiter({
    windowMs:
      options.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    maxRequests:
      options.maxRequests ||
      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) ||
      10,
  });

  // Function mặc định để tạo key từ IP
  const defaultKeyGenerator = (req) => {
    return req.ip || req.connection.remoteAddress;
  };

  const keyGenerator = options.keyGenerator || defaultKeyGenerator;

  return async (req, res, next) => {
    try {
      const identifier = keyGenerator(req);
      const result = await rateLimiter.checkLimit(identifier);

      // Thêm headers về rate limit
      res.setHeader("X-RateLimit-Limit", result.total);
      res.setHeader("X-RateLimit-Remaining", result.remaining);
      res.setHeader("X-RateLimit-Reset", result.resetTime);

      if (!result.allowed) {
        res.setHeader("Retry-After", result.resetTime);
        return res.status(429).json({
          error: "Too Many Requests",
          message:
            options.message ||
            `Rate limit exceeded. Try again in ${result.resetTime} seconds.`,
          retryAfter: result.resetTime,
        });
      }

      next();
    } catch (error) {
      console.error("Rate Limit Middleware Error:", error);
      // Trong trường hợp lỗi, cho phép request đi qua
      next();
    }
  };
}
