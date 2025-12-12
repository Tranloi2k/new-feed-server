/**
 * CÁC RULE RATE LIMIT CHO TỪNG API
 * Định nghĩa các cấu hình rate limit khác nhau cho các endpoint
 */

export const rateLimitRules = {
  // Rule cho authentication endpoints
  auth: {
    login: {
      windowMs: 15 * 60 * 1000, // 15 phút
      maxRequests: 5, // 5 lần thử login
      message:
        "Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.",
    },
  },
};
