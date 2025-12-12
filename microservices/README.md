# 🏗️ NewFeed Microservices Architecture

> Social media platform built with **microservices architecture** using Node.js, Express, GraphQL, Prisma, Redis, RabbitMQ, and Docker.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-blue.svg)](https://expressjs.com/)
[![GraphQL](https://img.shields.io/badge/GraphQL-Apollo-purple.svg)](https://www.apollographql.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://www.docker.com/)

---

## 📋 Tổng quan

NewFeed là nền tảng mạng xã hội với kiến trúc microservices hoàn chỉnh, bao gồm:

- ✅ **Authentication** - JWT với httpOnly cookies
- ✅ **Posts** - CRUD với GraphQL, cursor pagination
- ✅ **Comments** - Real-time qua Server-Sent Events
- ✅ **Media Upload** - Cloudinary với tối ưu hình ảnh
- ✅ **Horizontal Scaling** - Redis Pub/Sub cho SSE
- ✅ **Event-Driven** - RabbitMQ cho async communication
- ✅ **Database per Service** - PostgreSQL riêng cho mỗi service
- ✅ **API Gateway** - Single entry point với rate limiting

---

## 🏗️ Kiến trúc

```
┌─────────────┐
│   Client    │ (Web/Mobile)
└──────┬──────┘
       │
       ▼
┌────────────────────┐
│   API Gateway      │ :8080
│ ├─ JWT Auth        │
│ ├─ Rate Limiting   │
│ └─ Proxy Routing   │
└─────────┬──────────┘
          │
    ┌─────┴───────────┬──────────┬──────────┐
    ▼                 ▼          ▼          ▼
┌─────────┐     ┌─────────┐ ┌─────────┐ ┌─────────┐
│  Auth   │     │  Post   │ │Comment  │ │ Media   │
│ Service │     │ Service │ │ Service │ │ Service │
│  :3001  │     │  :3002  │ │  :3004  │ │  :3003  │
└────┬────┘     └────┬────┘ └────┬────┘ └────┬────┘
     │               │           │           │
     ▼               ▼           ▼           ▼
[PostgreSQL]   [PostgreSQL] [PostgreSQL]  [PG]
  auth_db         post_db    comment_db   post_db
                     │           │
                     ▼           ▼
                [RabbitMQ]   [Redis Pub/Sub]
```

---

## 📂 Cấu trúc dự án

```
microservices/
├── api-gateway/              # API Gateway (Port 8080)
│   ├── src/
│   │   ├── app.js           # Main Express server
│   │   └── middleware/       # Auth & rate limiting
│   ├── Dockerfile
│   └── package.json
│
├── auth-service/             # Authentication (Port 3001)
│   ├── src/
│   │   ├── app.js
│   │   ├── controllers/      # Auth logic
│   │   └── routes/
│   ├── prisma/schema.prisma
│   └── Dockerfile
│
├── post-service/             # Posts & News Feed (Port 3002)
│   ├── src/
│   │   ├── app.js
│   │   ├── graphql/          # Schema & resolvers
│   │   └── services/         # Event publisher
│   ├── prisma/schema.prisma
│   └── Dockerfile
│
├── comment-service/          # Comments & SSE (Port 3004)
│   ├── src/
│   │   ├── app.js
│   │   ├── graphql/
│   │   ├── routes/           # SSE endpoints
│   │   ├── services/         # SSE service, event listener
│   │   └── config/redis.js
│   ├── prisma/schema.prisma
│   └── Dockerfile
│
├── media-service/            # Media Upload (Port 3003)
│   ├── src/
│   │   ├── app.js
│   │   ├── routes/
│   │   ├── services/         # Cloudinary
│   │   └── config/
│   ├── prisma/schema.prisma
│   └── Dockerfile
│
├── shared/                   # Shared utilities
│   ├── middleware/
│   │   └── serviceAuth.js    # Service-to-service auth
│   ├── utils/
│   │   └── logger.js         # Winston logger
│   └── index.js
│
├── docker-compose.yml        # Production orchestration
├── install-all.sh/bat        # Install dependencies
├── migrate-all.sh/bat        # Run migrations
├── start.sh/bat              # Start all services
├── GETTING_STARTED.md        # Setup guide
├── API_DOCUMENTATION.md      # API reference
├── DEPLOYMENT.md             # Production deployment
└── README.md                 # This file
```

---

## 🚀 Quick Start

### Prerequisites

**Option 1: Docker (Recommended)**

- Docker 20+
- Docker Compose 2+

**Option 2: Local Development**

- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- RabbitMQ 3+

### Khởi động với Docker

```bash
# 1. Clone repository
git clone <repo-url>
cd microservices

# 2. Copy environment files
cp .env.example .env
for service in api-gateway auth-service post-service comment-service media-service; do
  cp $service/.env.example $service/.env
done

# 3. Configure secrets (JWT_SECRET, SERVICE_SECRET, Cloudinary)
nano .env

# 4. Start all services
docker-compose up -d

# 5. Check health
curl http://localhost:8080/api/auth/health
curl http://localhost:8080/api/posts/health
curl http://localhost:8080/api/comments/health
curl http://localhost:8080/api/media/health

# 6. View logs
docker-compose logs -f
```

**Services running at:**

- **API Gateway:** http://localhost:8080
- **RabbitMQ Management:** http://localhost:15673 (admin/admin)

### Khởi động Local Development

```bash
# 1. Install all dependencies
./install-all.sh  # or install-all.bat on Windows

# 2. Configure .env files với localhost URLs

# 3. Run migrations
./migrate-all.sh  # or migrate-all.bat on Windows

# 4. Start services (in separate terminals)
cd api-gateway && npm run dev
cd auth-service && npm run dev
cd post-service && npm run dev
cd comment-service && npm run dev
cd media-service && npm run dev
```

---

## 📡 Services Overview

| Service         | Port  | Endpoint                  | Technology           |
| --------------- | ----- | ------------------------- | -------------------- |
| API Gateway     | 8080  | http://localhost:8080     | Express, JWT         |
| Auth Service    | 3001  | http://localhost:3001     | Express, Prisma      |
| Post Service    | 3002  | http://localhost:3002     | Apollo GraphQL       |
| Comment Service | 3004  | http://localhost:3004     | GraphQL, Redis, SSE  |
| Media Service   | 3003  | http://localhost:3003     | Express, Cloudinary  |
| PostgreSQL      | 5432  | postgres://localhost:5432 | 3 separate databases |
| Redis           | 6379  | redis://localhost:6379    | Pub/Sub for SSE      |
| RabbitMQ        | 5672  | amqp://localhost:5672     | Event bus            |
| RabbitMQ UI     | 15673 | http://localhost:15673    | Management console   |

---

## 🔧 API Examples

### 1. Authentication

```bash
# Register
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@test.com","password":"Test123","fullName":"John Doe"}'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"john@test.com","password":"Test123"}'

# Get current user
curl http://localhost:8080/api/auth/me -b cookies.txt
```

### 2. Create Post (GraphQL)

```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"query":"mutation { createPost(input: { content: \"Hello World\", postType: \"TEXT\" }) { success post { id content } } }"}'
```

### 3. Upload Image

```bash
curl -X POST http://localhost:8080/api/media/upload/image \
  -b cookies.txt \
  -F "image=@/path/to/photo.jpg"
```

### 4. Real-time Comments (SSE)

```javascript
const eventSource = new EventSource(
  "http://localhost:8080/api/sse/comments/1",
  {
    withCredentials: true,
  }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.eventType === "comment_added") {
    console.log("New comment:", data.data);
  }
};
```

---

## 🔄 Communication Patterns

### 1. Synchronous (REST/GraphQL)

- **API Gateway** → Auth Service: Get user info
- **Post Service** → Auth Service: Fetch user details
- **Client** → API Gateway → Services

### 2. Asynchronous (RabbitMQ)

- **Post Service** publishes `post.deleted` event
- **Comment Service** subscribes và cascade delete comments

### 3. Real-time (Redis Pub/Sub)

- **Comment Service** publishes events to Redis
- Tất cả instances subscribe và broadcast qua SSE
- Horizontal scaling: Clients connect to bất kỳ server nào

---

## 📚 Documentation

- **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Chi tiết setup và configuration
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Đầy đủ API reference với examples
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide (Docker, Kubernetes)

---

## 🧪 Testing

```bash
# Health checks
curl http://localhost:8080/api/auth/health
curl http://localhost:8080/api/posts/health
curl http://localhost:8080/api/comments/health
curl http://localhost:8080/api/media/health

# Load testing với k6
k6 run load-test.js
```

---

## 📊 Monitoring

- **Service Health:** http://localhost:8080/api/\*/health
- **RabbitMQ Management:** http://localhost:15673
- **Logs:** `docker-compose logs -f <service-name>`

---

## 🔐 Security Features

- **JWT Authentication** với httpOnly cookies
- **Rate Limiting** - 100 req/15min per IP
- **Service-to-Service Auth** - X-Service-Token header
- **Password Hashing** - bcrypt
- **CORS** configured per service
- **Input Validation** on all endpoints

---

## 📈 Scaling Strategy

### Horizontal Scaling

- **API Gateway:** 3+ instances với load balancer
- **Comment Service:** 3+ instances (SSE high traffic)
- **Post Service:** 2+ instances
- **Auth Service:** 2+ instances

### Database Scaling

- **Read Replicas** cho heavy read operations
- **Connection Pooling** với Prisma
- **Database per Service** pattern

### Caching

- **Redis** cho SSE Pub/Sub
- Có thể thêm Redis cache cho frequently accessed data

---

## 🛠️ Tech Stack

**Backend:**

- Node.js 18 + ES Modules
- Express.js 4.18
- Apollo Server Express 3.13
- Prisma ORM 7.1

**Databases:**

- PostgreSQL 14 (3 databases)
- Redis 7 (Pub/Sub)

**Message Queue:**

- RabbitMQ 3 (Event-driven)

**Media Storage:**

- Cloudinary

**DevOps:**

- Docker & Docker Compose
- Kubernetes (optional)

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 👥 Authors

**NewFeed Team**

- Architecture design
- Microservices implementation
- Real-time features

---

## 🙏 Acknowledgments

- **Apollo GraphQL** - Excellent GraphQL server
- **Prisma** - Modern ORM for Node.js
- **RabbitMQ** - Reliable message broker
- **Cloudinary** - Media management platform

---

**Built with ❤️ using Node.js, Express, GraphQL, Prisma, Redis, RabbitMQ, and Docker**

**Star ⭐ this repo if you find it helpful!**

## 📊 Infrastructure

- **Database**: PostgreSQL per service
- **Cache**: Redis
- **Message Queue**: RabbitMQ
- **Service Discovery**: Consul (optional)

## 🛠️ Tech Stack

- Node.js + Express
- Prisma ORM
- Apollo GraphQL
- Redis
- RabbitMQ
- Docker

## 📝 Migration từ Monolith

Source code monolith gốc vẫn được giữ tại root folder. Microservices là implementation mới độc lập.
