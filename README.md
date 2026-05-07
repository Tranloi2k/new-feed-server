# New Feed Server API

Node.js backend server with authentication APIs (login/logout)

## 🚀 Installation

```bash
npm install
```

## ⚙️ Configuration

The `.env` file has been created with default configurations:

- PORT: 3000
- JWT_SECRET: (should be changed in production environment)
- JWT_EXPIRE: 7d
- NODE_ENV: development

## 🏃 Running the Server

```bash
# Development mode (with nodemon)
npm run dev

# Production mode
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
  "message": "Login successful",
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
  "message": "Logout successful"
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

## 👥 Sample Accounts

1. **Admin**

   - Username: `admin`
   - Password: `admin123`

2. **User**
   - Username: `user`
   - Password: `user123`

## 🗂️ Project Structure

```
new-feed-server/
├── app.js                  # Main server file
├── package.json            # Dependencies and scripts
├── .env                    # Environment variables
├── .gitignore             # Git ignore
├── config/
│   └── database.js        # Sample data and session storage
├── controllers/
│   └── authController.js  # Authentication logic handler
├── middleware/
│   └── auth.js           # JWT authentication middleware
└── routes/
    └── authRoutes.js     # Authentication routes definition
```

## 🔐 Authentication Flow

1. User sends username/password to `/api/auth/login`
2. Server authenticates and returns JWT token
3. Client saves token and sends it in the header for subsequent requests
4. Server validates token through `authenticateToken` middleware
5. User can logout via `/api/auth/logout` to remove session

## 📝 Notes

- Currently using sample data in memory (no database)
- Sessions are stored in Map (should use Redis in production)
- Passwords are hashed using bcryptjs
- JWT token has a lifespan of 7 days
