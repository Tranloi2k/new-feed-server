import redisClient from "../config/redis.js";

const connections = new Map();

let redisPublisher = null;
let redisSubscriber = null;

export async function initRedisSubscriber() {
  const { publisher, subscriber } = await redisClient.connect();
  redisPublisher = publisher;
  redisSubscriber = subscriber;

  redisSubscriber.subscribe("comment-events", (err) => {
    if (err) {
      console.error("Failed to subscribe:", err);
    } else {
      console.log("✅ Subscribed to comment-events channel");
    }
  });

  redisSubscriber.on("message", (channel, message) => {
    if (channel === "comment-events") {
      try {
        const event = JSON.parse(message);
        broadcastToLocalClients(event.postId, event);
      } catch (error) {
        console.error("Error processing Redis message:", error);
      }
    }
  });
}

export function addConnection(postId, res) {
  if (!connections.has(postId)) {
    connections.set(postId, new Set());
  }
  connections.get(postId).add(res);

  console.log(
    `➕ Client connected to post ${postId} (${
      connections.get(postId).size
    } total)`
  );

  res.on("close", () => {
    const clients = connections.get(postId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        connections.delete(postId);
      }
      console.log(`➖ Client disconnected from post ${postId}`);
    }
  });
}

export async function publishCommentEvent(postId, eventType, data) {
  const event = {
    postId,
    eventType,
    data,
    timestamp: new Date().toISOString(),
  };

  if (redisPublisher) {
    await redisPublisher.publish("comment-events", JSON.stringify(event));
  } else {
    // Fallback to local broadcast
    broadcastToLocalClients(postId, event);
  }
}

function broadcastToLocalClients(postId, event) {
  const clients = connections.get(postId);
  if (!clients || clients.size === 0) return;

  const data = `data: ${JSON.stringify(event)}\n\n`;

  clients.forEach((client) => {
    try {
      client.write(data);
    } catch (error) {
      console.error("Error sending SSE to client:", error);
      clients.delete(client);
    }
  });
}
