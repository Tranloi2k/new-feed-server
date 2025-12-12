import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import sseService from "../services/sseService.js";

const router = express.Router();

/**
 * @swagger
 * /api/sse/comments/{postId}:
 *   get:
 *     summary: Subscribe to real-time comments for a post (SSE)
 *     tags: [SSE]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Post ID to subscribe to
 *     responses:
 *       200:
 *         description: SSE stream established
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized
 */
router.get("/comments/:postId", authenticateToken, (req, res) => {
  const postId = parseInt(req.params.postId);
  const userId = req.user.id;

  // Validate postId
  if (isNaN(postId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid post ID",
    });
  }

  // Set headers cho SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Gửi initial connection message
  res.write(
    `event: connected\ndata: ${JSON.stringify({
      message: "Connected to comment stream",
      postId,
      timestamp: new Date().toISOString(),
    })}\n\n`
  );

  // Thêm connection vào SSE service
  const connection = sseService.addConnection(postId, res, userId);

  // Gửi heartbeat mỗi 30 giây để giữ connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`:heartbeat ${Date.now()}\n\n`);
    } catch (error) {
      console.error("Heartbeat error:", error);
      clearInterval(heartbeatInterval);
    }
  }, 30000);

  // Cleanup khi client disconnect
  req.on("close", () => {
    clearInterval(heartbeatInterval);
    sseService.removeConnection(postId, connection);
    console.log(`Client ${userId} disconnected from post ${postId}`);
  });

  req.on("error", (error) => {
    console.error("SSE connection error:", error);
    clearInterval(heartbeatInterval);
    sseService.removeConnection(postId, connection);
  });
});

/**
 * @swagger
 * /api/sse/status:
 *   get:
 *     summary: Get SSE service status
 *     tags: [SSE]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: SSE service status
 */
router.get("/status", authenticateToken, (req, res) => {
  const activePostIds = sseService.getActivePostIds();
  const status = {
    success: true,
    data: {
      totalActivePosts: activePostIds.length,
      posts: activePostIds.map((postId) => ({
        postId,
        connections: sseService.getConnectionCount(postId),
      })),
    },
  };

  res.json(status);
});

export default router;
