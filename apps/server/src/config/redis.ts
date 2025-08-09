import { env } from "@/config/env";
import { Redis } from "ioredis";

const redisClient = new Redis({
  port: env.REDIS_PORT,
  host: env.REDIS_HOST,
  username: env.REDIS_USERNAME,
  password: env.REDIS_PASSWORD,
});

redisClient.on("error", (err) => {
  console.error("Redis connection error:", err);
});

redisClient.on("connect", () => {
  console.log("Connected to Redis");
});

export default redisClient;
