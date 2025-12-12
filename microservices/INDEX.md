# 📚 NewFeed Microservices - Documentation Index

## 🎯 Bắt đầu nhanh

### Cho người mới

1. **[QUICK_START_VI.md](./QUICK_START_VI.md)** ⭐

   - Hướng dẫn chạy nhanh trong 5 phút (Tiếng Việt)
   - Test API với cURL
   - Troubleshooting

2. **[README.md](./README.md)**
   - Tổng quan kiến trúc microservices
   - Tech stack
   - Quick start commands

### Cho developers

3. **[GETTING_STARTED.md](./GETTING_STARTED.md)**
   - Chi tiết setup từ A-Z
   - Local development vs Docker
   - Database migrations
   - Environment configuration

## 📖 Documentation

### API Reference

4. **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** ⭐
   - Đầy đủ API endpoints
   - Request/Response examples
   - Authentication flow
   - GraphQL queries & mutations
   - SSE real-time events
   - Testing với cURL

### Implementation Details

5. **[IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)** ⭐
   - Tổng kết toàn bộ implementation
   - 73 files đã tạo
   - Communication patterns chi tiết
   - Architecture decisions
   - Key learnings

### Production Deployment

6. **[DEPLOYMENT.md](./DEPLOYMENT.md)**
   - Production checklist
   - Docker deployment
   - Kubernetes manifests
   - Monitoring & logging
   - Backup & recovery
   - Security best practices

## 🏗️ Kiến trúc

### Services Overview

```
Client → API Gateway (8080) → Microservices
                              ├─ Auth Service (3001)
                              ├─ Post Service (3002)
                              ├─ Comment Service (3004)
                              └─ Media Service (3003)
```

### Communication Patterns

1. **Synchronous (REST)**

   - API Gateway → Services
   - Service → Service (internal)

2. **Asynchronous (RabbitMQ)**

   - Post Service → Event Bus
   - Comment Service subscribes

3. **Real-time (Redis Pub/Sub + SSE)**
   - Comment Service → Redis
   - All instances broadcast to clients

## 🔧 Services Detail

### 1. API Gateway (Port 8080)

**Purpose:** Single entry point, authentication, routing

**Key Files:**

- `api-gateway/src/app.js` - Main server
- `api-gateway/src/middleware/auth.js` - JWT validation
- `api-gateway/src/middleware/rateLimiter.js` - Rate limiting

**Endpoints:**

- `/api/auth/*` → Auth Service
- `/api/posts/*` → Post Service (GraphQL)
- `/api/comments/*` → Comment Service
- `/api/sse/*` → Comment Service (SSE)
- `/api/media/*` → Media Service

**Features:**

- JWT authentication
- Rate limiting (100 req/15min)
- Request routing
- User context headers

---

### 2. Auth Service (Port 3001)

**Purpose:** User authentication and management

**Database:** `auth_db` (PostgreSQL)

**Key Files:**

- `auth-service/src/controllers/authController.js` - Auth logic
- `auth-service/prisma/schema.prisma` - User model

**API:**

- `POST /api/signup` - Register
- `POST /api/login` - Login with JWT
- `GET /api/me` - Current user
- `GET /api/internal/users/:id` - Internal lookup

**Features:**

- bcrypt password hashing
- JWT token generation
- httpOnly cookies
- Service-to-service API

---

### 3. Post Service (Port 3002)

**Purpose:** Posts and news feed

**Database:** `post_db` (PostgreSQL)

**Key Files:**

- `post-service/src/graphql/schema.js` - GraphQL schema
- `post-service/src/graphql/resolvers.js` - Queries & mutations
- `post-service/src/services/eventPublisher.js` - RabbitMQ

**GraphQL:**

```graphql
query getNewsFeed(limit: Int, cursor: Int)
query getPost(id: Int!)
mutation createPost(input: CreatePostInput!)
mutation deletePost(id: Int!)
```

**Post Types:** TEXT, IMAGE, VIDEO, LINK

**Features:**

- Cursor pagination
- User data fetching
- RabbitMQ events

---

### 4. Comment Service (Port 3004) ⭐

**Purpose:** Comments and real-time updates

