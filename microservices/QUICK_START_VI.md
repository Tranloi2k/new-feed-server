# 🚀 Hướng dẫn chạy nhanh - NewFeed Microservices

## ⚡ Quick Start trong 5 phút

### Bước 1: Clone và setup

```bash
# Di chuyển vào thư mục microservices
cd microservices
```

### Bước 2: Chạy với Docker (Recommended) 🐳

```bash
# Copy file .env
copy .env.example .env

# Copy .env cho từng service
copy api-gateway\.env.example api-gateway\.env
copy auth-service\.env.example auth-service\.env
copy post-service\.env.example post-service\.env
copy comment-service\.env.example comment-service\.env
copy media-service\.env.example media-service\.env

# ⚠️ QUAN TRỌNG: Sửa các secrets trong .env files
# - JWT_SECRET
# - SERVICE_SECRET
# - CLOUDINARY credentials (nếu test upload)

# Khởi động tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f

# Đợi khoảng 30s để services khởi động hoàn toàn
```

### Bước 3: Test API

```bash
# Test health checks
curl http://localhost:8080/api/auth/health
curl http://localhost:8080/api/posts/health
curl http://localhost:8080/api/comments/health
curl http://localhost:8080/api/media/health

# Nếu tất cả return {"success": true, ...} → ✅ Thành công!
```

---

## 📋 Các lệnh Docker hữu ích

```bash
# Xem trạng thái services
docker-compose ps

# Xem logs của 1 service
docker-compose logs -f auth-service
docker-compose logs -f comment-service

# Stop tất cả
docker-compose down

# Stop và xóa volumes (database sẽ mất data)
docker-compose down -v

# Restart 1 service
docker-compose restart auth-service

# Scale comment service (cho SSE)
docker-compose up -d --scale comment-service=3
```

---

## 🔧 Test API với Postman/cURL

### 1. Đăng ký user mới

```bash
curl -X POST http://localhost:8080/api/auth/signup ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"testuser\",\"email\":\"test@test.com\",\"password\":\"Test123\",\"fullName\":\"Test User\"}"
```

**Response:**

```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@test.com"
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:8080/api/auth/login ^
  -H "Content-Type: application/json" ^
  -c cookies.txt ^
  -d "{\"email\":\"test@test.com\",\"password\":\"Test123\"}"
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "username": "testuser" }
}
```

### 3. Tạo post

```bash
curl -X POST http://localhost:8080/graphql ^
  -H "Content-Type: application/json" ^
  -b cookies.txt ^
  -d "{\"query\":\"mutation { createPost(input: { content: \\\"Hello Microservices!\\\", postType: \\\"TEXT\\\" }) { success message post { id content createdAt } } }\"}"
```

**Response:**

```json
{
  "data": {
    "createPost": {
      "success": true,
      "message": "Post created successfully",
      "post": {
        "id": 1,
        "content": "Hello Microservices!",
        "createdAt": "2025-01-15T10:30:00Z"
      }
    }
  }
}
```

### 4. Lấy news feed

```bash
curl -X POST http://localhost:8080/graphql ^
  -H "Content-Type: application/json" ^
  -b cookies.txt ^
  -d "{\"query\":\"query { getNewsFeed(limit: 10) { posts { id content user { username } createdAt } hasMore } }\"}"
```

### 5. Tạo comment

```bash
curl -X POST http://localhost:8080/graphql ^
  -H "Content-Type: application/json" ^
  -b cookies.txt ^
  -d "{\"query\":\"mutation { createComment(input: { postId: 1, content: \\\"Nice post!\\\" }) { success comment { id content } } }\"}"
```

### 6. Test real-time SSE

**Mở browser và vào console:**

```javascript
// Connect to SSE
const eventSource = new EventSource(
  "http://localhost:8080/api/sse/comments/1",
  {
    withCredentials: true,
  }
);

// Listen for events
eventSource.onmessage = (event) => {
  console.log("📨 Received:", JSON.parse(event.data));
};

// Bây giờ tạo comment từ cURL ở trên
// Console sẽ hiển thị real-time event!
```

---

## 🖼️ Test Media Upload

### Upload image (cần file image)

```bash
curl -X POST http://localhost:8080/api/media/upload/image ^
  -b cookies.txt ^
  -F "image=@C:\path\to\your\image.jpg"
```

**Response:**

```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "id": 1,
    "url": "https://res.cloudinary.com/...jpg",
    "width": 1200,
    "height": 800
  }
}
```

---

