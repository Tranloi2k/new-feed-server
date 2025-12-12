import jwt from "jsonwebtoken";

const authenticateToken = (req, res, next) => {
  try {
    // Ưu tiên lấy token từ cookie trước, sau đó mới từ Authorization header
    const token = req.cookies.access_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy token xác thực",
      });
    }

    // Xác thực token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        // Xóa token không hợp lệ khỏi sessions
        return res.status(403).json({
          success: false,
          message: "Token không hợp lệ",
        });
      }

      req.user = user;
      req.token = token;
      next();
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi xác thực",
      error: error.message,
    });
  }
};

export { authenticateToken };
