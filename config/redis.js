import redis from "redis";

class RedisClient {
  constructor() {
    this.client = null;
  }

  async connect() {
    if (this.client && this.client.isOpen) {
      return this.client;
    }

    this.client = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    this.client.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    this.client.on("connect", () => {
      console.log("Connected to Redis successfully");
    });

    await this.client.connect();
    return this.client;
  }

  async disconnect() {
    if (this.client && this.client.isOpen) {
      await this.client.quit();
    }
  }

  getClient() {
    return this.client;
  }
}

export default new RedisClient();
