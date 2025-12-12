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

    const config = {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };

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
}

const redisClient = new RedisClient();
export default redisClient;