**Database:** `comment_db` (PostgreSQL)

**Key Files:**

- `comment-service/src/services/sseService.js` - **SSE + Redis Pub/Sub**
- `comment-service/src/services/eventListener.js` - RabbitMQ subscriber
- `comment-service/src/config/redis.js` - Redis client

**GraphQL:**

```graphql
mutation createComment(input: CreateCommentInput!)
mutation deleteComment(id: Int!)
query getComments(postId: Int!, limit: Int)
```

**SSE:**

- `GET /api/sse/comments/:postId` - Real-time stream

**Features:**

- Nested comments (replies)
- Real-time SSE with Redis Pub/Sub
- Horizontal scaling support
- RabbitMQ subscriber (cascade delete)

**Real-time Flow:**

1. Client connects to SSE
2. Comment created → Publish to Redis
3. All instances receive event
4. Broadcast to local clients
5. ✅ Works across multiple servers!

---

### 5. Media Service (Port 3003)

**Purpose:** Media upload and management

**Database:** `post_db` (shared with Post Service)

**Key Files:**

- `media-service/src/services/cloudinaryService.js` - Upload logic
- `media-service/src/config/cloudinary.js` - Cloudinary config

**API:**

- `POST /api/media/upload/image` - Single image
- `POST /api/media/upload/video` - Single video
- `POST /api/media/upload/images` - Multiple images
- `DELETE /api/media/:id` - Delete

**Features:**

- Cloudinary integration
- Image optimization (1200x1200)
- Video upload
- Metadata storage

---

### 6. Shared Library

**Purpose:** Common utilities

**Exports:**

- `authenticateService` - Service auth middleware
- `logger` - Winston logger

**Usage:**

```javascript
import { authenticateService, logger } from "../shared/index.js";

// Protect internal endpoints
app.get("/internal/users/:id", authenticateService, handler);

// Logging
logger.info("Service started", { port: 3001 });
```

---

## 📊 Infrastructure

### Databases (PostgreSQL)

- **auth_db** (Port 5433) - Users
- **post_db** (Port 5434) - Posts, media
- **comment_db** (Port 5435) - Comments

### Message Queue (RabbitMQ)

- **Port 5672** - AMQP
- **Port 15673** - Management UI
- **Exchange:** `posts` (topic)
- **Events:** `post.created`, `post.deleted`

### Cache/Pub-Sub (Redis)

- **Port 6379**
- **Channel:** `comment-events`
- **Purpose:** Real-time SSE across instances

---

## 🎓 Learning Path

### Level 1: Beginner

1. Đọc [QUICK_START_VI.md](./QUICK_START_VI.md)
2. Chạy `docker-compose up -d`
3. Test basic APIs (signup, login, create post)
4. Xem logs: `docker-compose logs -f`

### Level 2: Intermediate

