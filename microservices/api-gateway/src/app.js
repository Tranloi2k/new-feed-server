import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import { createProxyMiddleware } from "http-proxy-middleware";
import { authenticateToken } from "./middleware/auth.js";
import { rateLimiter } from "./middleware/rateLimiter.js";

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(cookieParser());

// Service URLs
const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || "http://localhost:3001",
  post: process.env.POST_SERVICE_URL || "http://localhost:3002",
  media: process.env.MEDIA_SERVICE_URL || "http://localhost:3003",
  comment: process.env.COMMENT_SERVICE_URL || "http://localhost:3004",
};

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "api-gateway",
    timestamp: new Date().toISOString(),
  });
});

// Auth routes (public) - parse body and restream
app.use(
  "/api/auth",
  rateLimiter,
  bodyParser.json(),
  createProxyMiddleware({
    target: SERVICES.auth,
    changeOrigin: true,
    pathRewrite: { "^/api/auth": "/api" },
    onProxyReq: (proxyReq, req) => {
      // Restream parsed body
      if (req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
        proxyReq.end();
      }
    },
  })
);

// Post routes (protected)
app.use(
  "/api/posts",
  authenticateToken,
  bodyParser.json(),
  createProxyMiddleware({
    target: SERVICES.post,
    changeOrigin: true,
    pathRewrite: { "^/api/posts": "/api/posts" },
    onProxyReq: (proxyReq, req) => {
      // Forward user info
      if (req.user) {
        proxyReq.setHeader("X-User-Id", req.user.userId);
        proxyReq.setHeader("X-User-Email", req.user.email);
      }
      // Restream body
      if (req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
        proxyReq.end();
      }
    },
  })
);

// Comment routes (protected)
app.use(
  "/api/comments",
  authenticateToken,
  bodyParser.json(),
  createProxyMiddleware({
    target: SERVICES.comment,
    changeOrigin: true,
    pathRewrite: { "^/api/comments": "/api/comments" },
    onProxyReq: (proxyReq, req) => {
      if (req.user) {
        proxyReq.setHeader("X-User-Id", req.user.userId);
      }
      // Restream body
      if (req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
        proxyReq.end();
      }
    },
  })
);

// SSE routes (protected) - special handling for streaming
app.use("/api/sse", authenticateToken, (req, res, next) => {
  createProxyMiddleware({
    target: SERVICES.comment,
    changeOrigin: true,
    pathRewrite: { "^/api/sse": "/api/sse" },
    onProxyReq: (proxyReq, req) => {
      if (req.user) {
        proxyReq.setHeader("X-User-Id", req.user.userId);
      }
    },
    // SSE specific options
    ws: false,
    onProxyRes: (proxyRes) => {
      proxyRes.headers["connection"] = "keep-alive";
    },
  })(req, res, next);
});

// Media routes (protected) - don't parse body (multipart/form-data)
app.use(
  "/api/media",
  authenticateToken,
  createProxyMiddleware({
    target: SERVICES.media,
    changeOrigin: true,
    pathRewrite: { "^/api/media": "/api/media" },
    onProxyReq: (proxyReq, req) => {
      if (req.user) {
        proxyReq.setHeader("X-User-Id", req.user.userId);
      }
    },
  })
);

// GraphQL routes (protected)
app.use(
  "/graphql",
  authenticateToken,
  bodyParser.json(),
  createProxyMiddleware({
    target: SERVICES.post, // GraphQL ở Post Service
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      if (req.user) {
        proxyReq.setHeader("X-User-Id", req.user.userId);
        proxyReq.setHeader("X-User-Email", req.user.email);
      }
      // Restream body for GraphQL
      if (req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
        proxyReq.end();
      }
    },
  })
);

// Root
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "NewFeed API Gateway",
    version: "1.0.0",
    services: {
      auth: `${SERVICES.auth}`,
      post: `${SERVICES.post}`,
      media: `${SERVICES.media}`,
      comment: `${SERVICES.comment}`,
    },
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Gateway error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📡 Services:`);
  console.log(`   - Auth: ${SERVICES.auth}`);
  console.log(`   - Post: ${SERVICES.post}`);
  console.log(`   - Media: ${SERVICES.media}`);
  console.log(`   - Comment: ${SERVICES.comment}`);
});
