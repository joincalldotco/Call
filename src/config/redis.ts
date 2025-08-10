import Redis from "ioredis";
const isProduction = process.env.NODE_ENV === "production";
const useTLS = process.env.REDIS_USE_TLS === "true";
const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  tls: useTLS ? {} : undefined,
  maxRetriesPerRequest: 3,
});

redis.on("connect", () => {
  console.log("Connected to Redis");
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

export default redis;
