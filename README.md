# New Feed Server API

Backend server Node.js với authentication APIs (login/logout)

## 🚀 Cài đặt

```bash
npm install
```

## ⚙️ Cấu hình

File `.env` đã được tạo với các cấu hình mặc định:

- PORT: 3000
- JWT_SECRET: (nên thay đổi trong môi trường production)
- JWT_EXPIRE: 7d
- NODE_ENV: development

## 🏃 Chạy server

```bash
# Chế độ development (với nodemon)
npm run dev

# Chế độ production
npm start
```

## 📡 API Endpoints

### Authentication

#### 1. Login

- **URL**: `POST /api/auth/login`
- **Body**:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

- **Response**:

```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com"
    }
  }
}
```

#### 2. Logout

- **URL**: `POST /api/auth/logout`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:

```json
{
  "success": true,
  "message": "Đăng xuất thành công"
}
```

#### 3. Get Current User (Protected)

- **URL**: `GET /api/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

## 👥 Tài khoản mẫu

1. **Admin**

   - Username: `admin`
   - Password: `admin123`

2. **User**
   - Username: `user`
   - Password: `user123`

## 🗂️ Cấu trúc project

```
new-feed-server/
├── app.js                  # File chính của server
├── package.json            # Dependencies và scripts
├── .env                    # Biến môi trường
├── .gitignore             # Git ignore
├── config/
│   └── database.js        # Dữ liệu mẫu và session storage
├── controllers/
│   └── authController.js  # Logic xử lý authentication
├── middleware/
│   └── auth.js           # Middleware xác thực JWT
└── routes/
    └── authRoutes.js     # Định nghĩa routes cho auth
```

## 🔐 Authentication Flow

1. User gửi username/password đến `/api/auth/login`
2. Server xác thực và trả về JWT token
3. Client lưu token và gửi kèm trong header cho các request tiếp theo
4. Server xác thực token qua middleware `authenticateToken`
5. User có thể logout qua `/api/auth/logout` để xóa session

## 📝 Ghi chú

- Hiện tại đang sử dụng dữ liệu mẫu trong memory (không có database)
- Session được lưu trong Map (nên dùng Redis trong production)
- Passwords đã được hash bằng bcryptjs
- JWT token có thời gian sống 7 ngày
