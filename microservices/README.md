# 🏗️ NewFeed Microservices Architecture

## 📂 Cấu trúc thư mục

```
microservices/
├── api-gateway/          # API Gateway (Port 8080)
├── auth-service/         # Authentication Service (Port 3001)
├── post-service/         # Post Management Service (Port 3002)
├── media-service/        # Media Upload Service (Port 3003)
├── comment-service/      # Comment & Real-time Service (Port 3004)
├── shared/               # Shared libraries
└── docker-compose.yml    # Docker orchestration
```

## 🚀 Khởi động

### Development (Local)

```bash
# Khởi động từng service riêng
cd microservices/api-gateway && npm install && npm run dev
cd microservices/auth-service && npm install && npm run dev
cd microservices/post-service && npm install && npm run dev
cd microservices/comment-service && npm install && npm run dev
cd microservices/media-service && npm install && npm run dev
```

### Production (Docker)

```bash
cd microservices
docker-compose up -d
```

## 📡 Service Endpoints

| Service         | Port | Endpoint              |
| --------------- | ---- | --------------------- |
| API Gateway     | 8080 | http://localhost:8080 |
| Auth Service    | 3001 | http://localhost:3001 |
| Post Service    | 3002 | http://localhost:3002 |
| Media Service   | 3003 | http://localhost:3003 |
| Comment Service | 3004 | http://localhost:3004 |

## 🔄 Service Communication

- **Sync**: REST API (service-to-service)
- **Async**: RabbitMQ (event-driven)
- **Real-time**: Redis Pub/Sub (SSE)

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
