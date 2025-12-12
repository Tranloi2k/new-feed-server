import express from "express";
import { addConnection } from "../services/sseService.js";

const router = express.Router();

router.get("/comments/:postId", (req, res) => {
  const { postId } = req.params;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Send initial connection message
  res.write(
    `data: ${JSON.stringify({
      type: "connected",
      postId: parseInt(postId),
    })}\n\n`
  );

  // Add connection to the pool
  addConnection(parseInt(postId), res);

  // Keep connection alive
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
  });
});

export default router;
