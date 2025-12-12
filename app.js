import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";
import authRoutes from "./routes/authRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import sseRoutes from "./routes/sseRoutes.js";
import { ApolloServer } from "apollo-server-express";
import typeDefs from "./graphql/schema.js";
import resolvers from "./graphql/resolvers.js";
import jwt from "jsonwebtoken";
import redisClient from "./config/redis.js";
import { graphqlRateLimiter } from "./middleware/graphqlRateLimiter.js";

const app = express();

async function initializeRedis() {
  try {
    await redisClient.connect();
    console.log("Redis connection initialized");
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    process.exit(1);
  }
}
// Khởi tạo ApolloServer cho GraphQL
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // Ưu tiên lấy token từ cookie trước, sau đó mới đến Authorization header
    const token = req.cookies.access_token;

    // Xác thực token và thêm user vào context
    if (token) {
      try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        return { user };
      } catch (error) {
        console.log("Invalid token in GraphQL context");
      }
    }

    return {};
  },
});

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Tích hợp GraphQL endpoint và start server
async function startServer() {
  await initializeRedis();

  // Start Apollo Server trước
  await apolloServer.start();

  app.use("/graphql", graphqlRateLimiter);

  apolloServer.applyMiddleware({
    app,
    path: "/graphql",
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },
  });

  // Swagger Documentation
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Routes
  app.use("/api", authRoutes);
  app.use("/api/media", uploadRoutes);
  app.use("/api/sse", sseRoutes);

  // Root route
  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "New Feed Server API",
      version: "1.0.0",
      documentation: `http://localhost:${process.env.PORT || 3000}/api-docs`,
      endpoints: {
        auth: {
          signup: "POST /api/signup",
          login: "POST /api/login",
          logout: "POST /api/logout",
          getCurrentUser: "GET /api/me",
        },
        media: {
          upload: "POST /api/media/upload",
        },
        graphql: "POST /graphql",
      },
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: "Route không tồn tại",
    });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  });

  // Start server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📝 Môi trường: ${process.env.NODE_ENV || "development"}`);
    console.log(
      `🔗 GraphQL endpoint: http://localhost:${PORT}${apolloServer.graphqlPath}`
    );
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