## 📊 RabbitMQ Management UI

1. Mở browser: http://localhost:15673
2. Login:

   - Username: `admin`
   - Password: `admin`

3. Click **Exchanges** → Xem exchange `posts`
4. Click **Queues** → Xem các queues đang active
5. Test publish message:
   - Vào exchange `posts`
   - Routing key: `post.created`
   - Payload: `{"test": "message"}`

---

## 🐛 Troubleshooting

### Services không start

```bash
# Check logs
docker-compose logs -f

# Thường do:
# 1. Port đã bị sử dụng (8080, 3001-3004, 5432, 6379, 5672)
# 2. Docker không đủ RAM (cần ít nhất 4GB)
```

### Database connection error

```bash
# Check PostgreSQL containers
docker-compose ps | findstr postgres

# Nếu không chạy, restart
docker-compose restart postgres-auth postgres-post postgres-comment
```

### Redis connection failed

```bash
# Check Redis
docker-compose ps | findstr redis

# Test Redis
docker exec -it redis redis-cli ping
# Should return: PONG
```

### JWT token invalid

```bash
# Kiểm tra JWT_SECRET giống nhau trong:
# - api-gateway/.env
# - auth-service/.env

# Nếu khác, sửa lại và restart:
docker-compose restart api-gateway auth-service
```

---

## 🔍 Monitoring

### Check service health

```bash
# PowerShell script
$services = @("auth", "posts", "comments", "media")
foreach ($service in $services) {
  $response = Invoke-WebRequest "http://localhost:8080/api/$service/health"
  Write-Host "$service : $($response.Content)"
}
```

### View logs real-time

```bash
# Tất cả services
docker-compose logs -f

# Chỉ 1 service
docker-compose logs -f comment-service

# Grep specific errors
docker-compose logs | findstr ERROR
docker-compose logs | findstr "Failed to"
```

---

## 🎓 Học thêm

### Kiến trúc Microservices

- 📖 Đọc [README.md](./README.md) - Overview kiến trúc
- 📖 Đọc [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) - Chi tiết implementation

### API Documentation

- 📖 Đọc [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Đầy đủ API reference
- 🔗 Test GraphQL: http://localhost:8080/graphql (Apollo Sandbox)

### Deployment

- 📖 Đọc [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
- 📖 Đọc [GETTING_STARTED.md](./GETTING_STARTED.md) - Chi tiết setup

---

## 📝 Summary - Services & Ports

| Service         | Port  | Technology          | Purpose                    |
| --------------- | ----- | ------------------- | -------------------------- |
| API Gateway     | 8080  | Express             | Entry point, auth, routing |
| Auth Service    | 3001  | Express, Prisma     | User authentication        |
| Post Service    | 3002  | Apollo GraphQL      | Posts, news feed           |
| Comment Service | 3004  | GraphQL, SSE, Redis | Comments, real-time        |
| Media Service   | 3003  | Express, Cloudinary | Image/video upload         |
| PostgreSQL Auth | 5433  | PostgreSQL 14       | User data                  |
| PostgreSQL Post | 5434  | PostgreSQL 14       | Posts, media metadata      |
| PostgreSQL Comm | 5435  | PostgreSQL 14       | Comments                   |
| Redis           | 6379  | Redis 7             | Pub/Sub for SSE            |
| RabbitMQ        | 5672  | RabbitMQ 3          | Event bus                  |
| RabbitMQ UI     | 15673 | RabbitMQ Management | Monitoring                 |

---

## ✅ Checklist khi chạy lần đầu

- [ ] Docker và Docker Compose đã cài
- [ ] Copy tất cả .env.example → .env
- [ ] Sửa JWT_SECRET và SERVICE_SECRET (dùng openssl rand -base64 32)
- [ ] (Optional) Configure Cloudinary credentials nếu test upload
- [ ] Run `docker-compose up -d`
- [ ] Đợi 30-60s để services khởi động
- [ ] Test health endpoints
- [ ] Test signup → login → create post → create comment
- [ ] Test SSE trong browser console

---

## 🎉 Thành công!

Nếu tất cả health checks pass → Bạn đã có **production-ready microservices architecture**!

**Next steps:**

1. Đọc API Documentation để hiểu đầy đủ các endpoints
2. Test real-time SSE
3. Thử scale comment-service: `docker-compose up -d --scale comment-service=3`
4. Xem RabbitMQ Management UI
5. Deploy lên production (xem DEPLOYMENT.md)

---

**Happy coding! 🚀**
