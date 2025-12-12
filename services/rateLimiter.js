import redisClient from "../config/redis.js";

/**
 * Rate Limiter sử dụng thuật toán Sliding Window với Redis
 *
 * Thuật toán hoạt động:
 * 1. Sử dụng Sorted Set trong Redis để lưu trữ timestamps của các requests
 * 2. Key: identifier (IP, user ID, etc.)
 * 3. Score: timestamp của request
 * 4. Member: unique ID cho mỗi request
 */
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs; // 1 phút
    this.maxRequests = options.maxRequests; // 10 requests
  }

  /**
   * Kiểm tra và ghi nhận request
   * @param {string} identifier - Định danh người dùng (IP, user ID, etc.)
   * @returns {Object} - { allowed: boolean, remaining: number, resetTime: number }
   */
  async checkLimit(identifier) {
    const client = redisClient.getClient();
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    try {
      // 1. Xóa các requests cũ ngoài window
      await client.zRemRangeByScore(key, 0, windowStart);

      // 2. Đếm số requests trong window hiện tại
      const requestCount = await client.zCard(key);

      // 3. Kiểm tra có vượt quá giới hạn không
      if (requestCount >= this.maxRequests) {
        // Lấy timestamp của request cũ nhất để tính thời gian reset
        const oldestRequest = await client.zRangeWithScores(key, 0, 0);
        const resetTime =
          oldestRequest.length > 0
            ? Math.ceil((oldestRequest[0].score + this.windowMs - now) / 1000)
            : Math.ceil(this.windowMs / 1000);

        return {
          allowed: false,
          remaining: 0,
          resetTime,
          total: this.maxRequests,
        };
      }

      // 4. Thêm request mới
      await client.zAdd(key, {
        score: now,
        value: `${now}-${Math.random()}`, // Unique identifier
      });

      // 5. Set TTL cho key (tự động xóa sau window time)
      await client.expire(key, Math.ceil(this.windowMs / 1000));

      return {
        allowed: true,
        remaining: this.maxRequests - requestCount - 1,
        resetTime: Math.ceil(this.windowMs / 1000),
        total: this.maxRequests,
      };
    } catch (error) {
      console.error("Rate Limiter Error:", error);
      // Trong trường hợp lỗi, cho phép request đi qua
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetTime: Math.ceil(this.windowMs / 1000),
        total: this.maxRequests,
        error: true,
      };
    }
  }

  /**
   * Reset rate limit cho một identifier
   * @param {string} identifier - Định danh người dùng
   */
  async reset(identifier) {
    const client = redisClient.getClient();
    const key = `rate_limit:${identifier}`;
    await client.del(key);
  }

  /**
   * Lấy thông tin rate limit hiện tại
   * @param {string} identifier - Định danh người dùng
   */
  async getInfo(identifier) {
    const client = redisClient.getClient();
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    try {
      // Xóa requests cũ
      await client.zRemRangeByScore(key, 0, windowStart);

      // Đếm requests hiện tại
      const requestCount = await client.zCard(key);

      return {
        current: requestCount,
        remaining: Math.max(0, this.maxRequests - requestCount),
        total: this.maxRequests,
        windowMs: this.windowMs,
      };
    } catch (error) {
      console.error("Get Rate Limit Info Error:", error);
      return null;
    }
  }
}

export default RateLimiter;