1. Đọc [README.md](./README.md) - Hiểu kiến trúc
2. Đọc [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
3. Test tất cả endpoints
4. Test real-time SSE
5. Xem RabbitMQ Management UI

### Level 3: Advanced

1. Đọc [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)
2. Hiểu communication patterns
3. Đọc source code từng service
4. Test horizontal scaling: `docker-compose up -d --scale comment-service=3`
5. Đọc [DEPLOYMENT.md](./DEPLOYMENT.md) cho production

### Level 4: Expert

1. Modify và extend services
2. Add new features
3. Implement monitoring (Prometheus/Grafana)
4. Deploy lên Kubernetes
5. Optimize performance

---

## 🔍 Common Tasks

### Run the project

```bash
docker-compose up -d
```

### View logs

```bash
docker-compose logs -f
docker-compose logs -f comment-service
```

### Stop services

```bash
docker-compose down
```

### Scale a service

```bash
docker-compose up -d --scale comment-service=3
```

### Run migrations

```bash
# All services
./migrate-all.sh  # or .bat on Windows

# Single service
cd auth-service
npx prisma migrate dev
```

### Install dependencies

```bash
./install-all.sh  # or .bat on Windows
```

### Check health

```bash
curl http://localhost:8080/api/auth/health
curl http://localhost:8080/api/posts/health
curl http://localhost:8080/api/comments/health
curl http://localhost:8080/api/media/health
```

---

## 🐛 Troubleshooting Guide

### Service won't start

1. Check logs: `docker-compose logs -f <service>`
2. Check port conflicts
3. Check .env configuration
4. Restart: `docker-compose restart <service>`

### Database connection error

1. Check PostgreSQL containers: `docker-compose ps | grep postgres`
2. Check DATABASE_URL in .env
3. Test connection: `docker exec -it postgres-auth psql -U admin -d auth_db`

### Redis connection failed

1. Check Redis: `docker-compose ps | grep redis`
2. Test: `docker exec -it redis redis-cli ping`
3. Check REDIS_HOST in .env

### RabbitMQ not working

1. Check RabbitMQ: `docker-compose ps | grep rabbitmq`
2. View UI: http://localhost:15673
3. Check RABBITMQ_URL in .env

### JWT token invalid

1. Check JWT_SECRET same in api-gateway và auth-service
2. Restart: `docker-compose restart api-gateway auth-service`

---

## 📈 Performance Tips

### Scaling

- Scale Comment Service for SSE: `--scale comment-service=5`
- Scale API Gateway for high traffic: `--scale api-gateway=3`

### Caching

- Add Redis cache for frequently accessed data
- Cache user lookups in Post/Comment services

### Database

- Add indexes for slow queries
- Use read replicas for heavy reads
- Connection pooling (Prisma default)

### Monitoring

- Add Prometheus metrics
- Set up Grafana dashboards
- ELK stack for logging

---

## 🔐 Security Checklist

- [ ] Change all default secrets
- [ ] Use HTTPS in production
- [ ] Enable rate limiting
- [ ] Regular security updates
- [ ] Database backups
- [ ] Monitor for attacks
- [ ] Rotate credentials regularly

---

## 📝 File Structure Summary

```
microservices/
├── api-gateway/          # 9 files
├── auth-service/         # 10 files
├── post-service/         # 11 files
├── comment-service/      # 15 files ⭐ Most complex
├── media-service/        # 10 files
├── shared/               # 4 files
├── docker-compose.yml    # Orchestration
├── install-all.sh/bat    # Install script
├── migrate-all.sh/bat    # Migration script
├── start.sh/bat          # Start script
├── README.md             # Main doc
├── GETTING_STARTED.md    # Setup guide
├── API_DOCUMENTATION.md  # API reference
├── DEPLOYMENT.md         # Production guide
├── IMPLEMENTATION_COMPLETE.md  # Summary
├── QUICK_START_VI.md     # Quick guide (Vietnamese)
└── INDEX.md             # This file

Total: 73+ files
```

---

## 🎯 Quick Links

### Essential Reading

- ⭐ [Quick Start (5 phút)](./QUICK_START_VI.md)
- ⭐ [API Documentation](./API_DOCUMENTATION.md)
- ⭐ [Implementation Summary](./IMPLEMENTATION_COMPLETE.md)

### Deep Dive

- [Full Setup Guide](./GETTING_STARTED.md)
- [Production Deployment](./DEPLOYMENT.md)

### Management

- RabbitMQ UI: http://localhost:15673 (admin/admin)
- GraphQL Playground: http://localhost:8080/graphql
- Health Checks: http://localhost:8080/api/\*/health

---

## ✅ Success Metrics

### Development

- [ ] All services start successfully
- [ ] All health checks pass
- [ ] Can signup, login, create post
- [ ] Can create comment
- [ ] SSE works in browser
- [ ] Media upload works

### Production

- [ ] Docker images built
- [ ] Services deployed
- [ ] Monitoring active
- [ ] Backups configured
- [ ] SSL/TLS enabled
- [ ] Rate limiting working

---

## 🚀 What's Next?

1. **Run the project** - [QUICK_START_VI.md](./QUICK_START_VI.md)
2. **Test APIs** - [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
3. **Understand architecture** - [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)
4. **Deploy to production** - [DEPLOYMENT.md](./DEPLOYMENT.md)
5. **Contribute** - Add new features!

---

**Built with ❤️ - NewFeed Microservices Platform**

**Questions? Check the docs above or open an issue!**
