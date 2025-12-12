import "dotenv/config";
import express from "express";
import cors from "cors";
import { ApolloServer } from "apollo-server-express";
import typeDefs from "./graphql/schema.js";
import resolvers from "./graphql/resolvers.js";
import sseRoutes from "./routes/sseRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import { initRedisSubscriber } from "./services/sseService.js";
import { initEventListener } from "./services/eventListener.js";

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/sse", sseRoutes);
app.use("/api/comments", commentRoutes);

// Apollo Server
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // User info from API Gateway headers
    const userId = req.headers["x-user-id"];
    const userEmail = req.headers["x-user-email"];

    return {
      user: userId
        ? {
            userId: parseInt(userId),
            email: userEmail,
          }
        : null,
    };
  },
});

async function startServer() {
  await apolloServer.start();

  apolloServer.applyMiddleware({
    app,
    path: "/graphql",
    cors: false,
  });

  // Initialize Redis subscriber for SSE
  await initRedisSubscriber();

  // Initialize RabbitMQ event listener
  await initEventListener();

  // Health check
  app.get("/health", (req, res) => {
    res.json({
      success: true,
      service: "comment-service",
      timestamp: new Date().toISOString(),
    });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error("Comment service error:", err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  });

  const PORT = process.env.PORT || 3004;
  app.listen(PORT, () => {
    console.log(`💬 Comment Service running on port ${PORT}`);
    console.log(
      `🔗 GraphQL endpoint: http://localhost:${PORT}${apolloServer.graphqlPath}`
    );
  });
}

startServer().catch((error) => {
  console.error("Failed to start Comment Service:", error);
  process.exit(1);
});
