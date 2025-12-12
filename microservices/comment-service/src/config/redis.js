import Redis from "ioredis";

class RedisClient {
  constructor() {
    this.publisher = null;
    this.subscriber = null;
  }

  async connect() {
    if (this.publisher && this.subscriber) {
      return { publisher: this.publisher, subscriber: this.subscriber };
    }

    // Support both REDIS_URL and separate REDIS_HOST/PORT
    let config;
    if (process.env.REDIS_URL) {
      // Use Redis URL (for Docker: redis://redis:6379)
      config = {
        ...this.parseRedisUrl(process.env.REDIS_URL),
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      };
    } else {
      // Fallback to separate host/port (for local dev)
      config = {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      };
    }

    console.log(`🔗 Connecting to Redis at ${config.host}:${config.port}`);

    try {
      this.publisher = new Redis(config);
      this.subscriber = new Redis(config);

      this.publisher.on("error", (err) =>
        console.error("Redis Publisher Error:", err)
      );
      this.subscriber.on("error", (err) =>
        console.error("Redis Subscriber Error:", err)
      );

      console.log("✅ Redis connected (Publisher & Subscriber)");
      return { publisher: this.publisher, subscriber: this.subscriber };
    } catch (error) {
      console.error("❌ Redis connection failed:", error);
      throw error;
    }
  }

  async disconnect() {
    if (this.publisher) await this.publisher.quit();
    if (this.subscriber) await this.subscriber.quit();
    console.log("Redis disconnected");
  }

  parseRedisUrl(url) {
    // Parse redis://host:port or redis://:password@host:port
    const match = url.match(/redis:\/\/(?::(.+)@)?([^:]+):(\d+)/);
    if (match) {
      return {
        host: match[2],
        port: parseInt(match[3]),
        password: match[1] || undefined,
      };
    }
    // Fallback
    return {
      host: "localhost",
      port: 6379,
    };
  }
}

const redisClient = new RedisClient();
export default redisClient;
